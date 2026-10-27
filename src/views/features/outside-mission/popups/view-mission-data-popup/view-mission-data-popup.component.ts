import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LAYOUT_DIRECTION_ENUM } from '@/enums/layout-direction-enum';
import { WorkMission } from '@/models/features/business/work-mission';
import { getWorkMissionTypeName } from '@/models/features/business/work-mission-type-option';
import { AuthService } from '@/services/auth/auth.service';
import { WorkMissionService } from '@/services/features/business/work-mission.service';
import { AlertService } from '@/services/shared/alert.service';
import { LanguageService } from '@/services/shared/language.service';
import { downloadBlobData } from '@/utils/utils';
import { DialogRef } from '@angular/cdk/dialog';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize, Observable } from 'rxjs';
import { Attachment } from '@/models/shared/attachment/attachment';
import { AttachmentListComponent } from '@/views/shared/attachment-list/attachment-list.component';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { WorkMissionStatusEnum } from '@/enums/work-mission-status-enum';
import {
  workMissionStatusBadgeClass,
  workMissionStatusDotClass,
  workMissionStatusTextKey,
} from '@/utils/work-mission-status';
import {
  LeavesRejectPopupComponent,
  RejectPopupData,
} from '@/views/features/leaves/leaves-reject-popup/leaves-reject-popup.component';

@Component({
  selector: 'app-view-mission-data-popup',
  imports: [DatePipe, TranslatePipe, AttachmentListComponent],
  templateUrl: './view-mission-data-popup.component.html',
  styleUrl: './view-mission-data-popup.component.scss',
})
export class ViewMissionDataPopupComponent {
  dialogRef = inject(DialogRef);
  languageService = inject(LanguageService);
  translateService = inject(TranslateService);
  alertService = inject(AlertService);
  authService = inject(AuthService);
  service = inject(WorkMissionService);
  private matDialog = inject(MatDialog);
  private matDialogRef = inject(MatDialogRef<ViewMissionDataPopupComponent>);
  model!: WorkMission;
  declare direction: LAYOUT_DIRECTION_ENUM;
  showDownloadPdf: boolean = false;
  isDownloadingPdf = false;
  isDeciding = false;

  readonly workMissionStatus = WorkMissionStatusEnum;
  readonly statusTextKey = workMissionStatusTextKey;
  readonly statusBadgeClass = workMissionStatusBadgeClass;
  readonly statusDotClass = workMissionStatusDotClass;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { model: WorkMission }) {
    this.model = data.model;
    // Downloading the mission as a file is offered to the same audience that manages
    // missions (department managers and HR officers), like permission downloads.
    this.showDownloadPdf = !!(this.authService.isDepartmentManager || this.authService.isHROfficer);
    this.direction =
      this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
        ? LAYOUT_DIRECTION_ENUM.LTR
        : LAYOUT_DIRECTION_ENUM.RTL;
  }

  isCurrentLanguageEnglish() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH;
  }
  getWorkMissionTypeName(model: WorkMission): string {
    return getWorkMissionTypeName(model.workMissionType, this.isCurrentLanguageEnglish());
  }

  downloadAsPDF(): void {
    if (this.isDownloadingPdf) return;

    this.isDownloadingPdf = true;
    this.service
      .exportMissionPdf(this.languageService.getCurrentLanguage(), { id: this.model.id })
      .pipe(finalize(() => (this.isDownloadingPdf = false)))
      .subscribe({
        next: (blob) => {
          if (!blob || blob.size === 0) {
            this.alertService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
            return;
          }

          downloadBlobData(blob, this.getMissionPdfFileName());
        },
        error: () => {
          this.alertService.showErrorMessage({ messages: ['COMMON.ERROR'] });
        },
      });
  }

  /** Bound as a value, so it has to stay an arrow to keep `this`. */
  downloadAttachment = (attachment: Attachment): Observable<Blob> =>
    this.service.downloadAttachment(this.model.id, attachment.id);

  private getMissionPdfFileName(): string {
    const title = this.translateService.instant('WORK_MISSIONS.MISSION_PDF_FILE_NAME');
    const missionName = this.isCurrentLanguageEnglish() ? this.model.nameEn : this.model.nameAr;
    return `${missionName ? `${title} - ${missionName}` : title}.pdf`;
  }

  /** Department names in the current language. */
  lookupName(item?: { nameAr?: string; nameEn?: string | null } | null): string {
    if (!item) return '';
    return (this.isCurrentLanguageEnglish() ? item.nameEn || item.nameAr : item.nameAr) ?? '';
  }

  approve(): void {
    if (this.isDeciding || !this.model.canTakeAction) return;

    this.isDeciding = true;
    this.service
      .approveMission(this.model.id)
      .pipe(finalize(() => (this.isDeciding = false)))
      .subscribe({
        next: () => {
          this.alertService.showSuccessMessage({ messages: ['WORK_MISSIONS.MISSION_APPROVED'] });
          this.matDialogRef.close(DIALOG_ENUM.OK);
        },
        error: (error: HttpErrorResponse) => this.handleDecisionError(error),
      });
  }

  reject(): void {
    if (this.isDeciding || !this.model.canTakeAction) return;

    const dialogConfig = new MatDialogConfig<RejectPopupData>();
    dialogConfig.width = '100%';
    dialogConfig.maxWidth = '600px';
    dialogConfig.data = {
      titleKey: 'WORK_MISSIONS.REJECT_MISSION',
      confirmKey: 'WORK_MISSIONS.REJECT',
    };

    this.matDialog
      .open(LeavesRejectPopupComponent, dialogConfig)
      .afterClosed()
      .subscribe((rejectionNotes?: string) => {
        if (!rejectionNotes) return;

        this.isDeciding = true;
        this.service
          .rejectMission(this.model.id, rejectionNotes)
          .pipe(finalize(() => (this.isDeciding = false)))
          .subscribe({
            next: () => {
              this.alertService.showSuccessMessage({
                messages: ['WORK_MISSIONS.MISSION_REJECTED'],
              });
              this.matDialogRef.close(DIALOG_ENUM.OK);
            },
            error: (error: HttpErrorResponse) => this.handleDecisionError(error),
          });
      });
  }

  /**
   * The error itself is shown by the global HTTP interceptor. When the mission changed under the
   * user (someone else decided it, or it was edited), close with OK so the list reloads and the
   * stale "take action" button goes away; other failures keep the popup open for a retry.
   */
  private handleDecisionError(error: HttpErrorResponse): void {
    const messageKey = error?.error?.error?.messageKey;
    const missionChanged =
      error?.status === 409 ||
      messageKey === 'WORK_MISSION_ALREADY_DECIDED' ||
      messageKey === 'WORK_MISSION_APPROVAL_NOT_ALLOWED';
    if (missionChanged) {
      this.matDialogRef.close(DIALOG_ENUM.OK);
    }
  }

  close() {
    this.dialogRef.close();
  }
}
