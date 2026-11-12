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
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { User } from '@/models/auth/user';
import { Observable } from 'rxjs';
import { AlertService } from '@/services/shared/alert.service';
import { UserService } from '@/services/features/user.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { RequiredMarkerDirective } from '../../../../../directives/required-marker.directive';
import { TranslatePipe } from '@ngx-translate/core';
import { ACCOUNT_STATUS_OPTIONS, AccountStatusOption } from '@/models/shared/account-status-option';
import { FINGERPRINT_EXEMPTION_OPTIONS } from '@/models/shared/fingerprint-exempt-option';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { CityLookup } from '@/models/features/lookups/city/city-lookup';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { ROLES_ENUM } from '@/enums/roles-enum';
import { BooleanOptionModel } from '@/models/shared/boolean-option';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-add-new-employee-popup',
  imports: [
    Select,
    DatePickerModule,
    InputTextModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RequiredMarkerDirective,
    TranslatePipe,
    ValidationMessagesComponent,
    PasswordModule,
  ],
  templateUrl: './add-new-employee-popup.component.html',
  styleUrl: './add-new-employee-popup.component.scss',
})
export class AddNewEmployeePopupComponent extends BasePopupComponent<User> implements OnInit {
  declare model: User;
  declare form: FormGroup;
  declare viewMode: ViewModeEnum;
  alertService = inject(AlertService);
  service = inject(UserService);
  fb = inject(FormBuilder);
  isCreateMode = false;

  departments: BaseLookupModel[] = [];
  cities: CityLookup[] = [];
  regions: BaseLookupModel[] = [];

  accountStatusOptions: AccountStatusOption[] = ACCOUNT_STATUS_OPTIONS;
  fingerprintExemptionOptions: BooleanOptionModel[] = FINGERPRINT_EXEMPTION_OPTIONS;

  selectedDepartment: BaseLookupModel | undefined;
  selectedAccountStatus: AccountStatusOption | undefined;
  date2: Date | undefined;

  filteredCities: CityLookup[] = [];

  // Role mapping properties
  roleStates = {
    isEmployee: false,
    isSysAdmin: false,
    isDeptManager: false,
    isFollowUp: false,
    isHR: false,
    isSecurityMember: false,
    isSecurityLeader: false,
    isComplianceOfficer: false,
  };

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    super();
  }

  get langOptionLabel(): string {
    const lang = this.languageService.getCurrentLanguage();
    return lang === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }

  // Form control getters
  get regionControl() {
    return this.form.get('fkRegionId') as FormControl;
  }

  get cityControl() {
    return this.form.get('fkCityId') as FormControl;
  }

  get fullNameArControl() {
    return this.form.get('fullNameAr') as FormControl;
  }

  get fullNameEnControl() {
    return this.form.get('fullNameEn') as FormControl;
  }

  get phoneNumberControl() {
    return this.form.get('phoneNumber') as FormControl;
  }

  get jobTitleArControl() {
    return this.form.get('jobTitleAr') as FormControl;
  }

  get jobTitleEnControl() {
    return this.form.get('jobTitleEn') as FormControl;
  }

  get emailControl() {
    return this.form.get('email') as FormControl;
  }

  get joinDateControl() {
    return this.form.get('joinDate') as FormControl;
  }

  get accountStatusControl() {
    return this.form.get('isActive') as FormControl;
  }

  get nationalIdControl() {
    return this.form.get('nationalId') as FormControl;
  }

  get activeDirectoryUsernameControl() {
    return this.form.get('activeDirectoryUsername') as FormControl;
  }

  get passwordControl() {
    return this.form.get('password') as FormControl;
  }

  override initPopup() {
    this.model = this.data.model;
    this.cities = this.data.lookups.cities;
    this.regions = this.data.lookups.regions;
    this.departments = this.data.lookups.departments;
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode == ViewModeEnum.CREATE;
    // Initialize filtered cities based on current region selection
    this.initializeFilteredCities();

    // Initialize role states
    this.initializeRoleStates();
  }

  override prepareModel(model: User, form: FormGroup): User | Observable<User> {
    // Map the boolean values correctly
    const formValue = form.value;

    // Convert account status to boolean for isActive
    if (formValue.accountStatus !== undefined) {
      formValue.isActive = formValue.accountStatus;
    }

    // Prepare roleIds array based on selected roles
    const roleIds: string[] = [];
    if (this.roleStates.isEmployee) roleIds.push(ROLES_ENUM.EMPLOYEE);
    if (this.roleStates.isSysAdmin) roleIds.push(ROLES_ENUM.ADMIN);
    if (this.roleStates.isDeptManager) roleIds.push(ROLES_ENUM.DEPARTMENT_MANAGER);
    if (this.roleStates.isFollowUp) roleIds.push(ROLES_ENUM.FOLLOW_UP_OFFICER);
    if (this.roleStates.isHR) roleIds.push(ROLES_ENUM.HR_OFFICER);
    if (this.roleStates.isSecurityMember) roleIds.push(ROLES_ENUM.SECURITY_MEMBER);
    if (this.roleStates.isSecurityLeader) roleIds.push(ROLES_ENUM.SECURITY_LEADER);
    if (this.roleStates.isComplianceOfficer) roleIds.push(ROLES_ENUM.ATTENDANCE_COMPLIANCE_OFFICER);

    formValue.roleIds = roleIds;

    this.model = Object.assign(model, { ...formValue });
    return this.model;
  }

  override buildForm() {
    this.form = this.fb.group(this.model.buildForm(this.viewMode));

    // Set initial values if needed
    if (this.model.isActive !== undefined) {
      this.selectedAccountStatus = this.accountStatusOptions.find(
        (option) => option.id === this.model.isActive
      );
    }

    // Subscribe to region changes to filter cities
    this.form.get('fkRegionId')?.valueChanges.subscribe((regionId: number) => {
      this.onRegionChange(regionId);
    });
  }

  override saveFail(error: Error): void {}

  afterSave() {
    const successObject = { messages: ['COMMON.SAVED_SUCCESSFULLY'] };
    this.alertService.showSuccessMessage(successObject);
  }

  override beforeSave(model: User, form: FormGroup): Observable<boolean> | boolean {
    return form.valid;
  }

  // Handle region selection change
  onRegionChange(regionId: number): void {
    if (regionId) {
      // Filter cities based on selected region
      this.filteredCities = this.cities.filter((city) => city.regionId === regionId);

      // Clear city selection if the current city doesn't belong to the new region
      const currentCityId = this.form.get('fkCityId')?.value;
      if (currentCityId) {
        const currentCityBelongsToRegion = this.filteredCities.some(
          (city) => city.id === currentCityId
        );
        if (!currentCityBelongsToRegion) {
          this.form.get('fkCityId')?.setValue(null);
        }
      }
    } else {
      // Clear cities if no region is selected
      this.filteredCities = [];
      this.form.get('fkCityId')?.setValue(null);
    }
  }

  // Role checkbox change handlers
  onRoleChange(role: keyof typeof this.roleStates, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.roleStates[role] = checkbox.checked;
  }

  // Helper method to get display text for account status
  getAccountStatusText(isActive: boolean): string {
    const option = this.accountStatusOptions.find((opt) => opt.id === isActive);
    return option ? option.nameAr : '';
  }

  // Helper method to get display text for fingerprint exemption
  getFingerprintExemptionText(canLeave: boolean): string {
    const option = this.fingerprintExemptionOptions.find((opt) => opt.id === canLeave);
    return option ? option.nameAr : '';
  }

  // Initialize role states based on model's roleIds
  private initializeRoleStates(): void {
    if (this.model.roleIds) {
      this.roleStates.isEmployee = this.model.roleIds.includes(ROLES_ENUM.EMPLOYEE);
      this.roleStates.isSysAdmin = this.model.roleIds.includes(ROLES_ENUM.ADMIN);
      this.roleStates.isDeptManager = this.model.roleIds.includes(ROLES_ENUM.DEPARTMENT_MANAGER);
      this.roleStates.isFollowUp = this.model.roleIds.includes(ROLES_ENUM.FOLLOW_UP_OFFICER);
      this.roleStates.isHR = this.model.roleIds.includes(ROLES_ENUM.HR_OFFICER);
      this.roleStates.isSecurityMember = this.model.roleIds.includes(ROLES_ENUM.SECURITY_MEMBER);
      this.roleStates.isSecurityLeader = this.model.roleIds.includes(ROLES_ENUM.SECURITY_LEADER);
      this.roleStates.isComplianceOfficer = this.model.roleIds.includes(
        ROLES_ENUM.ATTENDANCE_COMPLIANCE_OFFICER
      );
    }
  }

  // Initialize filtered cities based on current region selection
  private initializeFilteredCities(): void {
    const currentRegionId = this.model.fkRegionId;
    if (currentRegionId) {
      this.filteredCities = this.cities.filter((city) => city.regionId === currentRegionId);
    } else {
      this.filteredCities = [];
    }
  }
}
