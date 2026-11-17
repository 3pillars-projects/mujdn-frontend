import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { DevicesConfiguration } from '@/models/features/business/devices-configuration';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { AlertService } from '@/services/shared/alert.service';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Select } from 'primeng/select';
import { Observable } from 'rxjs';
import { RequiredMarkerDirective } from '../../../../directives/required-marker.directive';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';
import { DEVICE_STATUS_CONFIG } from '@/enums/device-status-enum';

@Component({
  selector: 'app-devices-configuration-modal',
  imports: [
    Select,
    CommonModule,
    FormsModule,
    TranslatePipe,
    ReactiveFormsModule,
    RequiredMarkerDirective,
    WithNameFallbackPipe,
  ],
  templateUrl: './devices-configuration-modal.component.html',
  styleUrl: './devices-configuration-modal.component.scss',
})
export class DevicesConfigurationModalComponent
  extends BasePopupComponent<DevicesConfiguration>
  implements OnInit
{
  declare model: DevicesConfiguration;
  declare form: FormGroup;
  isCreateMode = false;
  declare viewMode: ViewModeEnum;
  alertService = inject(AlertService);
  fb = inject(FormBuilder);
  data = inject(MAT_DIALOG_DATA);
  accessLocations: BaseLookupModel[] | undefined = [];

  override initPopup() {
    this.model = this.data.model;
    this.accessLocations = this.data.lookups.accessLocations;
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode === ViewModeEnum.CREATE;
    this.accessLocations = [
      { id: null, nameAr: '--- غير محدد ---', nameEn: '--- Not Specified ---' },
      ...this.data.lookups.accessLocations,
    ];
  }

  override buildForm() {
    this.form = this.fb.group(this.model.buildForm());
  }

  override prepareModel(
    model: DevicesConfiguration,
    form: FormGroup
  ): DevicesConfiguration | Observable<DevicesConfiguration> {
    this.model = Object.assign(model, { ...form.value });
    return this.model;
  }

  override saveFail(error: Error): void {
    // optional error handling
  }

  beforeSave(model: DevicesConfiguration, form: FormGroup) {
    return form.valid;
  }

  afterSave() {
    this.alertService.showSuccessMessage({ messages: ['COMMON.SAVED_SUCCESSFULLY'] });
  }

  get accessLocationIdControl() {
    return this.form.get('accessLocationId') as FormControl;
  }
  getPropertyName() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';
  }
  get statusConfig() {
    return DEVICE_STATUS_CONFIG[this.model.status as keyof typeof DEVICE_STATUS_CONFIG];
  }
}
