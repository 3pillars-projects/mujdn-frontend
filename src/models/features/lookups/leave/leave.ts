import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { LeaveService } from '@/services/features/lookups/leave.service';
import { InterceptModel } from 'cast-response';
import { LeaveInterceptor } from '@/model-interceptors/features/lookups/leave-interceptor';
import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { LEAVE_STATUS_ENUM } from '@/enums/leave-status-enum';
import { LEAVE_APPROVAL_STAGE_ENUM } from '@/enums/leave-approval-stage-enum';
import { LEAVE_SUBMISSION_TYPE_ENUM } from '@/enums/leave-submission-type-enum';
import { LeaveApprovalAction } from '@/models/features/lookups/leave/leave-approval-action';
import { Attachment } from '@/models/shared/attachment/attachment';
import {
  AttachmentSelection,
  attachmentsRequired,
  toAttachmentSelection,
} from '@/models/shared/attachment/attachment-selection';

const { send, receive } = new LeaveInterceptor();

function nonWhitespaceRequired(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && control.value.trim().length === 0
    ? { required: true }
    : null;
}

export class LeaveEmployeeLookup extends UsersWithDepartmentLookup {
  declare department?: BaseLookupModel;
}

@InterceptModel({ send, receive })
export class Leave extends BaseCrudModel<Leave, LeaveService> {
  override $$__service_name__$$: string = 'LeaveService';
  declare fkEmployeeId: number;
  declare employee?: LeaveEmployeeLookup | null;
  declare dateFrom: Date | string;
  declare dateTo: Date | string;
  declare decisionNumber: string;
  declare fkLeaveTypeId: number;
  declare leaveType?: BaseLookupModel | null;
  declare status: LEAVE_STATUS_ENUM;
  declare rejectionNotes?: string | null;
  declare creationUserId?: number | null;
  declare creationUser?: UsersWithDepartmentLookup | null;
  declare actionDate?: Date | string | null;
  // Server-computed for the caller: decide the current stage / edit or withdraw the leave.
  declare canTakeAction?: boolean;
  declare canEdit?: boolean;
  declare canDelete?: boolean;
  // True when the caller's approval is an HR decision, which may amend the dates.
  declare canAmendDates?: boolean;
  declare submissionType?: LEAVE_SUBMISSION_TYPE_ENUM;
  // The stage an in-progress leave waits at; null once accepted or rejected.
  declare approvalStage?: LEAVE_APPROVAL_STAGE_ENUM | null;
  declare level1ApprovalDepartment?: BaseLookupModel | null;
  declare level2ApprovalDepartment?: BaseLookupModel | null;
  approvalActions: LeaveApprovalAction[] = [];
  // Opaque Base64 row-version; never generated or edited on the frontend
  declare concurrencyUpdateVersion?: string | null;
  // Files already stored against this leave; always present on read, never sent back as-is
  attachments: Attachment[] = [];
  // What the leave's attachments should be once the form is saved: the stored files the user
  // kept plus anything newly staged. Filled from the form, read by the interceptor — create
  // sends only the staged ids, update also sends the keep-list. Left undefined on purpose
  // until a form sets it, so `send()` can tell "not edited" from "user removed everything".
  declare attachmentSelection?: AttachmentSelection;

  /**
   * @param forSelf the caller files his own leave: there is no employee to pick, and the API
   * files a create without `fkEmployeeId` for the caller.
   */
  buildForm(forSelf = false) {
    const { fkEmployeeId, fkLeaveTypeId, dateFrom, dateTo, decisionNumber, attachments } = this;
    return {
      ...(forSelf ? {} : { fkEmployeeId: [fkEmployeeId, [Validators.required]] }),
      fkLeaveTypeId: [fkLeaveTypeId, [Validators.required]],
      dateFrom: [dateFrom, [Validators.required]],
      dateTo: [dateTo, [Validators.required]],
      decisionNumber: [
        decisionNumber,
        [Validators.required, nonWhitespaceRequired, Validators.maxLength(100)],
      ],
      // A leave must always carry at least one file — counting the ones it already has, so
      // an edit that keeps the existing attachment does not demand a pointless re-upload.
      attachmentSelection: [toAttachmentSelection(attachments), [attachmentsRequired]],
    };
  }

  isNew(): boolean {
    return this.status === LEAVE_STATUS_ENUM.New;
  }

  isAccepted(): boolean {
    return this.status === LEAVE_STATUS_ENUM.Accepted;
  }

  /** Waiting for a manager level (as opposed to HR or a final decision). */
  isAtManagerStage(): boolean {
    return (
      this.isNew() &&
      (this.approvalStage === LEAVE_APPROVAL_STAGE_ENUM.ManagerLevel1 ||
        this.approvalStage === LEAVE_APPROVAL_STAGE_ENUM.ManagerLevel2)
    );
  }
}
