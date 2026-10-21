import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize, Observable } from 'rxjs';
import { Leave } from '@/models/features/lookups/leave/leave';
import { AuthService } from '@/services/auth/auth.service';
import { LeaveService } from '@/services/features/lookups/leave.service';
import { AlertService } from '@/services/shared/alert.service';
import { LanguageService } from '@/services/shared/language.service';
import { downloadBlobData } from '@/utils/utils';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LAYOUT_DIRECTION_ENUM } from '@/enums/layout-direction-enum';
import { LEAVE_STATUS_ENUM } from '@/enums/leave-status-enum';
import { Attachment } from '@/models/shared/attachment/attachment';
import { AttachmentListComponent } from '@/views/shared/attachment-list/attachment-list.component';
import { leaveStatusTextKey } from '@/utils/leave-status';

@Component({
  selector: 'app-leaves-view-popup',
  imports: [CommonModule, TranslatePipe, AttachmentListComponent],
  templateUrl: './leaves-view-popup.component.html',
  styleUrl: './leaves-view-popup.component.scss',
})
export class LeavesViewPopupComponent {
  private dialogRef = inject(MatDialogRef<LeavesViewPopupComponent>);
  private languageService = inject(LanguageService);
  private translateService = inject(TranslateService);
  private alertService = inject(AlertService);
  private authService = inject(AuthService);
  private service = inject(LeaveService);

  model: Leave;
  direction: LAYOUT_DIRECTION_ENUM;
  leaveStatusEnum = LEAVE_STATUS_ENUM;
  showDownloadPdf: boolean = false;
  isDownloadingPdf = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.model = data?.model;
    // Downloading the leave as a file is limited to department managers viewing
    // accepted subordinate leaves; HR officers are not offered it.
    this.showDownloadPdf =
      !!this.data?.isSubordinateLeave &&
      !!this.authService.isDepartmentManager &&
      !!this.model?.isAccepted();
    this.direction =
      this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
        ? LAYOUT_DIRECTION_ENUM.LTR
        : LAYOUT_DIRECTION_ENUM.RTL;
  }

  close() {
    this.dialogRef.close();
  }

  downloadAsPDF(): void {
    if (this.isDownloadingPdf) return;

    this.isDownloadingPdf = true;
    this.service
      .exportLeavePdf(this.languageService.getCurrentLanguage(), { id: this.model.id })
      .pipe(finalize(() => (this.isDownloadingPdf = false)))
      .subscribe({
        next: (blob) => {
          if (!blob || blob.size === 0) {
            this.alertService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
            return;
          }

          downloadBlobData(blob, this.getLeavePdfFileName());
        },
        error: () => {
          this.alertService.showErrorMessage({ messages: ['COMMON.ERROR'] });
        },
      });
  }

  /** Bound as a value, so it has to stay an arrow to keep `this`. */
  downloadAttachment = (attachment: Attachment): Observable<Blob> =>
    this.service.downloadAttachment(this.model.id, attachment.id);

  private getLeavePdfFileName(): string {
    const title = this.translateService.instant('LEAVES_PAGE.LEAVE_PDF_FILE_NAME');
    const employeeName = this.employeeName();
    return `${employeeName ? `${title} - ${employeeName}` : title}.pdf`;
  }

  get statusBadgeClass(): string {
    switch (this.model?.status) {
      case LEAVE_STATUS_ENUM.New:
        return 'inline-flex items-center gap-2 px-4 py-0.5 rounded-full bg-[#1570ef] text-white text-base font-medium';
      case LEAVE_STATUS_ENUM.Accepted:
        return 'inline-flex items-center gap-2 px-4 py-0.5 rounded-full bg-[#067647] text-white text-base font-medium';
      case LEAVE_STATUS_ENUM.Rejected:
        return 'inline-flex items-center gap-2 px-4 py-0.5 rounded-full bg-[#d92d20] text-white text-base font-medium';
      default:
        return 'inline-flex items-center gap-2 px-4 py-0.5 rounded-full bg-gray-500 text-white text-base font-medium';
    }
  }

  get statusTextKey(): string {
    return this.model ? leaveStatusTextKey(this.model) : '';
  }

  employeeName(): string {
    const lang = this.languageService.getCurrentLanguage();
    return (
      (lang === LANGUAGE_ENUM.ARABIC
        ? this.model?.employee?.nameAr
        : (this.model?.employee?.nameEn ?? this.model?.employee?.nameAr)) ?? ''
    );
  }

  departmentName(): string {
    const lang = this.languageService.getCurrentLanguage();
    return (
      (lang === LANGUAGE_ENUM.ARABIC
        ? this.model?.employee?.department?.nameAr
        : (this.model?.employee?.department?.nameEn ?? this.model?.employee?.department?.nameAr)) ??
      ''
    );
  }

  leaveTypeName(): string {
    const lang = this.languageService.getCurrentLanguage();
    return (
      (lang === LANGUAGE_ENUM.ARABIC
        ? this.model?.leaveType?.nameAr
        : (this.model?.leaveType?.nameEn ?? this.model?.leaveType?.nameAr)) ?? ''
    );
  }
}
