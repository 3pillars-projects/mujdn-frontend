import { BaseCrudModel } from '@/abstracts/base-crud-model';
import { PermissionInterceptor } from '@/model-interceptors/features/lookups/permission.interceptor';
import { PermissionService } from '@/services/features/lookups/permission.service';
import { CustomValidators } from '@/validators/custom-validators';
import { Validators } from '@angular/forms';
import { InterceptModel } from 'cast-response';
import { Department } from '../department/department';
import { BaseLookupModel } from '../base-lookup-model';
import { LanguageService } from '@/services/shared/language.service';
import { FactoryService } from '@/services/factory-service';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { PERMISSION_STATUS_ENUM } from '@/enums/permission-status-enum';
import { Attachment } from '@/models/shared/attachment/attachment';
import {
  AttachmentSelection,
  toAttachmentSelection,
} from '@/models/shared/attachment/attachment-selection';

const { send, receive } = new PermissionInterceptor();

@InterceptModel({ send, receive })
export class Permission extends BaseCrudModel<Permission, PermissionService> {
  override $$__service_name__$$: string = 'PermissionService';
  declare permissionDate?: Date | string;
  declare fkStatusId: number;
  declare fkReasonId: number;
  declare fkDepartmentId: number;
  declare fkPermissionTypeId: number;
  declare creationUserId: number;
  declare description: string;
  declare creationUser: BaseLookupModel;
  declare department: BaseLookupModel;
  declare status: BaseLookupModel;
  declare permissionReason: BaseLookupModel;
  declare permissionType: BaseLookupModel;
  declare actionDate?: Date | string;
  declare canTakeAction?: boolean;
  // Root-department override: lets a super-admin reject an already-Accepted permission.
  // Sibling to canTakeAction — never inferred from role, only from this server-computed flag.
  declare canRejectAfterAcceptance?: boolean;
  // Opaque Base64 row-version; echoed back untouched on update, never generated here
  declare concurrencyUpdateVersion?: string | null;
  // Files already stored against this permission; always present on read, never sent back as-is
  attachments: Attachment[] = [];
  // What the permission's attachments should be once the form is saved: the stored files the
  // user kept plus anything newly staged. Filled from the form, read by the interceptor —
  // create sends only the staged ids, update also sends the keep-list. Left undefined on
  // purpose until a form sets it, so `send()` can tell "not edited" from "removed everything".
  declare attachmentSelection?: AttachmentSelection;
  private languageService?: LanguageService;

  constructor() {
    super();
    this.languageService = FactoryService.getService('LanguageService');
  }
  buildForm() {
    const { permissionDate, fkPermissionTypeId, fkReasonId, description, attachments } = this;
    return {
      fkPermissionTypeId: [fkPermissionTypeId, [Validators.required]],
      fkReasonId: [fkReasonId, [Validators.required]],
      permissionDate: [permissionDate, [Validators.required]],
      description: [
        description,
        [
          Validators.required,
          Validators.maxLength(CustomValidators.defaultLengths.ENGLISH_NAME_MAX),
          Validators.minLength(CustomValidators.defaultLengths.MIN_LENGTH),
        ],
      ],
      // Attachments are optional on a permission — the API accepts an empty id list.
      attachmentSelection: [toAttachmentSelection(attachments)],
    };
  }
  isAccepted(): boolean {
    return (this.fkStatusId ?? this.status?.id) === PERMISSION_STATUS_ENUM.Accepted;
  }
  getStatusName(): string {
    return this.languageService?.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
      ? (this.status?.nameEn ?? '')
      : (this.status?.nameAr ?? '');
  }
  getCreationUserName(): string {
    return this.languageService?.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
      ? (this.creationUser?.nameEn ?? '')
      : (this.creationUser?.nameAr ?? '');
  }
  getPermissionReasonName(): string {
    return this.languageService?.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
      ? (this.permissionReason?.nameEn ?? '')
      : (this.permissionReason?.nameAr ?? '');
  }
  getPermissionTypeName(): string {
    return this.languageService?.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
      ? (this.permissionType?.nameEn ?? '')
      : (this.permissionType?.nameAr ?? '');
  }
  getPermissionDepartmentName(): string {
    return this.languageService?.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
      ? (this.department?.nameEn ?? '')
      : (this.department?.nameAr ?? '');
  }
}
