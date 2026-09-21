import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { LeaveService } from '@/services/features/lookups/leave.service';
import { InterceptModel } from 'cast-response';
import { LeaveInterceptor } from '@/model-interceptors/features/lookups/leave-interceptor';
import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { LEAVE_STATUS_ENUM } from '@/enums/leave-status-enum';
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
  declare canTakeAction?: boolean;
  // Opaque Base64 row-version; never generated or edited on the frontend
  declare concurrencyUpdateVersion?: string | null;
  // Files already stored against this leave; always present on read, never sent back as-is
  attachments: Attachment[] = [];
  // What the leave's attachments should be once the form is saved: the stored files the user
  // kept plus anything newly staged. Filled from the form, read by the interceptor — create
  // sends only the staged ids, update also sends the keep-list. Left undefined on purpose
  // until a form sets it, so `send()` can tell "not edited" from "user removed everything".
  declare attachmentSelection?: AttachmentSelection;

  buildForm() {
    const { fkEmployeeId, fkLeaveTypeId, dateFrom, dateTo, decisionNumber, attachments } = this;
    return {
      fkEmployeeId: [fkEmployeeId, [Validators.required]],
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
}
