/**
 * Dahua USB card enrollment reader ("DaHua-Tech-HID", USB VID 0xC251 / PID 0x1F01) wire protocol.
 *
 * Nothing here is invented: every constant and rule mirrors what Dahua's own DSS Client module
 * `CardReader.dll` (class `CardReader::CardIssuer`) sends and accepts, and was checked against the
 * physical reader. The reader is a vendor-defined HID device (usage page 0xFF00) with 8-byte input and
 * output reports and no report IDs; it does not type keystrokes.
 *
 * Frame (`CreateCardMsg` / `DecodeCardMsg`):
 *   0x48 0x01 LEN_HI LEN_LO CMD DATA... SUM
 *   LEN = total frame length in bytes, SUM = 8-bit sum of every preceding byte (`ChkAdd`).
 * A frame is sent/received in 8-byte chunks, one HID report each (`WriteDateToHID`, `CardMsgDeal`).
 */

export const DAHUA_CARD_READER_VENDOR_ID = 0xc251;
export const DAHUA_CARD_READER_PRODUCT_ID = 0x1f01;
export const DAHUA_CARD_READER_USAGE_PAGE = 0xff00;
/** DSS only accepts HID devices whose product string contains this (case-insensitive). */
export const DAHUA_CARD_READER_PRODUCT_NAME = 'dahua-tech-hid';

/** HID report payload size (report ID 0 is not part of the payload). */
export const REPORT_SIZE = 8;

const FRAME_HEAD = 0x48;
const FRAME_HEAD_2 = 0x01;
const MIN_FRAME_LENGTH = 6;
/** `CardMsgDeal` drops its receive buffer once it grows past 0x200 bytes. */
const MAX_BUFFER_LENGTH = 0x200;

export enum DahuaCardCommand {
  /** `CardNoReq`: ask for the card currently on the reader. One data byte = card type. */
  CARD_NUMBER_REQUEST = 0x01,
  /** Reply to CARD_NUMBER_REQUEST. */
  CARD_NUMBER_RESPONSE = 0x81,
  /** `CardToosStateCtl`: prompt control. DSS sends 1 for "start read" and after a successful read. */
  PROMPT = 0x89,
}

/** Card-type values DSS cycles through in `ReadIDICCardNo`, in this order. */
export const DAHUA_CARD_TYPES = [0x00, 0x03, 0x04] as const;
/** `CardMsgDeal` ignores a card-number reply whose type byte is 3. */
const IGNORED_RESPONSE_TYPE = 0x03;
/** `CardMsgDeal` reads at most 4 card-number bytes. */
const MAX_CARD_BYTES = 4;

export interface DahuaFrame {
  command: number;
  data: Uint8Array;
}

export interface DahuaCardNumberResponse {
  cardType: number;
  /** Upper-case hex, two digits per byte, as DSS displays it; empty when no card is present. */
  cardNumber: string;
}

export function checksum(bytes: ArrayLike<number>, length = bytes.length): number {
  let sum = 0;
  for (let i = 0; i < length; i++) sum = (sum + bytes[i]) & 0xff;
  return sum;
}

export function buildFrame(command: number, data: ArrayLike<number> = []): Uint8Array {
  const length = data.length + MIN_FRAME_LENGTH;
  const frame = new Uint8Array(length);
  frame[0] = FRAME_HEAD;
  frame[1] = FRAME_HEAD_2;
  frame[2] = (length >> 8) & 0xff;
  frame[3] = length & 0xff;
  frame[4] = command;
  frame.set(Array.from(data), 5);
  frame[length - 1] = checksum(frame, length - 1);
  return frame;
}

export function buildCardNumberRequest(cardType: number): Uint8Array {
  return buildFrame(DahuaCardCommand.CARD_NUMBER_REQUEST, [cardType]);
}

export function buildPrompt(on: boolean): Uint8Array {
  return buildFrame(DahuaCardCommand.PROMPT, [on ? 1 : 0]);
}

/** Splits a frame into zero-padded 8-byte HID output report payloads. */
export function toReports(frame: Uint8Array): Uint8Array[] {
  const reports: Uint8Array[] = [];
  for (let offset = 0; offset < frame.length; offset += REPORT_SIZE) {
    const report = new Uint8Array(REPORT_SIZE);
    report.set(frame.subarray(offset, offset + REPORT_SIZE));
    reports.push(report);
  }
  return reports;
}

/** Reassembles frames from consecutive 8-byte input reports (`CardMsgDeal` + `DecodeCardMsg`). */
export class DahuaFrameAssembler {
  private buffer: number[] = [];

  /** Feeds one input report; returns the frame it completes, if any. */
  push(report: ArrayLike<number>): DahuaFrame | null {
    for (let i = 0; i < REPORT_SIZE; i++) this.buffer.push(i < report.length ? report[i] : 0);
    if (this.buffer.length > MAX_BUFFER_LENGTH) {
      this.reset();
      return null;
    }
    if (this.buffer[0] !== FRAME_HEAD) {
      this.reset();
      return null;
    }
    if (this.buffer.length < MIN_FRAME_LENGTH) return null;

    const length = (this.buffer[2] << 8) | this.buffer[3];
    if (length < MIN_FRAME_LENGTH) {
      this.reset();
      return null;
    }
    if (length > this.buffer.length) return null; // wait for the next report

    const frame = this.buffer.slice(0, length);
    this.reset();
    if (checksum(frame, length - 1) !== frame[length - 1]) return null;
    return { command: frame[4], data: Uint8Array.from(frame.slice(5, length - 1)) };
  }

  reset(): void {
    this.buffer = [];
  }
}

/**
 * Parses a CARD_NUMBER_RESPONSE: data = TYPE COUNT B0 B1 B2 B3.
 * Returns null for other commands and for replies DSS ignores.
 */
export function parseCardNumberResponse(frame: DahuaFrame): DahuaCardNumberResponse | null {
  if (frame.command !== DahuaCardCommand.CARD_NUMBER_RESPONSE || frame.data.length < 2) return null;
  const cardType = frame.data[0];
  if (cardType === IGNORED_RESPONSE_TYPE) return null;

  const count = Math.min(frame.data[1], MAX_CARD_BYTES, frame.data.length - 2);
  let cardNumber = '';
  for (let i = 0; i < count; i++) {
    cardNumber += frame.data[2 + i].toString(16).padStart(2, '0');
  }
  return { cardType, cardNumber: cardNumber.toUpperCase() };
}
