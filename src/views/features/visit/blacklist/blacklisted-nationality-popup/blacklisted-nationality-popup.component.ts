import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { BlacklistedNationalityService } from '@/services/features/visit/blacklisted-nationality.service';
import { AlertService } from '@/services/shared/alert.service';
import { LanguageService } from '@/services/shared/language.service';
import { Component, inject, Inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormBuilder, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Select } from 'primeng/select';
import { Observable } from 'rxjs';
import { RequiredMarkerDirective } from '../../../../../directives/required-marker.directive';
import { BlacklistedNationality } from '@/models/features/visit/blacklisted-nationality';
import { TranslatePipe } from '@ngx-translate/core';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { getLocalizedName } from '@/utils/localized-name';

interface Nationality {
  id: number;
  nameAr: string;
  nameEn: string;
}

@Component({
  selector: 'app-blacklisted-nationality-popup',
  imports: [
    Select,
    ReactiveFormsModule,
    RequiredMarkerDirective,
    TranslatePipe,
    ValidationMessagesComponent,
  ],
  templateUrl: './blacklisted-nationality-popup.component.html',
  styleUrl: './blacklisted-nationality-popup.component.scss',
})
export class BlacklistedNationalityPopupComponent
  extends BasePopupComponent<BlacklistedNationality>
  implements OnInit
{
  declare model: BlacklistedNationality;
  declare form: FormGroup;
  alertService = inject(AlertService);
  service = inject(BlacklistedNationalityService);
  fb = inject(FormBuilder);
  isCreateMode = false;
  declare viewMode: ViewModeEnum;
  nationalities: Nationality[] = [];
  nationalityOptions: { label: string; value: number }[] = [];

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    super();
  }

  override saveFail(error: Error): void {
    // logic after error if there
  }

  override prepareModel(
    model: BlacklistedNationality,
    form: FormGroup
  ): BlacklistedNationality | Observable<BlacklistedNationality> {
    this.model = Object.assign(model, { ...form.value });
    return this.model;
  }

  override initPopup() {
    this.model = this.data.model;
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode === ViewModeEnum.CREATE;
    this.nationalities = this.data.lookups?.nationalities || [];
    this.prepareNationalityOptions();
  }

  override buildForm() {
    this.form = this.fb.group(this.model.buildForm());
  }

  private prepareNationalityOptions() {
    const language = this.languageService.getCurrentLanguage();

    this.nationalityOptions = this.nationalities.map((nationality) => ({
      label: getLocalizedName(nationality, language),
      value: nationality.id,
    }));
  }

  beforeSave(model: BlacklistedNationality, form: FormGroup) {
    // manipulation before save
    return form.valid;
  }

  afterSave() {
    const successObject = { messages: ['COMMON.SAVED_SUCCESSFULLY'] };
    this.alertService.showSuccessMessage(successObject);
  }

  get fkNationalityIdControl() {
    return this.form.get('fkNationalityId') as FormControl;
  }
}
