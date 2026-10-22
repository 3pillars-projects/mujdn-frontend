import { Component, Inject, inject, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DialogRef } from '@angular/cdk/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { WorkMission } from '@/models/features/business/work-mission';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { M } from '@angular/material/dialog.d-B5HZULyo';
import { Observable } from 'rxjs';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { RequiredMarkerDirective } from '../../../../../directives/required-marker.directive';
import { CustomValidators } from '@/validators/custom-validators';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { WorkMissionTypesEnum } from '@/enums/work-mission-type-enum';
import { WorkMissionStatusEnum } from '@/enums/work-mission-status-enum';
import { Attachment } from '@/models/shared/attachment/attachment';
import { AlertService } from '@/services/shared/alert.service';
import { WorkMissionService } from '@/services/features/business/work-mission.service';
import { AttachmentListComponent } from '@/views/shared/attachment-list/attachment-list.component';
import { AttachmentUploadComponent } from '@/views/shared/attachment-upload/attachment-upload.component';

@Component({
  selector: 'app-add-new-mission-popup',
  imports: [
    DatePickerModule,
    FormsModule,
    TextareaModule,
    InputTextModule,
    TabsModule,
    TableModule,
    PaginatorModule,
    ReactiveFormsModule,
    RequiredMarkerDirective,
    TranslatePipe,
    ValidationMessagesComponent,
    RadioButtonModule,
    AttachmentUploadComponent,
    AttachmentListComponent,
  ],
  templateUrl: './add-new-mission-popup.component.html',
  styleUrl: './add-new-mission-popup.component.scss',
})
export class AddNewMissionPopupComponent extends BasePopupComponent<WorkMission> implements OnInit {
  // Rendered while creating and editing — a stored file is changed by removing it and
  // picking a new one, and both halves of that swap travel with the save.
  @ViewChild(AttachmentUploadComponent) attachmentUpload?: AttachmentUploadComponent;
  date2: Date | undefined;
  model!: WorkMission;
  declare form: FormGroup;
  declare viewMode: ViewModeEnum;
  isCreateMode = false;
  isEditMode = false;
  translateService = inject(TranslateService);
  alertService = inject(AlertService);
  service = inject(WorkMissionService);
  WorkMissionTypesEnum = WorkMissionTypesEnum;

  /** Only Super HR can open the editor on an approved mission; their save applies at once. */
  get isApprovedMission(): boolean {
    return this.model?.status === WorkMissionStatusEnum.Approved;
  }

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: { model: WorkMission; viewMode: ViewModeEnum }
  ) {
    super();
  }
  override initPopup(): void {
    this.model = this.data.model;
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode == ViewModeEnum.CREATE;
    this.isEditMode = this.viewMode == ViewModeEnum.EDIT;
  }
  override buildForm() {
    // The control is seeded from the mission's stored attachments, so editing starts from
    // what the mission already has rather than from an empty picker.
    this.form = this.fb.group(this.model.buildForm(), {
      validators: [CustomValidators.startBeforeEnd('startDate', 'endDate')],
    });
  }
  override saveFail(error: Error): void {}
  override afterSave(model: WorkMission, dialogRef: M<any, any>): void {
    // The mission now owns the staged files, so closing this popup must not cancel them.
    // Any attachment the user removed was deleted by the same request.
    this.attachmentUpload?.markAsConsumed();
  }
  override beforeSave(model: WorkMission, form: FormGroup): Observable<boolean> | boolean {
    // Submitting mid-upload would save the mission without the file just picked.
    if (this.attachmentSelectionControl?.hasError('attachmentsUploading')) {
      this.alertService.showErrorMessage({ messages: ['ATTACHMENTS.WAIT_FOR_UPLOAD'] });
      return false;
    }
    return form.valid;
  }
  override prepareModel(
    model: WorkMission,
    form: FormGroup
  ): WorkMission | Observable<WorkMission> {
    this.model = Object.assign(model, { ...form.value });
    return model;
  }

  get nameArControl() {
    return this.form.get('nameAr') as FormControl;
  }
  get nameEnControl() {
    return this.form.get('nameEn') as FormControl;
  }
  get startDateControl() {
    return this.form.get('startDate') as FormControl;
  }
  get endDateControl() {
    return this.form.get('endDate') as FormControl;
  }
  get descriptionControl() {
    return this.form.get('description') as FormControl;
  }
  get workMissionTypeControl() {
    return this.form.get('workMissionType') as FormControl;
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
