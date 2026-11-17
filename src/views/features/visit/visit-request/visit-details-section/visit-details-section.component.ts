import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { VISIT_ATTENDANCE_STATUS_OPTIONS } from '@/enums/visit-attendance-status-enum';
import { VisitStatusEnum } from '@/enums/visit-status-enum';
import { Visit } from '@/models/features/visit/visit';
import { LocalizedNamePipe } from '@/pipes/localized-name.pipe';
import { LanguageService } from '@/services/shared/language.service';
import { formatDateOnly, formatTimeTo12Hour } from '@/utils/general-helper';
import { getLocalizedName } from '@/utils/localized-name';
import { Component, inject, Input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

/**
 * Read-only "visit data" block (visitor header with status, then the details grid), shared by the
 * view/take-action dialog and the link-card dialog.
 */
@Component({
  selector: 'app-visit-details-section',
  imports: [TranslatePipe, LocalizedNamePipe],
  templateUrl: './visit-details-section.component.html',
})
export class VisitDetailsSectionComponent {
  @Input({ required: true }) model!: Visit;
  /** Also show the computed attendance status badge (e.g. "visit finished"). */
  @Input() showAttendanceStatus = false;

  private languageService = inject(LanguageService);
  private translateService = inject(TranslateService);

  private get isEnglish(): boolean {
    return this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH;
  }

  formatTime(timeString: string | Date | null | undefined): string {
    if (!timeString) return '';
    return formatTimeTo12Hour(timeString.toString(), this.isEnglish ? 'en-US' : 'ar-EG');
  }

  formatDate(dateString: string | Date | null | undefined): string {
    if (!dateString) return '';
    return formatDateOnly(dateString);
  }

  getDepartmentName(): string {
    return getLocalizedName(this.model.targetDepartment, this.languageService.getCurrentLanguage());
  }

  getStatusText(): string {
    switch (this.model.visitStatus) {
      case VisitStatusEnum.NEW:
        return this.translateService.instant('VISIT_REQUEST_PAGE.NEW');
      case VisitStatusEnum.APPROVED:
        return this.translateService.instant('VISIT_REQUEST_PAGE.ACCEPTED');
      case VisitStatusEnum.REJECTED:
        return this.translateService.instant('VISIT_REQUEST_PAGE.REJECTED');
      default:
        return '';
    }
  }

  getStatusBadgeClass(): string {
    const base =
      'text-[14px] text-[#fff] min-h-[20px] inline-flex justify-center items-center gap-2 px-2 rounded-full font-medium';
    switch (this.model.visitStatus) {
      case VisitStatusEnum.NEW:
        return `${base} bg-[#1570ef]`;
      case VisitStatusEnum.APPROVED:
        return `${base} bg-[#17b26a]`;
      case VisitStatusEnum.REJECTED:
        return `${base} bg-[#d92d20]`;
      default:
        return `${base} bg-gray-500`;
    }
  }

  private get attendanceOption() {
    return VISIT_ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === this.model.attendanceStatus);
  }

  getAttendanceBadgeClass(): string {
    return (
      this.attendanceOption?.badgeClass ??
      'text-[14px] text-gray-600 px-2 py-1 rounded-full bg-gray-100 font-medium'
    );
  }

  getAttendanceBadgeDotClass(): string {
    return this.attendanceOption?.dotClass ?? 'w-[10px] h-[10px] bg-gray-600 rounded-full';
  }

  getAttendanceStatusText(): string {
    const option = this.attendanceOption;
    return option ? this.translateService.instant(option.translationKey) : '';
  }
}
