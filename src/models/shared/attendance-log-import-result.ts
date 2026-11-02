import { ImportExcelResponse } from '@/models/shared/import-excel-response';

/**
 * Response of `POST /ImportSheet/attendance-logs-excel` (feature attendance-log-excel-import).
 * `errorLogFile` (inherited) is a base64 review workbook listing every failed and skipped row;
 * `rowErrors` holds at most 200 of those rows (`rowErrorsTruncated` tells when there are more).
 */
export class AttendanceLogImportResult extends ImportExcelResponse {
  skippedCount = 0;
  isFullySuccessful = false;
  rowErrors: ImportRowError[] = [];
  rowErrorsTruncated = false;
}

export type ImportRowStatus = 'Failed' | 'Skipped';

export interface ImportRowError {
  /** 1-based worksheet row number as shown in Excel. */
  rowNumber: number;
  nationalId: string | null;
  status: ImportRowStatus;
  errors: ImportRowMessage[];
}

export interface ImportRowMessage {
  /** Backend message key; its text lives under `COMMON.<messageKey>` in the i18n files. */
  messageKey: string;
  details: Record<string, string>;
}
