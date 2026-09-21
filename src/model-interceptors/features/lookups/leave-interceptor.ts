import { ModelInterceptorContract } from 'cast-response';
import { Leave } from '@/models/features/lookups/leave/leave';
import { toDateOnly, toDateTime } from '@/utils/general-helper';
import { toAttachments } from '@/models/shared/attachment/attachment';
import {
  keptAttachmentIds,
  temporaryUploadIds,
  toAttachmentSelection,
} from '@/models/shared/attachment/attachment-selection';

/** The wire shape the leaves API accepts — deliberately narrower than the model. */
interface LeaveRequestPayload {
  fkEmployeeId?: number;
  fkLeaveTypeId?: number;
  dateFrom: string;
  dateTo: string;
  decisionNumber: string;
  temporaryUploadIds: string[];
  id?: number;
  concurrencyUpdateVersion?: string | null;
  keptAttachmentIds?: number[];
}

export class LeaveInterceptor implements ModelInterceptorContract<Leave> {
  receive(model: Leave): Leave {
    model.dateFrom = toDateTime(model.dateFrom);
    model.dateTo = toDateTime(model.dateTo);
    model.actionDate = toDateTime(model.actionDate);
    model.attachments = toAttachments(model.attachments);
    return model;
  }

  // The leaves API rejects unknown JSON properties (UnmappedMemberHandling.Disallow),
  // so send exactly the request shape and nothing else: create sends the
  // CreateLeaveRequest fields; update additionally needs id, the row-version and the
  // attachment keep-list.
  send(model: Partial<Leave>): Partial<Leave> {
    // An update that never opened the attachment editor keeps what the leave already has:
    // the keep-list is authoritative, so defaulting to `[]` would wipe every file.
    const selection = model.attachmentSelection ?? toAttachmentSelection(model.attachments);
    const payload: LeaveRequestPayload = {
      fkEmployeeId: model.fkEmployeeId,
      fkLeaveTypeId: model.fkLeaveTypeId,
      dateFrom: toDateOnly(model.dateFrom),
      dateTo: toDateOnly(model.dateTo),
      decisionNumber: model.decisionNumber?.trim() ?? '',
      // Always present; `[]` when the user staged nothing.
      temporaryUploadIds: temporaryUploadIds(selection),
    };

    if (model.id) {
      payload.id = model.id;
      // Echoed back exactly as received — reformatting it triggers a false conflict.
      payload.concurrencyUpdateVersion = model.concurrencyUpdateVersion;
      // A keep-list, not a delete-list: every stored attachment whose id is missing here is
      // removed. It is required and must always be sent explicitly — omitting it, or sending
      // `[]` by accident, deletes every file the leave has.
      payload.keptAttachmentIds = keptAttachmentIds(selection);
    }

    return payload as unknown as Partial<Leave>;
  }
}
