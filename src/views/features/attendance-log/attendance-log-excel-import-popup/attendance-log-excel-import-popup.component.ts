import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { filter, finalize, switchMap, tap } from 'rxjs';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LAYOUT_DIRECTION_ENUM } from '@/enums/layout-direction-enum';
import {
  AttendanceLogImportResult,
  ImportRowMessage,
} from '@/models/shared/attendance-log-import-result';
import { AlertService } from '@/services/shared/alert.service';
import { ImportService } from '@/services/shared/import.service';
import { LanguageService } from '@/services/shared/language.service';
import { ExcelHelper } from '@/utils/excel-helper';
import { buildTranslationParams } from '@/utils/general-helper';

/**
 * Bulk import of fingerprint (attendance swipe) records from an .xlsx sheet, matched by National ID
 * (feature attendance-log-excel-import). Follows the employee import modal: static template download,
 * client-side header/size/data-row checks, then the server validates every row and returns a review file.
 */
@Component({
  selector: 'app-attendance-log-excel-import-popup',
  imports: [TranslatePipe, TableModule],
  templateUrl: './attendance-log-excel-import-popup.component.html',
  styleUrl: './attendance-log-excel-import-popup.component.scss',
})
export class AttendanceLogExcelImportPopupComponent implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  private readonly importService = inject(ImportService);
  private readonly alertService = inject(AlertService);
  private readonly languageService = inject(LanguageService);
  private readonly translateService = inject(TranslateService);
  private readonly dialogRef = inject(MatDialogRef<AttendanceLogExcelImportPopupComponent>);

  readonly maxFileSizeInMB = 5;
  /** One template for both languages; required headers are green, optional ones gray. */
  readonly templatePath = 'assets/import-templates/import-fingerprints-template.xlsx';
  /** Must match the template and the backend `AttendanceLogImportColumns`. */
  readonly importSheetRequiredHeaders = [
    'NationalId',
    'Date (yyyy-mm-dd)',
    'Time (HH:mm, 24-hour)',
  ];

  direction = LAYOUT_DIRECTION_ENUM.LTR;
  selectedFile = signal<File | undefined>(undefined);
  isImporting = signal(false);
  result = signal<AttendanceLogImportResult | undefined>(undefined);

  /** True once any row was saved, so the list reloads when the popup closes. */
  private hasImportedRows = false;

  ngOnInit(): void {
    this.direction =
      this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
        ? LAYOUT_DIRECTION_ENUM.LTR
        : LAYOUT_DIRECTION_ENUM.RTL;

    // Route backdrop/Escape through onCancel() so the list reloads after a partial import,
    // and keep the popup open while an import request is in flight.
    this.dialogRef.disableClose = true;
    this.dialogRef.backdropClick().subscribe(() => this.onCancel());
    this.dialogRef
      .keydownEvents()
      .pipe(filter((event) => event.key === 'Escape'))
      .subscribe(() => this.onCancel());
  }

  get currentLanguage(): string {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ARABIC
      ? LANGUAGE_ENUM.ARABIC
      : LANGUAGE_ENUM.ENGLISH;
  }

  downloadTemplate(): void {
    const link = document.createElement('a');
    link.href = this.templatePath;
    link.download = 'fingerprints-template.xlsx';
    link.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.selectedFile.set(undefined);
    if (!file) return;

    if (!/\.xlsx$/i.test(file.name)) {
      this.rejectFile(input, this.translateService.instant('COMMON.IMPORT_INVALID_FILE_TYPE'));
      return;
    }

    ExcelHelper.validateImportExcelSheetHeaders(this.importSheetRequiredHeaders, file)
      .pipe(
        tap((headers) => {
          if (!headers.validHeaders) {
            const message = this.translateService
              .instant('COMMON.EXCEL_MISSING_FIELDS')
              .concat(` (${headers.missing.join(', ')})`);
            throw new FileRejection(message);
          }

          if (file.size > this.maxFileSizeInMB * 1024 * 1024) {
            throw new FileRejection(
              this.translateService
                .instant('COMMON.FILE_SIZE_CAN_NOT_EXCEED')
                .replace('{size}', String(this.maxFileSizeInMB))
            );
          }
        }),
        switchMap(() => ExcelHelper.validateHasDataRows(file)),
        tap((hasData) => {
          if (!hasData) {
            throw new FileRejection(this.translateService.instant('COMMON.EXCEL_NO_DATA_ROWS'));
          }
        })
      )
      .subscribe({
        next: () => {
          this.result.set(undefined);
          this.selectedFile.set(file);
        },
        error: (error: unknown) =>
          this.rejectFile(
            input,
            error instanceof FileRejection
              ? error.message
              : this.translateService.instant('COMMON.IMPORT_INVALID_FILE')
          ),
      });
  }

  onImport(): void {
    const file = this.selectedFile();
    if (!file || this.isImporting()) return;

    const formData = new FormData();
    formData.append('file', file);

    this.isImporting.set(true);
    this.importService
      .importAttendanceLogsExcel(formData, this.currentLanguage)
      .pipe(finalize(() => this.isImporting.set(false)))
      .subscribe({
        next: (response) => {
          const result = response.data;
          this.clearFileSelection();
          if (result.successCount > 0) this.hasImportedRows = true;

          if (result.failureCount === 0 && result.skippedCount === 0) {
            this.alertService.showSuccessMessage({
              messages: ['COMMON.DATA_HAS_BEEN_IMPORTED_SUCCESSFULLY'],
            });
            this.dialogRef.close(DIALOG_ENUM.OK);
            return;
          }

          this.result.set(result);
        },
        // File-level errors (missing columns, too many rows, ...) are shown by the global
        // error interceptor; keep the selected file so the user can pick another one.
      });
  }

  translateMessage(message: ImportRowMessage): string {
    return this.translateService.instant(
      'COMMON.' + message.messageKey,
      buildTranslationParams(message.details ?? {}, this.translateService)
    );
  }

  downloadReviewFile(): void {
    const errorLogFile = this.result()?.errorLogFile;
    if (errorLogFile) {
      ExcelHelper.downloadExcelFromBase64(errorLogFile, 'fingerprints-import-review');
    }
  }

  getMaxAllowedFileSizeMessage(): string {
    return this.translateService.instant('IMPORT.ATTENDANCE_LOG_EXCEL.MAX_FILE_SIZE', {
      size: this.maxFileSizeInMB,
    });
  }

  onCancel(): void {
    if (this.isImporting()) return;
    this.dialogRef.close(this.hasImportedRows ? DIALOG_ENUM.OK : DIALOG_ENUM.CANCEL);
  }

  private rejectFile(input: HTMLInputElement, message: string): void {
    input.value = '';
    this.selectedFile.set(undefined);
    this.alertService.showErrorMessage({ messages: [message] });
  }

  private clearFileSelection(): void {
    this.selectedFile.set(undefined);
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }
}

/** A client-side pre-check failure whose message is already translated. */
class FileRejection extends Error {}
