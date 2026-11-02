import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NEVER, of, Subject } from 'rxjs';
import * as XLSX from 'xlsx';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { AttendanceLogImportResult } from '@/models/shared/attendance-log-import-result';
import { SingleResponseData } from '@/models/shared/response/single-response-data';
import { AlertService } from '@/services/shared/alert.service';
import { ImportService } from '@/services/shared/import.service';
import { LanguageService } from '@/services/shared/language.service';
import { AttendanceLogExcelImportPopupComponent } from './attendance-log-excel-import-popup.component';

describe('AttendanceLogExcelImportPopupComponent', () => {
  const templateHeaders = [
    'NationalId',
    'Date (yyyy-mm-dd)',
    'Time (HH:mm, 24-hour)',
    'EmployeeName',
  ];

  let fixture: ComponentFixture<AttendanceLogExcelImportPopupComponent>;
  let component: AttendanceLogExcelImportPopupComponent;
  let importService: jasmine.SpyObj<ImportService>;
  let alertService: jasmine.SpyObj<AlertService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AttendanceLogExcelImportPopupComponent>>;
  let language: LANGUAGE_ENUM;

  const xlsxFile = new File(['x'], 'fingerprints.xlsx');

  function workbookFile(rows: unknown[][], name = 'fingerprints.xlsx'): File {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Fingerprints');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    return new File([bytes], name);
  }

  function buildResult(overrides: Partial<AttendanceLogImportResult>): AttendanceLogImportResult {
    return Object.assign(new AttendanceLogImportResult(), {
      totalRows: 3,
      successCount: 3,
      skippedCount: 0,
      failureCount: 0,
      hasErrors: false,
      rowErrors: [],
      ...overrides,
    });
  }

  function respond(result: AttendanceLogImportResult) {
    return of({ data: result } as SingleResponseData<AttendanceLogImportResult>);
  }

  function selectFile(file: File): void {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    component.onFileSelected({ target: input } as unknown as Event);
  }

  /** FileReader is asynchronous; wait until the pre-checks have settled. */
  async function settled(condition: () => boolean): Promise<void> {
    for (let attempt = 0; attempt < 100 && !condition(); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  const fileAccepted = () => component.selectedFile() !== undefined;
  const errorShown = () => alertService.showErrorMessage.calls.count() > 0;

  beforeEach(async () => {
    language = LANGUAGE_ENUM.ENGLISH;
    importService = jasmine.createSpyObj<ImportService>('ImportService', [
      'importAttendanceLogsExcel',
    ]);
    alertService = jasmine.createSpyObj<AlertService>('AlertService', [
      'showErrorMessage',
      'showSuccessMessage',
    ]);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close', 'backdropClick', 'keydownEvents']);
    dialogRef.backdropClick.and.returnValue(new Subject<MouseEvent>());
    dialogRef.keydownEvents.and.returnValue(new Subject<KeyboardEvent>());

    await TestBed.configureTestingModule({
      imports: [AttendanceLogExcelImportPopupComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ImportService, useValue: importService },
        { provide: AlertService, useValue: alertService },
        { provide: LanguageService, useValue: { getCurrentLanguage: () => language } },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceLogExcelImportPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('requires exactly the template headers that are green (required) in the template', () => {
    expect(component.importSheetRequiredHeaders).toEqual(templateHeaders.slice(0, 3));
    expect(component.templatePath).toBe(
      'assets/import-templates/import-fingerprints-template.xlsx'
    );
  });

  it('ships a template whose headers pass the header check', async () => {
    const response = await fetch(component.templatePath);
    expect(response.ok).toBeTrue();
    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const [headers] = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], {
      header: 1,
    });

    expect(headers).toEqual(templateHeaders);
  });

  it('accepts a filled template', async () => {
    selectFile(workbookFile([templateHeaders, ['1012345678', '2026-01-31', '08:30', '']]));
    await settled(() => fileAccepted() || errorShown());

    expect(component.selectedFile()?.name).toBe('fingerprints.xlsx');
    expect(alertService.showErrorMessage).not.toHaveBeenCalled();
  });

  it('rejects files that are not .xlsx before reading them', () => {
    selectFile(new File(['x'], 'fingerprints.xls'));

    expect(component.selectedFile()).toBeUndefined();
    expect(alertService.showErrorMessage).toHaveBeenCalled();
  });

  it('rejects a sheet missing a required column and names it', async () => {
    selectFile(
      workbookFile([
        ['NationalId', 'Date (yyyy-mm-dd)'],
        ['1012345678', '2026-01-31'],
      ])
    );
    await settled(errorShown);

    const [{ messages }] = alertService.showErrorMessage.calls.mostRecent().args;
    expect(messages?.[0]).toContain('Time (HH:mm, 24-hour)');
    expect(component.selectedFile()).toBeUndefined();
  });

  it('rejects a template without data rows', async () => {
    selectFile(workbookFile([templateHeaders]));
    await settled(errorShown);

    expect(alertService.showErrorMessage).toHaveBeenCalled();
    expect(component.selectedFile()).toBeUndefined();
  });

  it('rejects files larger than 5 MB', async () => {
    const bigFile = workbookFile([templateHeaders, ['1012345678', '2026-01-31', '08:30']]);
    Object.defineProperty(bigFile, 'size', { value: 5 * 1024 * 1024 + 1 });

    selectFile(bigFile);
    await settled(errorShown);

    expect(alertService.showErrorMessage).toHaveBeenCalled();
    expect(component.selectedFile()).toBeUndefined();
  });

  it('sends the file with the current language and closes with OK when every row was imported', () => {
    language = LANGUAGE_ENUM.ARABIC;
    component.selectedFile.set(xlsxFile);
    importService.importAttendanceLogsExcel.and.returnValue(respond(buildResult({})));

    component.onImport();

    const [formData, lang] = importService.importAttendanceLogsExcel.calls.mostRecent().args;
    expect((formData.get('file') as File).name).toBe('fingerprints.xlsx');
    expect(lang).toBe('ar');
    expect(alertService.showSuccessMessage).toHaveBeenCalledWith({
      messages: ['COMMON.DATA_HAS_BEEN_IMPORTED_SUCCESSFULLY'],
    });
    expect(dialogRef.close).toHaveBeenCalledWith(DIALOG_ENUM.OK);
  });

  it('keeps the popup open with row errors after a partial import and reloads the list on close', () => {
    component.selectedFile.set(xlsxFile);
    const result = buildResult({
      successCount: 1,
      failureCount: 1,
      skippedCount: 1,
      hasErrors: true,
      errorLogFile: 'UEs=',
      rowErrors: [
        {
          rowNumber: 3,
          nationalId: '123',
          status: 'Failed',
          errors: [{ messageKey: 'IMPORT_NATIONAL_ID_INVALID', details: {} }],
        },
        {
          rowNumber: 4,
          nationalId: '1012345678',
          status: 'Skipped',
          errors: [{ messageKey: 'IMPORT_ALREADY_EXISTS', details: {} }],
        },
      ],
    });
    importService.importAttendanceLogsExcel.and.returnValue(respond(result));

    component.onImport();
    fixture.detectChanges();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.result()).toBe(result);
    expect(component.selectedFile()).toBeUndefined();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('tbody tr').length).toBe(2);
    expect(element.textContent).toContain('IMPORT.DOWNLOAD_THE_REVIEW_FILE');

    component.onCancel();
    expect(dialogRef.close).toHaveBeenCalledWith(DIALOG_ENUM.OK);
  });

  it('closes with CANCEL when nothing was imported', () => {
    component.selectedFile.set(xlsxFile);
    importService.importAttendanceLogsExcel.and.returnValue(
      respond(buildResult({ successCount: 0, failureCount: 3, hasErrors: true }))
    );

    component.onImport();
    component.onCancel();

    expect(dialogRef.close).toHaveBeenCalledWith(DIALOG_ENUM.CANCEL);
  });

  it('ignores repeated submissions and closing while an import is in flight', () => {
    component.selectedFile.set(xlsxFile);
    importService.importAttendanceLogsExcel.and.returnValue(NEVER);

    component.onImport();
    component.onImport();
    component.onCancel();

    expect(importService.importAttendanceLogsExcel).toHaveBeenCalledTimes(1);
    expect(component.isImporting()).toBeTrue();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('translates row messages under COMMON with their details', () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      COMMON: { IMPORT_DUPLICATE_IN_FILE: 'Repeated (first in row {{row}})' },
    });
    translate.use('en');

    const message = component.translateMessage({
      messageKey: 'IMPORT_DUPLICATE_IN_FILE',
      details: { row: '2' },
    });

    expect(message).toBe('Repeated (first in row 2)');
  });
});
