import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { DialogRef } from '@angular/cdk/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { Visit } from '@/models/features/visit/visit';
import { Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { AlertService } from '@/services/shared/alert.service';
import { VisitService } from '@/services/features/visit/visit.service';
import { ConfirmationService } from '@/services/shared/confirmation.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { RequiredMarkerDirective } from '../../../../../directives/required-marker.directive';
import { TranslatePipe } from '@ngx-translate/core';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { CustomValidators } from '@/validators/custom-validators';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { MultiSelectModule } from 'primeng/multiselect';
import { AccessLocationLookup } from '@/models/features/business/access-location-lookup';
import { LocalizedNamePipe } from '@/pipes/localized-name.pipe';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

@Component({
  selector: 'app-add-edit-visit-request-popup',
  imports: [
    DatePickerModule,
    FormsModule,
    ReactiveFormsModule,
    TextareaModule,
    InputTextModule,
    TabsModule,
    TableModule,
    Select,
    PaginatorModule,
    CommonModule,
    RequiredMarkerDirective,
    TranslatePipe,
    MultiSelectModule,
    ValidationMessagesComponent,
    LocalizedNamePipe,
    WithNameFallbackPipe,
  ],
  templateUrl: './add-edit-visit-request-popup.component.html',
  styleUrl: './add-edit-visit-request-popup.component.scss',
})
export class AddEditVisitRequestPopupComponent extends BasePopupComponent<Visit> implements OnInit {
  declare model: Visit;
  declare form: FormGroup;
  declare viewMode: ViewModeEnum;
  alertService = inject(AlertService);
  service = inject(VisitService);
  confirmationService = inject(ConfirmationService);
  fb = inject(FormBuilder);
  isCreateMode = false;
  isCreateFromExistingMode = false;

  // Lookup data
  nationalities: BaseLookupModel[] = [];
  departments: BaseLookupModel[] = [];
  accessLocations: AccessLocationLookup[] = [];

  // For employee selection table
  employees!: any[];
  first: number = 0;
  rows: number = 10;
  selectedEmployees: any[] = [];
  private readonly _minDate: Date = new Date();

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    super();
  }

  get langOptionLabel(): string {
    const lang = this.languageService.getCurrentLanguage();
    return lang === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }

  override initPopup() {
    this.model = this.data.model;
    this.nationalities = this.data.lookups.nationalities || [];
    this.departments = this.data.lookups.departments || [];
    this.accessLocations = this.data.lookups.accessLocations || [];
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode == ViewModeEnum.CREATE;
    this.isCreateFromExistingMode = this.viewMode == ViewModeEnum.CREATE_FROM_EXISTING;
  }

  override prepareModel(model: Visit, form: FormGroup): Visit | Observable<Visit> {
    const formValue = form.value;
    this.model = Object.assign(model, { ...formValue });
    return this.model;
  }

  override buildForm() {
    this.form = this.fb.group(this.model.buildForm(), {
      validators: [CustomValidators.timeFromBeforeTimeTo('visitTimeFrom', 'visitTimeTo')],
    });
    if (this.isCreateFromExistingMode || !this.isCreateMode) {
      this.form.get('nationalId')?.disable();
    }
  }

  override saveFail(error: Error): void {
    // Handle save error - could show error message
    console.error('Save failed:', error);
  }

  override afterSave() {
    const successObject = { messages: ['COMMON.SAVED_SUCCESSFULLY'] };
    this.alertService.showSuccessMessage(successObject);
  }

  override beforeSave(model: Visit, form: FormGroup): Observable<boolean> | boolean {
    // First check if form is valid
    if (!form.valid) {
      return false;
    }

    // Only check for existing visitor in create mode and when nationalId is provided
    if (!this.isCreateMode || !form.get('nationalId')?.value) {
      return true;
    }

    const nationalId = form.get('nationalId')?.value;

    // Check if visitor exists
    return this.service.isVisitorExists(nationalId).pipe(
      switchMap((visitorExists: boolean) => {
        if (visitorExists) {
          // Show confirmation dialog
          const confirmationDialog = this.confirmationService.open({
            icon: 'warning',
            messages: [
              'VISIT_REQUEST_PAGE.VISITOR_EXISTS_CONFIRMATION',
              'VISIT_REQUEST_PAGE.DO_YOU_WANT_TO_CONTINUE',
            ],
            confirmText: 'COMMON.YES',
            cancelText: 'COMMON.NO',
          });

          // Return the dialog result
          return confirmationDialog.afterClosed().pipe(
            switchMap((result: DIALOG_ENUM) => {
              if (result == DIALOG_ENUM.OK) {
                return of(true);
              } else {
                return of(false);
              }
            })
          );
        } else {
          // Visitor doesn't exist, proceed with save
          return of(true);
        }
      })
    );
  }

  // Form control getters
  get nationalIdControl() {
    return this.form.get('nationalId') as FormControl;
  }

  get nationalIdExpiryDateControl() {
    return this.form.get('nationalIdExpiryDate') as FormControl;
  }

  get fullNameControl() {
    return this.form.get('fullName') as FormControl;
  }

  get nationalityControl() {
    return this.form.get('fkNationalityId') as FormControl;
  }

  get visitorOrganizationControl() {
    return this.form.get('visitorOrganization') as FormControl;
  }

  get targetDepartmentControl() {
    return this.form.get('fkTargetDepartmentId') as FormControl;
  }

  get phoneNumberControl() {
    return this.form.get('phoneNumber') as FormControl;
  }

  get addressControl() {
    return this.form.get('address') as FormControl;
  }

  get emailControl() {
    return this.form.get('email') as FormControl;
  }

  get visitDateControl() {
    return this.form.get('visitDate') as FormControl;
  }

  get visitTimeFromControl() {
    return this.form.get('visitTimeFrom') as FormControl;
  }

  get visitTimeToControl() {
    return this.form.get('visitTimeTo') as FormControl;
  }

  get visitPurposeControl() {
    return this.form.get('visitPurpose') as FormControl;
  }
  get accessLocationIdsControl() {
    return this.form.get('accessLocationIds') as FormControl;
  }

  getPropertyName(): string {
    return this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH
      ? 'nameEn'
      : 'nameAr';
  }
  get selectedAccessLocations() {
    const ids = this.accessLocationIdsControl.value || [];
    return this.accessLocations.filter((loc) => ids.includes(loc.id));
  }

  removeAccessLocation(id: number | undefined) {
    const currentIds: number[] = this.accessLocationIdsControl.value || [];
    this.accessLocationIdsControl.setValue(currentIds.filter((x) => x !== id));
  }

  get minDate(): Date {
    return this._minDate;
  }
}
