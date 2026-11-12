import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  buildCardNumberRequest,
  buildPrompt,
  DAHUA_CARD_READER_PRODUCT_ID,
  DAHUA_CARD_READER_PRODUCT_NAME,
  DAHUA_CARD_READER_USAGE_PAGE,
  DAHUA_CARD_READER_VENDOR_ID,
  DAHUA_CARD_TYPES,
  DahuaCardCommand,
  DahuaCardNumberResponse,
  DahuaFrameAssembler,
  parseCardNumberResponse,
  toReports,
} from './dahua-card-reader-protocol';

export enum CardReaderStatus {
  /** Browser has no WebHID (not Chrome/Edge). */
  UNSUPPORTED = 'UNSUPPORTED',
  /** Page is not a secure context (plain http on a non-localhost host); WebHID is disabled. */
  INSECURE_CONTEXT = 'INSECURE_CONTEXT',
  /** No permitted reader is plugged in (or permission was never granted on this browser). */
  NOT_CONNECTED = 'NOT_CONNECTED',
  CONNECTING = 'CONNECTING',
  /** Reader open and idle. */
  READY = 'READY',
  /** Reader open and polling for a card. */
  READING = 'READING',
  ERROR = 'ERROR',
}

export interface CardReadResult {
  cardNumber: string;
  cardType: number;
  readAt: Date;
}

/** How long to wait for the reply to one card-number request before moving on. */
const RESPONSE_TIMEOUT_MS = 1000;
/** Pause between full request cycles (types 0, 3, 4). */
const POLL_INTERVAL_MS = 150;
/** DSS `SendAckToReadCard` waits ~1.2 s after a read before sending the success prompt. */
const SUCCESS_PROMPT_DELAY_MS = 1200;

const HID_FILTER: HIDDeviceFilter = {
  vendorId: DAHUA_CARD_READER_VENDOR_ID,
  productId: DAHUA_CARD_READER_PRODUCT_ID,
  usagePage: DAHUA_CARD_READER_USAGE_PAGE,
};

/**
 * Talks to the Dahua USB card enrollment reader directly from the browser through WebHID,
 * using the same commands as Dahua DSS Client (see dahua-card-reader-protocol.ts). DSS does not
 * need to be installed or running.
 */
@Injectable({ providedIn: 'root' })
export class DahuaCardReaderService {
  readonly status$ = new BehaviorSubject<CardReaderStatus>(this.initialStatus());
  /** Last low-level error, for diagnostics. */
  readonly lastError$ = new BehaviorSubject<string | null>(null);
  /** Emits once per scanned card while reading. */
  readonly cardRead$ = new Subject<CardReadResult>();

  private device: HIDDevice | null = null;
  private readonly assembler = new DahuaFrameAssembler();
  private initialized = false;
  /** Caller wants a card; survives unplug/replug so reading resumes automatically. */
  private wantReading = false;
  private pollGeneration = 0;
  private previousCardNumber = '';
  private pendingReply: ((response: DahuaCardNumberResponse | null) => void) | null = null;
  private writeChain: Promise<void> = Promise.resolve();

  get isAvailable(): boolean {
    return this.status$.value !== CardReaderStatus.UNSUPPORTED &&
      this.status$.value !== CardReaderStatus.INSECURE_CONTEXT;
  }

  get isConnected(): boolean {
    return !!this.device?.opened;
  }

  /** Registers hot-plug listeners and opens an already-permitted reader if one is plugged in. */
  async initialize(): Promise<void> {
    const hid = this.hid();
    if (!hid || this.initialized) return;
    this.initialized = true;
    hid.addEventListener('connect', (event) => void this.onConnect(event.device));
    hid.addEventListener('disconnect', (event) => this.onDisconnect(event.device));
    await this.connectToPermittedReader();
  }

  /**
   * Shows the browser's device picker (must be called from a click handler). Only needed the first
   * time on each browser profile; afterwards the reader is reconnected automatically.
   */
  async requestReader(): Promise<boolean> {
    const hid = this.hid();
    if (!hid) return false;
    try {
      const devices = await hid.requestDevice({ filters: [HID_FILTER] });
      const reader = devices.find((d) => this.isReader(d));
      if (!reader) return false;
      return await this.open(reader);
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  /** Re-checks permitted devices, e.g. for a "retry" action. */
  async connectToPermittedReader(): Promise<boolean> {
    const hid = this.hid();
    if (!hid) return false;
    if (this.device?.opened) return true;
    try {
      const reader = (await hid.getDevices()).find((d) => this.isReader(d));
      if (!reader) {
        this.setStatus(CardReaderStatus.NOT_CONNECTED);
        return false;
      }
      return await this.open(reader);
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  /** Starts waiting for one card. Beeps the reader the way DSS does when enrollment starts. */
  async startReading(): Promise<void> {
    this.wantReading = true;
    this.previousCardNumber = '';
    if (!this.device?.opened && !(await this.connectToPermittedReader())) return;
    await this.send(buildPrompt(true));
    this.runPollLoop();
  }

  stopReading(): void {
    this.wantReading = false;
    this.pollGeneration++;
    this.resolveReply(null);
    if (this.device?.opened) this.setStatus(CardReaderStatus.READY);
  }

  private async open(device: HIDDevice): Promise<boolean> {
    if (this.device === device && device.opened) return true;
    this.setStatus(CardReaderStatus.CONNECTING);
    try {
      if (!device.opened) await device.open();
    } catch (error) {
      this.fail(error);
      return false;
    }
    if (this.device && this.device !== device) this.detach();
    this.device = device;
    this.assembler.reset();
    device.addEventListener('inputreport', this.onInputReport);
    this.lastError$.next(null);
    this.setStatus(CardReaderStatus.READY);
    if (this.wantReading) this.runPollLoop();
    return true;
  }

  private async onConnect(device: HIDDevice): Promise<void> {
    if (!this.isReader(device) || this.device?.opened) return;
    await this.open(device);
  }

  private onDisconnect(device: HIDDevice): void {
    if (device !== this.device) return;
    this.detach();
    this.setStatus(CardReaderStatus.NOT_CONNECTED);
  }

  private detach(): void {
    this.device?.removeEventListener('inputreport', this.onInputReport);
    this.device = null;
    this.pollGeneration++;
    this.resolveReply(null);
    this.assembler.reset();
    this.writeChain = Promise.resolve();
  }

  private readonly onInputReport = (event: HIDInputReportEvent): void => {
    const report = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
    const frame = this.assembler.push(report);
    if (frame?.command !== DahuaCardCommand.CARD_NUMBER_RESPONSE) return;
    const response = parseCardNumberResponse(frame);
    this.resolveReply(response);
    // A card reply can arrive after its request timed out; accept it whenever we are reading.
    if (this.wantReading && response?.cardNumber && response.cardNumber !== this.previousCardNumber) {
      this.previousCardNumber = response.cardNumber;
      this.onCardRead(response);
    }
  };

  /** Mirrors DSS `ReadIDICCardNo`: request each card type in turn until a new card number appears. */
  private async runPollLoop(): Promise<void> {
    const generation = ++this.pollGeneration;
    const active = () => generation === this.pollGeneration && this.wantReading && !!this.device?.opened;
    if (!active()) return;
    this.setStatus(CardReaderStatus.READING);

    while (active()) {
      for (const cardType of DAHUA_CARD_TYPES) {
        if (!active()) return;
        const reply = this.waitForReply();
        if (!(await this.send(buildCardNumberRequest(cardType)))) {
          this.resolveReply(null);
          return;
        }
        // Card replies are handled in onInputReport; here we only pace the requests.
        await reply;
      }
      await this.delay(POLL_INTERVAL_MS);
    }
  }

  private onCardRead(response: DahuaCardNumberResponse): void {
    this.wantReading = false;
    this.pollGeneration++;
    this.setStatus(CardReaderStatus.READY);
    this.cardRead$.next({
      cardNumber: response.cardNumber,
      cardType: response.cardType,
      readAt: new Date(),
    });
    // DSS SendAckToReadCard(true, true): success prompt after a short pause.
    setTimeout(() => {
      if (this.device?.opened) void this.send(buildPrompt(true));
    }, SUCCESS_PROMPT_DELAY_MS);
  }

  private waitForReply(): Promise<DahuaCardNumberResponse | null> {
    this.resolveReply(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => this.resolveReply(null), RESPONSE_TIMEOUT_MS);
      this.pendingReply = (response) => {
        clearTimeout(timer);
        resolve(response);
      };
    });
  }

  private resolveReply(response: DahuaCardNumberResponse | null): void {
    const pending = this.pendingReply;
    this.pendingReply = null;
    pending?.(response);
  }

  /** Writes one frame as consecutive output reports; writes are serialized. */
  private send(frame: Uint8Array): Promise<boolean> {
    const device = this.device;
    if (!device?.opened) return Promise.resolve(false);
    const write = this.writeChain.then(async () => {
      for (const report of toReports(frame)) await device.sendReport(0, report);
    });
    this.writeChain = write.catch(() => undefined);
    return write.then(
      () => true,
      (error) => {
        if (this.device === device) {
          const unplugged = !device.opened;
          this.detach();
          this.lastError$.next(String(error));
          // Unplugged: wait for the connect event. Still present: let the user retry.
          this.setStatus(unplugged ? CardReaderStatus.NOT_CONNECTED : CardReaderStatus.ERROR);
        }
        return false;
      },
    );
  }

  private isReader(device: HIDDevice): boolean {
    if (device.vendorId !== DAHUA_CARD_READER_VENDOR_ID) return false;
    if (device.productId !== DAHUA_CARD_READER_PRODUCT_ID) return false;
    const name = (device.productName || '').toLowerCase();
    return !name || name.includes(DAHUA_CARD_READER_PRODUCT_NAME);
  }

  private hid(): HID | null {
    return this.isAvailable && typeof navigator !== 'undefined' ? (navigator.hid ?? null) : null;
  }

  private initialStatus(): CardReaderStatus {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return CardReaderStatus.UNSUPPORTED;
    }
    if (!window.isSecureContext) return CardReaderStatus.INSECURE_CONTEXT;
    if (!navigator.hid) return CardReaderStatus.UNSUPPORTED;
    return CardReaderStatus.NOT_CONNECTED;
  }

  private fail(error: unknown): void {
    // The user dismissing the picker is not an error.
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      this.setStatus(this.device?.opened ? CardReaderStatus.READY : CardReaderStatus.NOT_CONNECTED);
      return;
    }
    this.lastError$.next(String(error));
    this.setStatus(CardReaderStatus.ERROR);
  }

  private setStatus(status: CardReaderStatus): void {
    if (this.status$.value !== status) this.status$.next(status);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
