import { Component, inject } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import AttendanceReport from '@/models/features/attendance/attendance-report/attendance-report';
import { AttendanceReportFilter } from '@/models/features/attendance/attendance-report/attendance-report-filter';
import { AttendanceReportService } from '@/services/features/attendance-report.service';
import { LanguageService } from '@/services/shared/language.service';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { DepartmentService } from '@/services/features/lookups/department.service';
import {
  ATTENDANCE_STATUS_ENUM,
  ATTENDANCE_STATUS_CONFIG,
  ATTENDANCE_STATUS_OPTIONS,
} from '@/enums/attendance-status-enum';
import { SHIFT_TYPE_ENUM } from '@/enums/shift-type-enum';
import { formatDateTo12Hour } from '@/utils/general-helper';
import { UserService } from '@/services/features/user.service';
import { MatDialogConfig } from '@angular/material/dialog';
import { ReportDetailsModalComponent } from '../report-details-modal/report-details-modal.component';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { downloadBlobData } from '@/utils/utils';
import { getLocalizedName } from '@/utils/localized-name';
import { LocalizedNamePipe } from '@/pipes/localized-name.pipe';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';
@Component({
  selector: 'app-all-attendance-report-list',
  imports: [
    InputTextModule,
    TableModule,
    CommonModule,
    RouterModule,
    CommonModule,
    PaginatorModule,
    DatePickerModule,
    FormsModule,
    Select,
    MultiSelectModule,
    TranslatePipe,
    LocalizedNamePipe,
    WithNameFallbackPipe,
  ],
  providers: [DatePipe],

  templateUrl: './all-attendance-report-list.component.html',
  styleUrl: './all-attendance-report-list.component.scss',
})
export class AllAttendanceReportListComponent extends BaseListComponent<
  AttendanceReport,
  any, // No dialog for now, replace if needed
  AttendanceReportService,
  AttendanceReportFilter
> {
  override dialogSize = {
    width: '100%',
    maxWidth: '800px',
  };

  attendanceReportService = inject(AttendanceReportService);
  filterModel: AttendanceReportFilter = new AttendanceReportFilter();
  languageService = inject(LanguageService);
  datePipe = inject(DatePipe);
  departments: BaseLookupModel[] = [];
  departmentService = inject(DepartmentService);
  userService = inject(UserService);
  shiftType = SHIFT_TYPE_ENUM;
  attendanceStatuses = ATTENDANCE_STATUS_OPTIONS; // import from your enum file

  override get service() {
    return this.attendanceReportService;
  }

  override initListComponent(): void {
    // this.departmentService.getLookup().subscribe((res) => {
    //   this.departments = res;
    // });
    this.userService.getMyDepartmentsLookup().subscribe((res) => {
      this.departments = res;
    });
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'ATTENDANCE_REPORT_PAGE.TITLE' }];
  }

  override openDialog(model: AttendanceReport): void {
    // No dialog currently needed for Attendance Reports
  }

  protected override mapModelToExcelRow(model: AttendanceReport): { [key: string]: any } {
    return {
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.EMPLOYEE_NAME')]:
        getLocalizedName(model, this.languageService.getCurrentLanguage(), 'fullName'),
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.NATIONAL_ID')]: model.nationalId,
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.DEPARTMENT')]:
        getLocalizedName(model, this.languageService.getCurrentLanguage(), 'departmentName'),
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.DATE')]: this.formatDate(
        model.processingDate
      ),

      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.SHIFT_NAME')]: model.getShiftName(),
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.SHIFT_TYPE')]:
        model.shiftType === SHIFT_TYPE_ENUM.DEFAULT
          ? this.translateService.instant('ATTENDANCE_REPORT_PAGE.DEFAULT_SHIFT')
          : this.translateService.instant('ATTENDANCE_REPORT_PAGE.SPECIAL_SHIFT'),
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.LEAVE_NAME')]: model.getHolidayName(),
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.MISSION_NAME')]:
        model.getMissionName(),
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.MISSION_TYPE')]:
        model.getMissionTypeTranslationKey()
          ? this.translateService.instant(model.getMissionTypeTranslationKey())
          : '',
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.PERMISSIONS')]:
        this.getPermissionLabel(model)
          ? this.translateService.instant(this.getPermissionLabel(model))
          : '',
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.PRESENCE_INQUIRY')]:
        model.isPresenceInquirySucceed == null
          ? '' // show empty if null
          : model.isPresenceInquirySucceed
            ? this.translateService.instant('INQUIRIES_PAGE.CONFIRMED')
            : this.translateService.instant('INQUIRIES_PAGE.NOT_CONFIRMED'),
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.SHIFT_PRESENCE_INQUIRY')]:
        model.isShiftPresenceInquirySucceed == null
          ? '' // show empty if null
          : model.isShiftPresenceInquirySucceed
            ? this.translateService.instant('INQUIRIES_PAGE.CONFIRMED')
            : this.translateService.instant('INQUIRIES_PAGE.NOT_CONFIRMED'),

      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.CHECKIN_TIME')]: this.formatTime(
        model.getEffectiveAttendanceFingerPrint()
      ),
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.CHECKOUT_TIME')]: this.formatTime(
        model.getEffectiveLeaveFingerPrint()
      ),
      [this.translateService.instant('ATTENDANCE_REPORT_PAGE.STATUS')]: model.attendanceStatus
        ? this.translateService.instant(this.getStatusConfig(model.attendanceStatus).labelKey)
        : '',
    };
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    return this.datePipe.transform(new Date(date), 'dd-MM-yyyy') ?? '-';
  }
  formatTime(date: Date | null | undefined): string {
    if (!date) return '-';
    const locale = this.isCurrentLanguageEnglish() ? 'en-US' : 'ar-EG';
    return formatDateTo12Hour(date, locale);
  }
  override exportExcel(fileName: string = ''): void {
    if (!fileName) {
      fileName = this.getTranslatedFileName('ATTENDANCE_REPORT_PAGE.TITLE', 'xlsx');
    }

    this.attendanceReportService
      .exportExcel(this.langService.getCurrentLanguage(), this.getPdfExportFilterOptions())
      .subscribe({
        next: (blob) => {
          if (!blob || blob.size === 0) {
            this.alertsService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
            return;
          }
          downloadBlobData(blob, fileName);
        },
        error: () => {
          this.alertsService.showErrorMessage({ messages: ['COMMON.ERROR'] });
        },
      });
  }
  set dateFrom(value: Date | null) {
    this.filterModel.dateFrom = value;
    if (this.filterModel.dateTo && value && this.filterModel.dateTo < value) {
      this.filterModel.dateTo = null;
    }
  }

  get dateFrom(): Date | null | undefined {
    return this.filterModel.dateFrom;
  }

  getPropertyName() {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';
  }
  getStatusConfig(status: ATTENDANCE_STATUS_ENUM) {
    return (
      ATTENDANCE_STATUS_CONFIG[status] ?? ATTENDANCE_STATUS_CONFIG[ATTENDANCE_STATUS_ENUM.ABSENT]
    );
  }
  isCurrentLanguageEnglish() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH;
  }

  getPermissionLabel(attendance: any): string {
    if (attendance.attendancePermissionId && attendance.leavePermissionId) {
      return 'ATTENDANCE_REPORT_PAGE.PRESENCE_LEAVE';
    }
    if (attendance.leavePermissionId && !attendance.attendancePermissionId) {
      return 'ATTENDANCE_REPORT_PAGE.LEAVE';
    }
    if (attendance.attendancePermissionId && !attendance.leavePermissionId) {
      return 'ATTENDANCE_REPORT_PAGE.PRESENCE';
    }
    return '';
  }
  openDataDialog(model: AttendanceReport): void {
    let dialogConfig: MatDialogConfig = new MatDialogConfig();
    dialogConfig.width = this.dialogSize.width;
    dialogConfig.maxWidth = this.dialogSize.maxWidth;
    dialogConfig.data = { model, showEmployeeDetails: true };
    const dialogRef = this.matDialog.open(ReportDetailsModalComponent as any, dialogConfig);

    dialogRef.afterClosed().subscribe((result: DIALOG_ENUM) => {
      if (result && result == DIALOG_ENUM.OK) {
      }
    });
  }
}
