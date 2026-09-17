import { Component, Inject, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { Department } from '@/models/features/lookups/department/department';
import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { catchError, exhaustMap, filter, isObservable, Observable, of, switchMap } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AlertService } from '@/services/shared/alert.service';
import { City } from '@/models/features/lookups/city/city';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { TranslatePipe } from '@ngx-translate/core';
import { ValidationMessagesComponent } from '../../../shared/validation-messages/validation-messages.component';
import { RequiredMarkerDirective } from '../../../../directives/required-marker.directive';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { markFormGroupTouched } from '@/utils/general-helper';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { BaseCrudModel } from '@/abstracts/base-crud-model';

@Component({
  selector: 'app-department-popup',
  imports: [
    Select,
    DatePickerModule,
    FormsModule,
    InputTextModule,
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    ValidationMessagesComponent,
    RequiredMarkerDirective,
  ],
  templateUrl: './department-popup.component.html',
  styleUrl: './department-popup.component.scss',
})
export class DepartmentPopupComponent extends BasePopupComponent<Department> implements OnInit {
  declare model: Department;
  declare form: FormGroup;
  declare viewMode: ViewModeEnum;
  isCreateMode = false;
  alertService = inject(AlertService);
  fb = inject(FormBuilder);
  cities: City[] = [];
  regions: BaseLookupModel[] = [];
  parentDepartments: BaseLookupModel[] = [];
  usersProfiles: UsersWithDepartmentLookup[] = new Array<UsersWithDepartmentLookup>();
  date2: Date | undefined;
  filteredCities: City[] = [];
  levelType: string = 'one-level';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    super();
  }
  get nameArControl() {
    return this.form.get('nameAr') as FormControl;
  }
  get nameEnControl() {
    return this.form.get('nameEn') as FormControl;
  }
  get fkRegionIdControl() {
    return this.form.get('fkRegionId') as FormControl;
  }
  get fkCityIdControl() {
    return this.form.get('fkCityId') as FormControl;
  }
  get fkParentDepartmentIdControl() {
    return this.form.get('fkParentDepartmentId') as FormControl;
  }
  get isRootDepartment(): boolean {
    return this.model.fkParentDepartmentId == null;
  }
  get addressControl() {
    return this.form.get('address') as FormControl;
  }
  get phoneNumberControl() {
    return this.form.get('phoneNumber') as FormControl;
  }
  get faxControl() {
    return this.form.get('fax') as FormControl;
  }
  get langOptionLabel(): string {
    const lang = this.languageService.getCurrentLanguage();
    return lang === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }

  override initPopup() {
    // First, initialize the model and data
    this.model = this.data.model;
    this.cities = this.data.lookups.cities;
    this.regions = this.data.lookups.regions;
    this.parentDepartments = this.data.lookups.parentDepartments || [];
    this.usersProfiles =
      this.data?.lookups?.usersProfiles?.filter(
        (x: UsersWithDepartmentLookup) => x.departmentId == this.model?.id
      ) || [];
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode == ViewModeEnum.CREATE;

    // Build the form first
    this.buildForm();

    // Then initialize filtered cities
    this.initializeFilteredCities();

    // Finally, set up the region change listener
    this.setupRegionChangeListener();
  }

  onRegionChange(event: any): void {
    const regionId = event.value;
    this.filterCitiesByRegion(regionId);
  }

  override buildForm() {
    this.form = this.fb.group(this.model.buildForm());

    if (this.model.fkParentDepartmentId == null) {
      this.form.get('isOneLevelApproval')?.setValue(true);
    }
  }

  setupRegionChangeListener(): void {
    this.form.get('fkRegionId')?.valueChanges.subscribe((regionId) => {
      this.filterCitiesByRegion(regionId);
    });
  }

  override saveFail(error: Error): void {}

  override afterSave(model: Department, dialogRef: MatDialogRef<any, any>): void {
    const successObject = { messages: ['COMMON.SAVED_SUCCESSFULLY'] };
    this.alertService.showSuccessMessage(successObject);
  }

  override beforeSave(model: Department, form: FormGroup): Observable<boolean> | boolean {
    if (!form.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(form.controls).forEach((key) => {
        form.get(key)?.markAsTouched();
      });
      return false;
    }

    return true;
  }

  override prepareModel(model: Department, form: FormGroup): Department | Observable<Department> {
    this.model = Object.assign(model, { ...form.value });
    return this.model;
  }

  isCurrentLanguageEnglish() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH;
  }

  private initializeFilteredCities(): void {
    const currentRegionId = this.model.fkRegionId;
    this.filterCitiesByRegion(currentRegionId);
  }

  private filterCitiesByRegion(regionId: any): void {
    if (regionId) {
      this.filteredCities = this.cities.filter((city) => city.fkRegionId === regionId);
    } else {
      this.filteredCities = [];
    }

    const currentCityId = this.form.get('fkCityId')?.value;
    if (currentCityId && !this.filteredCities.some((city) => city.id === currentCityId)) {
      this.form.get('fkCityId')?.setValue(null);
    }
  }

  // Helper method to debug form errors
  private getFormErrors(form: FormGroup): any {
    const errors: any = {};
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  override listenToSave() {
    this.save$
      // call before Save callback
      .pipe(
        switchMap(() => {
          const result = this.beforeSave(this.model, this.form);
          !result && markFormGroupTouched(this.form);
          return isObservable(result) ? result : of(result);
        })
      )
      // filter the return value from saveBeforeCallback and allow only the true
      .pipe(filter((value) => value))
      .pipe(
        switchMap((_) => {
          const result = this.prepareModel(this.model, this.form);
          return isObservable(result) ? result : of(result);
        })
      )
      .pipe(
        exhaustMap((model: Department) => {
          const save$ = (model as BaseCrudModel<any, any>).save();
          return save$.pipe(
            catchError((error) => {
              this.saveFail(error);
              return of({
                error: error,
                model,
              });
            })
          );
        })
      )
      .pipe(
        filter((value) => {
          return (
            !value.hasOwnProperty('error') || (value.hasOwnProperty('error') && value.error == null)
          );
        })
      )
      .subscribe((model: Department) => {
        this.afterSave(model, this.dialogRef);
        this.dialogRef.close({ action: DIALOG_ENUM.OK, data: model });
      });
  }
}
