import { WorkMission } from '@/models/features/business/work-mission';
import { toAttachments } from '@/models/shared/attachment/attachment';
import {
  keptAttachmentIds,
  temporaryUploadIds,
  toAttachmentSelection,
} from '@/models/shared/attachment/attachment-selection';
import { WorkMissionTypesEnum } from '@/enums/work-mission-type-enum';
import { toDateOnly, toDateTime } from '@/utils/general-helper';
import { ModelInterceptorContract } from 'cast-response';

/**
 * The exact body `POST /api/WorkMission` accepts. It rejects any property it does not know,
 * so the payload is built from scratch instead of being stripped down from the model.
 */
interface CreateWorkMissionRequestPayload {
  nameAr: string;
  nameEn?: string | null;
  startDate: string;
  endDate: string;
  description: string;
  workMissionType: WorkMissionTypesEnum;
  temporaryUploadIds: string[];
}

/** The exact body `PUT /api/WorkMission` accepts — the create fields plus row identity. */
interface UpdateWorkMissionRequestPayload extends CreateWorkMissionRequestPayload {
  id: number;
  concurrencyUpdateVersion?: string | null;
  keptAttachmentIds: number[];
}

export class WorkMissionInterceptor implements ModelInterceptorContract<WorkMission> {
  receive(model: WorkMission): WorkMission {
    model.endDate = toDateTime(model.endDate);
    model.startDate = toDateTime(model.startDate);
    model.hrDecisionDate = model.hrDecisionDate ? toDateTime(model.hrDecisionDate) : null;
    model.attachments = toAttachments(model.attachments);
    return model;
  }

  send(model: Partial<WorkMission>): Partial<WorkMission> {
    // An update that never opened the attachment editor keeps what the mission already has:
    // the keep-list is authoritative, so defaulting to `[]` would wipe every file.
    const selection = model.attachmentSelection ?? toAttachmentSelection(model.attachments);
    const payload: CreateWorkMissionRequestPayload = {
      nameAr: model.nameAr!,
      nameEn: model.nameEn ?? null,
      startDate: toDateOnly(model.startDate),
      endDate: toDateOnly(model.endDate),
      description: model.description!,
      workMissionType: model.workMissionType!,
      // Always present; `[]` when the user staged nothing.
      temporaryUploadIds: temporaryUploadIds(selection),
    };

    if (!model.id) {
      return payload as unknown as Partial<WorkMission>;
    }

    const updatePayload: UpdateWorkMissionRequestPayload = {
      ...payload,
      id: model.id,
      // Echoed back exactly as received — reformatting it triggers a false conflict.
      concurrencyUpdateVersion: model.concurrencyUpdateVersion,
      // A keep-list, not a delete-list: every stored attachment whose id is missing here is
      // removed. It is required and must always be sent explicitly — omitting it, or sending
      // `[]` by accident, deletes every file the mission has.
      keptAttachmentIds: keptAttachmentIds(selection),
    };

    return updatePayload as unknown as Partial<WorkMission>;
  }
}
