import { BaseAppComponent } from '@/views/app/base-app/base-app.component';
import { Component, inject, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule, DatePipe } from '@angular/common';
import AttendanceReport from '@/models/features/attendance/attendance-report/attendance-report';
import { LanguageService } from '@/services/shared/language.service';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { ATTENDANCE_STATUS_CONFIG, ATTENDANCE_STATUS_ENUM } from '@/enums/attendance-status-enum';
import { formatDateTo12Hour } from '@/utils/general-helper';
import { getLocalizedName } from '@/utils/localized-name';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { WorkShiftType } from '@/enums/work-shift-type';

export interface ReportDetailsDialogData {
  model: AttendanceReport;
  showEmployeeDetails: boolean;
}

@Component({
  selector: 'app-report-details-modal',
  imports: [TranslateModule, CommonModule],
  providers: [DatePipe],
  templateUrl: './report-details-modal.component.html',
  styleUrl: './report-details-modal.component.scss',
})
export class ReportDetailsModalComponent extends BaseAppComponent implements OnInit {
  model!: AttendanceReport;
  showEmployeeDetails: boolean = false;

  private langSvc = inject(LanguageService);
  private datePipe = inject(DatePipe);
  private dialogRef = inject(MatDialogRef<ReportDetailsModalComponent>);

  constructor(@Inject(MAT_DIALOG_DATA) public data: ReportDetailsDialogData) {
    super();
    this.model = data?.model;
    this.showEmployeeDetails = data?.showEmployeeDetails ?? false;
  }

  // ─── Computed getters ──────────────────────────────────────────────────────

  get employeeName(): string {
    return getLocalizedName(this.model, this.langSvc.getCurrentLanguage(), 'fullName');
  }

  get departmentName(): string {
    return getLocalizedName(this.model, this.langSvc.getCurrentLanguage(), 'departmentName') || '-';
  }

  get hasPermission(): boolean {
    return !!(this.model.attendancePermissionId || this.model.leavePermissionId);
  }

  get hasHolidayOrMission(): boolean {
    return !!(this.model.holidayId || this.model.missionId);
  }

  get hasLeave(): boolean {
    return !!this.model.leaveId;
  }

  get hasInquiryData(): boolean {
    return (
      (this.model.isShiftPresenceInquirySucceed !== null &&
        this.model.isShiftPresenceInquirySucceed !== undefined) ||
      (this.model.isPresenceInquirySucceed !== null &&
        this.model.isPresenceInquirySucceed !== undefined)
    );
  }

  // ─── Formatting helpers ────────────────────────────────────────────────────

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    return this.datePipe.transform(new Date(date), 'dd-MM-yyyy') ?? '-';
  }

  formatTime(date: Date | null | undefined): string {
    if (!date) return '-';
    const locale = this.langSvc.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH ? 'en-US' : 'ar-EG';
    return formatDateTo12Hour(date, locale);
  }

  getStatusConfig(status: number) {
    return (
      ATTENDANCE_STATUS_CONFIG[status as ATTENDANCE_STATUS_ENUM] ??
      ATTENDANCE_STATUS_CONFIG[ATTENDANCE_STATUS_ENUM.ABSENT]
    );
  }

  getShiftTypeTranslationKey(): string {
    switch (this.model.shiftType) {
      case WorkShiftType.Standard:
        return 'USER_WORK_SHIFT_ASSIGNMENT.STANDARD_SHIFT';
      case WorkShiftType.WeekOnWeekOff:
        return 'USER_WORK_SHIFT_ASSIGNMENT.WORK_WEEK_REST_WEEK';
      case WorkShiftType.WeekOnWeekOff24:
        return 'USER_WORK_SHIFT_ASSIGNMENT.SHIFT_24_HOURS';
      case WorkShiftType.Rotating:
        return 'USER_WORK_SHIFT_ASSIGNMENT.ROTATING_SHIFT';
      default:
        return '';
    }
  }

  getPermissionLabel(): string {
    if (this.model.attendancePermissionId && this.model.leavePermissionId) {
      return 'ATTENDANCE_REPORT_PAGE.PRESENCE_LEAVE';
    }
    if (this.model.leavePermissionId && !this.model.attendancePermissionId) {
      return 'ATTENDANCE_REPORT_PAGE.LEAVE';
    }
    if (this.model.attendancePermissionId && !this.model.leavePermissionId) {
      return 'ATTENDANCE_REPORT_PAGE.PRESENCE';
    }
    return '';
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  close(): void {
    this.dialogRef.close(DIALOG_ENUM.CANCEL);
  }
}
