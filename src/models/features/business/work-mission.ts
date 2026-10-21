import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { WorkMissionInterceptor } from '@/model-interceptors/features/business/work-mission.interceptor';
import { WorkMissionService } from '@/services/features/business/work-mission.service';
import { CustomValidators } from '@/validators/custom-validators';
import { Validators } from '@angular/forms';
import { InterceptModel } from 'cast-response';
import { BaseLookupModel } from '../lookups/base-lookup-model';
import { WorkMissionTypesEnum } from '@/enums/work-mission-type-enum';
import { WorkMissionStatusEnum } from '@/enums/work-mission-status-enum';
import { Attachment } from '@/models/shared/attachment/attachment';
import {
  AttachmentSelection,
  toAttachmentSelection,
} from '@/models/shared/attachment/attachment-selection';

const { send, receive } = new WorkMissionInterceptor();

@InterceptModel({ send, receive })
export class WorkMission extends BaseCrudModel<WorkMission, WorkMissionService> {
  override $$__service_name__$$: string = 'WorkMissionService';
  declare nameEn: string;
  declare nameAr: string;
  declare startDate: Date | string;
  declare endDate: Date | string;
  declare description: string;
  declare missionCreator?: BaseLookupModel;
  declare assignedEmployees?: BaseLookupModel[];
  // Opaque Base64 row-version; echoed back untouched on update, never generated here
  declare concurrencyUpdateVersion?: string | null;
  declare isMissionCreator: boolean;
  declare isMyMission: boolean;
  workMissionType: WorkMissionTypesEnum = WorkMissionTypesEnum.FullDay;
  // Files already stored against this mission; always present on read, never sent back as-is
  attachments: Attachment[] = [];
  // What the mission's attachments should be once the form is saved: the stored files the
  // user kept plus anything newly staged. Filled from the form, read by the interceptor —
  // create sends only the staged ids, update also sends the keep-list. Left undefined on
  // purpose until a form sets it, so `send()` can tell "not edited" from "removed everything".
  declare attachmentSelection?: AttachmentSelection;

  // HR approval workflow — response-only; never part of the create/update payloads.
  declare status: WorkMissionStatusEnum;
  // The creator's department when the mission was created.
  declare creatorDepartment?: BaseLookupModel | null;
  declare hrDecisionBy?: BaseLookupModel | null;
  declare hrDecisionDate?: Date | string | null;
  declare rejectionNotes?: string | null;
  declare isAutoApproved?: boolean;
  // What the current user may do with this mission, decided by the server.
  declare canEdit?: boolean;
  declare canDelete?: boolean;
  declare canAssign?: boolean;
  declare canTakeAction?: boolean;

  buildForm() {
    const { nameAr, nameEn, startDate, endDate, description, workMissionType, attachments } = this;
    return {
      nameAr: [
        nameAr,
        [
          Validators.required,
          Validators.maxLength(CustomValidators.defaultLengths.ARABIC_NAME_MAX),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
          CustomValidators.pattern('AR_NUM'),
        ],
      ],
      nameEn: [
        nameEn,
        [
          Validators.maxLength(CustomValidators.defaultLengths.ENGLISH_NAME_MAX),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
          CustomValidators.pattern('ENG_NUM'),
        ],
      ],
      startDate: [startDate, [Validators.required]],
      endDate: [endDate, [Validators.required]],
      description: [
        description,
        [
          Validators.required,
          Validators.maxLength(CustomValidators.defaultLengths.NOTES),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
        ],
      ],
      workMissionType: [workMissionType ?? WorkMissionTypesEnum.FullDay, [Validators.required]],
      // Attachments are optional on a mission — the API accepts an empty id list.
      attachmentSelection: [toAttachmentSelection(attachments)],
    };
  }
}
