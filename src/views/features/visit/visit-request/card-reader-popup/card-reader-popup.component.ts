import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LAYOUT_DIRECTION_ENUM } from '@/enums/layout-direction-enum';
import { LanguageService } from '@/services/shared/language.service';
import {
  CardReaderStatus,
  CardReadResult,
  DahuaCardReaderService,
} from '@/services/features/card-reader/dahua-card-reader.service';

@Component({
  selector: 'app-card-reader-popup',
  imports: [TranslatePipe],
  templateUrl: './card-reader-popup.component.html',
  styleUrl: './card-reader-popup.component.scss',
})
export class CardReaderPopupComponent implements OnInit, OnDestroy {
  readonly statuses = CardReaderStatus;
  readonly reader = inject(DahuaCardReaderService);
  private readonly dialogRef = inject(MatDialogRef<CardReaderPopupComponent>);
  private readonly languageService = inject(LanguageService);
  private readonly destroy$ = new Subject<void>();

  direction =
    this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH
      ? LAYOUT_DIRECTION_ENUM.LTR
      : LAYOUT_DIRECTION_ENUM.RTL;
  status: CardReaderStatus = this.reader.status$.value;
  result: CardReadResult | null = null;
  copied = false;
  busy = false;

  ngOnInit(): void {
    this.reader.status$.pipe(takeUntil(this.destroy$)).subscribe((status) => {
      this.status = status;
    });
    this.reader.cardRead$.pipe(takeUntil(this.destroy$)).subscribe((result) => {
      this.result = result;
      this.copied = false;
    });
    void this.initialize();
  }

  /** First-time permission: opens the browser's device picker (needs this click). */
  async connectReader(): Promise<void> {
    this.result = null;
    await this.run(async () => {
      if (await this.reader.requestReader()) await this.reader.startReading();
    });
  }

  async retry(): Promise<void> {
    this.result = null;
    await this.run(async () => {
      if (await this.reader.connectToPermittedReader()) await this.reader.startReading();
    });
  }

  async readCard(): Promise<void> {
    this.result = null;
    this.copied = false;
    await this.run(() => this.reader.startReading());
  }

  cancelReading(): void {
    this.reader.stopReading();
  }

  async copyCardNumber(): Promise<void> {
    if (!this.result) return;
    try {
      await navigator.clipboard.writeText(this.result.cardNumber);
      this.copied = true;
    } catch {
      this.copied = false;
    }
  }

  close(): void {
    this.dialogRef.close(this.result?.cardNumber ?? null);
  }

  ngOnDestroy(): void {
    this.reader.stopReading();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initialize(): Promise<void> {
    await this.run(async () => {
      await this.reader.initialize();
      // Opening the popup means "read a card": start right away when the reader is already permitted.
      if (this.reader.isAvailable && (await this.reader.connectToPermittedReader())) {
        await this.reader.startReading();
      }
    });
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await action();
    } finally {
      this.busy = false;
    }
  }
}
