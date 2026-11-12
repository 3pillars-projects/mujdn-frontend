import { Component, Inject, inject, OnInit } from '@angular/core';
import { LAYOUT_DIRECTION_ENUM } from '@/enums/layout-direction-enum';
import { LanguageService } from '@/services/shared/language.service';
import { DialogRef } from '@angular/cdk/dialog';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { User } from '@/models/auth/user';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Observable, of } from 'rxjs';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { AlertService } from '@/services/shared/alert.service';
import { UserService } from '@/services/features/user.service';
import { ROLES_ENUM } from '@/enums/roles-enum';
import { TranslatePipe } from '@ngx-translate/core';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { UpdateRolesModel } from '@/models/auth/update-roles-model';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-employee-permission-popup',
  imports: [FormsModule, ReactiveFormsModule, TranslatePipe, InputTextModule],
  templateUrl: './employee-permission-popup.component.html',
  styleUrl: './employee-permission-popup.component.scss',
})
export class EmployeePermissionPopupComponent extends BasePopupComponent<User> implements OnInit {
  declare model: User;
  declare form: FormGroup;
  declare viewMode: ViewModeEnum;
  alertService = inject(AlertService);
  userService = inject(UserService);
  fb = inject(FormBuilder);
  isCreateMode = false;

  // Role mapping properties
  roleStates = {
    isEmployee: true,
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

  // Form control getters
  get isEmployeeControl() {
    return this.form.get('isEmployee') as FormControl;
  }

  get isSysAdminControl() {
    return this.form.get('isSysAdmin') as FormControl;
  }

  get isDeptManagerControl() {
    return this.form.get('isDeptManager') as FormControl;
  }

  get isFollowUpControl() {
    return this.form.get('isFollowUp') as FormControl;
  }

  get isHRControl() {
    return this.form.get('isHR') as FormControl;
  }

  get isSecurityMemberControl() {
    return this.form.get('isSecurityMember') as FormControl;
  }

  get isSecurityLeaderControl() {
    return this.form.get('isSecurityLeader') as FormControl;
  }

  get isComplianceOfficerControl() {
    return this.form.get('isComplianceOfficer') as FormControl;
  }

  // Helper method to get department name based on current language
  get departmentName(): string {
    if (!this.model.department) return '';
    const lang = this.languageService.getCurrentLanguage();
    return lang === LANGUAGE_ENUM.ARABIC
      ? this.model.department.nameAr || ''
      : this.model.department.nameEn || '';
  }

  override initPopup(): void {
    this.model = this.data.model;
    // Initialize role states based on model's roleIds
    this.initializeRoleStates();
  }

  override buildForm(): void {
    this.form = this.fb.group({
      roleIds: [this.model.roleIds || []],
      isEmployee: [{ value: this.roleStates.isEmployee, disabled: true }],
      isSysAdmin: [this.roleStates.isSysAdmin],
      isDeptManager: [this.roleStates.isDeptManager],
      isFollowUp: [this.roleStates.isFollowUp],
      isHR: [this.roleStates.isHR],
      isSecurityMember: [this.roleStates.isSecurityMember],
      isSecurityLeader: [this.roleStates.isSecurityLeader],
      isComplianceOfficer: [this.roleStates.isComplianceOfficer],
    });

    // Subscribe to checkbox changes to update roleStates
    this.setupRoleChangeSubscriptions();
  }

  override saveFail(error: Error): void {
    console.error('Save failed:', error);
    const errorObject = { messages: ['COMMON.SAVE_FAILED'] };
    this.alertService.showErrorMessage(errorObject);
  }

  override afterSave(): void {
    const successObject = { messages: ['COMMON.SAVED_SUCCESSFULLY'] };
    this.alertService.showSuccessMessage(successObject);
  }

  override beforeSave(model: User, form: FormGroup): Observable<boolean> | boolean {
    return form.valid;
  }

  override prepareModel(model: User, form: FormGroup): User | Observable<User> {
    const formValue = form.value;

    // Prepare roleIds array based on selected roles
    const roleIds: string[] = [];
    if (formValue.isEmployee) roleIds.push(ROLES_ENUM.EMPLOYEE);
    if (formValue.isSysAdmin) roleIds.push(ROLES_ENUM.ADMIN);
    if (formValue.isDeptManager) roleIds.push(ROLES_ENUM.DEPARTMENT_MANAGER);
    if (formValue.isFollowUp) roleIds.push(ROLES_ENUM.FOLLOW_UP_OFFICER);
    if (formValue.isHR) roleIds.push(ROLES_ENUM.HR_OFFICER);
    if (formValue.isSecurityMember) roleIds.push(ROLES_ENUM.SECURITY_MEMBER);
    if (formValue.isSecurityLeader) roleIds.push(ROLES_ENUM.SECURITY_LEADER);
    if (formValue.isComplianceOfficer) roleIds.push(ROLES_ENUM.ATTENDANCE_COMPLIANCE_OFFICER);

    // Update model with new roleIds
    this.model.roleIds = roleIds;

    return this.model;
  }

  // Custom save method that uses the updateUserRoles service method
  saveUserRoles(): void {
    if (!this.form.valid) {
      return;
    }

    const formValue = this.form.value;
    const roleIds: string[] = [];

    // Build roleIds array from form values
    roleIds.push(ROLES_ENUM.EMPLOYEE);
    if (formValue.isSysAdmin) roleIds.push(ROLES_ENUM.ADMIN);
    if (formValue.isDeptManager) roleIds.push(ROLES_ENUM.DEPARTMENT_MANAGER);
    if (formValue.isFollowUp) roleIds.push(ROLES_ENUM.FOLLOW_UP_OFFICER);
    if (formValue.isHR) roleIds.push(ROLES_ENUM.HR_OFFICER);
    if (formValue.isSecurityMember) roleIds.push(ROLES_ENUM.SECURITY_MEMBER);
    if (formValue.isSecurityLeader) roleIds.push(ROLES_ENUM.SECURITY_LEADER);
    if (formValue.isComplianceOfficer) roleIds.push(ROLES_ENUM.ATTENDANCE_COMPLIANCE_OFFICER);

    // user update role object
    const data: UpdateRolesModel = {
      id: this.model.id!,
      roleIds: roleIds,
      concurrencyUpdateVersion: this.model.concurrencyUpdateVersion,
    };
    this.userService.updateUserRoles(data).subscribe((res: UpdateRolesModel) => {
      this.afterSave();
      this.dialogRef.close(DIALOG_ENUM.OK);
    });
  }

  // Initialize role states based on model's roleIds
  private initializeRoleStates(): void {
    if (this.model.roleIds && Array.isArray(this.model.roleIds)) {
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

  // Setup subscriptions for role checkbox changes
  private setupRoleChangeSubscriptions(): void {
    // Subscribe to individual role changes
    this.form.get('isEmployee')?.valueChanges.subscribe((value) => {
      this.roleStates.isEmployee = value;
    });

    this.form.get('isSysAdmin')?.valueChanges.subscribe((value) => {
      this.roleStates.isSysAdmin = value;
    });

    this.form.get('isDeptManager')?.valueChanges.subscribe((value) => {
      this.roleStates.isDeptManager = value;
    });

    this.form.get('isFollowUp')?.valueChanges.subscribe((value) => {
      this.roleStates.isFollowUp = value;
    });

    this.form.get('isHR')?.valueChanges.subscribe((value) => {
      this.roleStates.isHR = value;
    });

    this.form.get('isSecurityMember')?.valueChanges.subscribe((value) => {
      this.roleStates.isSecurityMember = value;
    });

    this.form.get('isSecurityLeader')?.valueChanges.subscribe((value) => {
      this.roleStates.isSecurityLeader = value;
    });

    this.form.get('isComplianceOfficer')?.valueChanges.subscribe((value) => {
      this.roleStates.isComplianceOfficer = value;
    });
  }
}
