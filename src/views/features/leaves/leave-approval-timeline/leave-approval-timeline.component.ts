import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Leave } from '@/models/features/lookups/leave/leave';
import { LeaveApprovalAction } from '@/models/features/lookups/leave/leave-approval-action';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { LanguageService } from '@/services/shared/language.service';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LEAVE_APPROVAL_STAGE_ENUM } from '@/enums/leave-approval-stage-enum';
import { LEAVE_SUBMISSION_TYPE_ENUM } from '@/enums/leave-submission-type-enum';

/**
 * The leave's approval history (who approved or rejected at which level) and, while it is in
 * progress, the level it currently waits at. Renders nothing for a leave with neither.
 */
@Component({
  selector: 'app-leave-approval-timeline',
  imports: [CommonModule, TranslatePipe],
  templateUrl: './leave-approval-timeline.component.html',
})
export class LeaveApprovalTimelineComponent {
  @Input({ required: true }) leave!: Leave;

  readonly hrStage = LEAVE_APPROVAL_STAGE_ENUM.Hr;

  private languageService = inject(LanguageService);

  get actions(): LeaveApprovalAction[] {
    return this.leave?.approvalActions ?? [];
  }

  get pendingStage(): LEAVE_APPROVAL_STAGE_ENUM | null {
    return this.leave?.isNew() ? (this.leave.approvalStage ?? null) : null;
  }

  get pendingDepartment(): BaseLookupModel | null | undefined {
    switch (this.pendingStage) {
      case LEAVE_APPROVAL_STAGE_ENUM.ManagerLevel1:
        return this.leave.level1ApprovalDepartment;
      case LEAVE_APPROVAL_STAGE_ENUM.ManagerLevel2:
        return this.leave.level2ApprovalDepartment;
      default:
        return null;
    }
  }

  get hasContent(): boolean {
    return this.actions.length > 0 || this.pendingStage !== null;
  }

  stageLabelKey(stage: LEAVE_APPROVAL_STAGE_ENUM): string {
    switch (stage) {
      case LEAVE_APPROVAL_STAGE_ENUM.ManagerLevel1:
        return this.leave?.submissionType === LEAVE_SUBMISSION_TYPE_ENUM.ManagerSelf
          ? 'LEAVES_PAGE.STAGE_SUPERVISOR'
          : 'LEAVES_PAGE.STAGE_DIRECT_MANAGER';
      case LEAVE_APPROVAL_STAGE_ENUM.ManagerLevel2:
        return 'LEAVES_PAGE.STAGE_HIGHER_MANAGER';
      default:
        return 'LEAVES_PAGE.STAGE_HR';
    }
  }

  name(item?: BaseLookupModel | null): string {
    if (!item) return '';
    return (
      (this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ARABIC
        ? item.nameAr
        : (item.nameEn ?? item.nameAr)) ?? ''
    );
  }
}
