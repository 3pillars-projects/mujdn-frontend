import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { Permission } from '@/models/features/lookups/permission/permission';
import { PermissionService } from '@/services/features/lookups/permission.service';
import { AlertService } from '@/services/shared/alert.service';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { Component, Inject, inject, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { DatePickerModule } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { Observable } from 'rxjs';
import { RequiredMarkerDirective } from '../../../../../directives/required-marker.directive';
import { Attachment } from '@/models/shared/attachment/attachment';
import { AttachmentListComponent } from '@/views/shared/attachment-list/attachment-list.component';
import { AttachmentUploadComponent } from '@/views/shared/attachment-upload/attachment-upload.component';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

interface Adminstration {
  type: string;
}
@Component({
  selector: 'app-add-permission-popup',
  imports: [
    Select,
    DatePickerModule,
    FormsModule,
    TextareaModule,
    TranslatePipe,
    ReactiveFormsModule,
    ValidationMessagesComponent,
    RequiredMarkerDirective,
    AttachmentUploadComponent,
    AttachmentListComponent,
    WithNameFallbackPipe,
  ],
  templateUrl: './add-permission-popup.component.html',
  styleUrl: './add-permission-popup.component.scss',
})
export class AddPermissionPopupComponent extends BasePopupComponent<Permission> implements OnInit {
  // Rendered while creating and editing — a stored file is changed by removing it and
  // picking a new one, and both halves of that swap travel with the save.
  @ViewChild(AttachmentUploadComponent) attachmentUpload?: AttachmentUploadComponent;
  declare model: Permission;
  declare form: FormGroup;
  alertService = inject(AlertService);
  service = inject(PermissionService);
  fb = inject(FormBuilder);
  permissionTypes: BaseLookupModel[] | undefined = [];
  prmissionReasons: BaseLookupModel[] | undefined = [];
  data = inject(MAT_DIALOG_DATA);
  isCreateMode = false;
  isEditMode = false;

  override saveFail(error: Error): void {
    // logic after error if there
  }

  override prepareModel(model: Permission, form: FormGroup): Permission | Observable<Permission> {
    this.model = Object.assign(model, { ...form.value });
    return this.model;
  }

  override initPopup() {
    this.model = this.data.model;
    this.isCreateMode = this.data.viewMode == ViewModeEnum.CREATE;
    this.isEditMode = this.data.viewMode == ViewModeEnum.EDIT;
    this.prmissionReasons = this.data.lookups.prmissionReasons;
    this.permissionTypes = this.data.lookups.permissionTypes;
  }

  override buildForm() {
    // The control is seeded from the permission's stored attachments, so editing starts from
    // what the permission already has rather than from an empty picker.
    this.form = this.fb.group(this.model.buildForm());
  }

  beforeSave(model: Permission, form: FormGroup) {
    // Submitting mid-upload would save the permission without the file just picked.
    if (this.attachmentSelectionControl?.hasError('attachmentsUploading')) {
      this.alertService.showErrorMessage({ messages: ['ATTACHMENTS.WAIT_FOR_UPLOAD'] });
      return false;
    }
    return form.valid;
  }

  afterSave() {
    // The permission now owns the staged files, so closing this popup must not cancel them.
    // Any attachment the user removed was deleted by the same request.
    this.attachmentUpload?.markAsConsumed();
    const successObject = { messages: ['COMMON.SAVED_SUCCESSFULLY'] };
    this.alertService.showSuccessMessage(successObject);
  }

  getPropertyName() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';
  }
  get fkPermissionTypeIdControl() {
    return this.form.get('fkPermissionTypeId') as FormControl;
  }
  get permissionDateControl() {
    return this.form.get('permissionDate') as FormControl;
  }
  get fkReasonIdControl() {
    return this.form.get('fkReasonId') as FormControl;
  }
  get descriptionControl() {
    return this.form.get('description') as FormControl;
  }

  get attachmentSelectionControl() {
    return this.form.get('attachmentSelection') as FormControl | null;
  }

  get isUploadingAttachment(): boolean {
    return !!this.attachmentSelectionControl?.hasError('attachmentsUploading');
  }

  /** Bound as a value, so it has to stay an arrow to keep `this`. */
  downloadAttachment = (attachment: Attachment): Observable<Blob> =>
    this.service.downloadAttachment(this.model.id, attachment.id);
}
