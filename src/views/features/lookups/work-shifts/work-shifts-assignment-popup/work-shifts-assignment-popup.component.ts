import { ChangeDetectorRef, Component, Inject, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { LanguageService } from '@/services/shared/language.service';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';

import { distinctUntilChanged, Observable } from 'rxjs';
import { AlertService } from '@/services/shared/alert.service';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { TranslatePipe } from '@ngx-translate/core';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import Shift from '@/models/features/lookups/work-shifts/shift';
import { WeekDaysEnum } from '@/enums/week-days-enum';
import { shiftingPeriodMaxOneYearValidator, weekDays } from '@/utils/general-helper';
import { WorkDaysSetting } from '@/models/features/setting/work-days-setting';
import { UserWorkShiftService } from '@/services/features/lookups/user-workshift.service';
import { PaginationParams } from '@/models/shared/pagination-params';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { RotationGroup } from '@/models/features/lookups/work-shifts/rotation-group';
import UserWorkShift from '@/models/features/lookups/work-shifts/user-work-shifts';
import { WorkShiftType } from '@/enums/work-shift-type';
import { ShiftAssignmentPanelComponent } from './shift-assignment-panel/shift-assignment-panel.component';
import { RequiredMarkerDirective } from '../../../../../directives/required-marker.directive';
import { AuthService } from '@/services/auth/auth.service';
import { CustomValidators } from '@/validators/custom-validators';
import { getLocalizedName } from '@/utils/localized-name';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

/** Cycle length used by WeekOnWeekOff assignments created before the duration was configurable. */
const LEGACY_WEEK_ON_WEEK_OFF_DAYS = 14;

@Component({
  selector: 'app-work-shifts-assignment-popup',
  imports: [
    CommonModule,
    Select,
    DatePickerModule,
    ReactiveFormsModule,
    TranslatePipe,
    ValidationMessagesComponent,
    InputNumberModule,
    InputTextModule,
    ShiftAssignmentPanelComponent,
    RequiredMarkerDirective,
    WithNameFallbackPipe,
  ],
  templateUrl: './work-shifts-assignment-popup.component.html',
  styleUrl: './work-shifts-assignment-popup.component.scss',
})
export class WorkShiftsAssignmentPopupComponent
  extends BasePopupComponent<UserWorkShift>
  implements OnInit
{
  model!: UserWorkShift;
  usersProfiles: UsersWithDepartmentLookup[] = [];
  workDays: WorkDaysSetting = new WorkDaysSetting();
  departments: BaseLookupModel[] = [];
  shifts: Shift[] = [];
  workShiftType = WorkShiftType;
  form!: FormGroup;
  viewMode!: ViewModeEnum;
  fb = inject(FormBuilder);
  alertService = inject(AlertService);
  langService = inject(LanguageService);
  isCreateMode = false;
  selectedWorkingDays: number[] = [];
  userWorkShiftService = inject(UserWorkShiftService);
  minEndDate: Date | null = null;
  maxStartDate: Date | null = null;
  previousStandardWorkingDays: number[] = [];
  allowedWeekDaysInRange: number[] = [];
  activeShift: number = 0;
  authService: AuthService = inject(AuthService);
  /** True while a save request is in flight; blocks a second request from a repeated click. */
  isSaving = false;

  // Single shift: tracks selected member IDs for the standard shift panel
  singleShiftMemberIds: number[] = [];

  // Rotating shifts: one RotationGroup per tab (periodOrder 0, 1, 2)
  rotationGroups: RotationGroup[] = [0, 1, 2].map((periodOrder) =>
    Object.assign(new RotationGroup(), { periodOrder, memberIds: [] })
  );

  // Persists dept selection per rotation group across tab switches
  rotationGroupDeptIds: Record<number, number[]> = { 0: [], 1: [], 2: [] };

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    super();
  }

  get isViewMode(): boolean {
    return this.viewMode === ViewModeEnum.VIEW;
  }

  get isHROfficer(): boolean {
    return this.authService.isHROfficer!;
  }

  override initPopup(): void {
    this.model = this.data.model || new UserWorkShift();
    // Work / rest cycle assignments saved before the duration was configurable ran on a
    // fixed 14-day cycle; show that value instead of an empty required field.
    if (
      this.model.workShiftType === WorkShiftType.WeekOnWeekOff &&
      this.model.legacyDaysCount == null &&
      this.viewMode !== ViewModeEnum.CREATE
    ) {
      this.model.legacyDaysCount = LEGACY_WEEK_ON_WEEK_OFF_DAYS;
    }
    this.usersProfiles = this.data.lookups?.usersProfiles || [];
    this.departments = this.data.lookups?.departments || [];
    this.shifts = this.data.lookups?.shifts || [];
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode === ViewModeEnum.CREATE;

    this.usersProfiles = this.sortByName(this.usersProfiles);
    this.departments = this.sortByName(this.departments);
    this.shifts = this.sortByName(this.shifts);

    this.singleShiftMemberIds = this.model.assignedUserIds || [];
    this.assignSelectedGroupsAndShiftsAndUsers();
    this.initializeSelectedWorkingDays();
  }

  assignSelectedGroupsAndShiftsAndUsers(): void {
    // Restore rotation groups from model in edit mode
    const savedGroups: RotationGroup[] = (this.model as any).rotationGroups || [];
    this.rotationGroups = [0, 1, 2].map((periodOrder) => {
      const saved = savedGroups.find((g) => g.periodOrder === periodOrder);
      return Object.assign(new RotationGroup(), {
        periodOrder,
        memberIds: saved?.memberIds || [],
        fkShiftId: saved?.fkShiftId,
      });
    });
  }

  private initializeSelectedWorkingDays(): void {
    this.selectedWorkingDays = [];

    if (this.model.employeeWorkingDays) {
      this.selectedWorkingDays = this.model.employeeWorkingDays
        .split(',')
        .map((day) => parseInt(day.trim(), 10))
        .filter((day) => !isNaN(day));
    } else if (this.workDays) {
      const mapping: { [key: string]: WeekDaysEnum } = {
        saturday: WeekDaysEnum.SATURDAY,
        sunday: WeekDaysEnum.SUNDAY,
        monday: WeekDaysEnum.MONDAY,
        tuesday: WeekDaysEnum.TUESDAY,
        wednesday: WeekDaysEnum.WEDNESDAY,
        thursday: WeekDaysEnum.THURSDAY,
        friday: WeekDaysEnum.FRIDAY,
      };

      this.selectedWorkingDays = Object.entries(mapping)
        .filter(([key]) => (this.workDays as any)[key])
        .map(([, value]) => value);
    }

    this.selectedWorkingDays.sort((a, b) => a - b);
    this.previousStandardWorkingDays = [...this.selectedWorkingDays];
  }

  override buildForm(): void {
    this.form = this.fb.group({
      ...this.model.buildForm(),
      fkShiftId: [this.model.fkShiftId ?? null, []], // not required in this popup
      employeeWorkingDays: [this.selectedWorkingDays.join(','), [this.validateWorkingDays()]],
      userIdsArray: [this.singleShiftMemberIds, [Validators.required]],
      shift1: [this.rotationGroups[0].fkShiftId ?? null],
      shift2: [this.rotationGroups[1].fkShiftId ?? null],
      shift3: [this.rotationGroups[2].fkShiftId ?? null],
    });

    // Link shift dropdowns → rotationGroups, and cross-validate siblings for duplicates
    const shiftNames = ['shift1', 'shift2', 'shift3'] as const;
    shiftNames.forEach((controlName, periodOrder) => {
      this.form.get(controlName)?.valueChanges.subscribe((shiftId) => {
        this.rotationGroups[periodOrder].fkShiftId = shiftId;
        shiftNames
          .filter((n) => n !== controlName)
          .forEach((n) => this.form.get(n)?.updateValueAndValidity({ emitEvent: false }));
      });
    });

    this.form
      .get('workShiftType')
      ?.valueChanges.pipe(distinctUntilChanged())
      .subscribe((type) => {
        this.onWorkShiftTypeChange(type);
      });

    // Must run before setDropdownValues so dates are not yet in the form.
    // If dates are present, validateAndUpdateWorkingDays filters the saved
    // working days against the date range, which clears them in edit mode.
    this.onWorkShiftTypeChange(this.form.get('workShiftType')?.value);

    this.setDropdownValues();
    this.updateDateConstraints();
    this.refreshAllowedWeekDays(
      (this.form.get('startDate')?.value as Date | null) ?? null,
      (this.form.get('endDate')?.value as Date | null) ?? null
    );

    if (this.isViewMode) {
      this.form.disable();
    }
  }

  private setDropdownValues(): void {
    if (!this.isCreateMode) {
      const shiftId = this.model.fkShiftId ?? (this.model as any).shiftDetails?.id;
      if (shiftId) {
        this.form.get('fkShiftId')?.setValue(shiftId);
      }
      this.form.get('workShiftType')?.setValue(this.model.workShiftType);
      if (this.model.presenceInquiryTime) {
        this.form
          .get('presenceInquiryTime')
          ?.setValue(new Date('1970-01-01T' + this.model.presenceInquiryTime));
      }
      if (this.model.startDate) {
        const startDate =
          typeof this.model.startDate === 'string'
            ? new Date(this.model.startDate)
            : this.model.startDate;
        this.form.get('startDate')?.setValue(startDate);
      }
      if (this.model.endDate) {
        const endDate =
          typeof this.model.endDate === 'string'
            ? new Date(this.model.endDate)
            : this.model.endDate;
        this.form.get('endDate')?.setValue(endDate);
      }

      this.refreshAllowedWeekDays(
        (this.form.get('startDate')?.value as Date | null) ?? null,
        (this.form.get('endDate')?.value as Date | null) ?? null
      );
    }
  }

  // Called by single shift panel when selection changes
  onSingleShiftMembersChange(memberIds: number[]): void {
    this.singleShiftMemberIds = memberIds;
    this.form.get('userIdsArray')?.setValue(memberIds);
    this.form.get('userIdsArray')?.markAsTouched();
  }

  // Called by each rotating shift panel when selection changes
  onRotationGroupMembersChange(periodOrder: number, memberIds: number[]): void {
    this.rotationGroups[periodOrder].memberIds = memberIds;
  }

  onRotationGroupDeptsChange(periodOrder: number, deptIds: number[]): void {
    this.rotationGroupDeptIds[periodOrder] = deptIds;
  }

  getRotationGroup(periodOrder: number): RotationGroup {
    return this.rotationGroups[periodOrder];
  }

  getRotationShift(periodOrder: number): Shift | undefined {
    const controlName = ['shift1', 'shift2', 'shift3'][periodOrder];
    const shiftId = this.form?.get(controlName)?.value;
    return this.shifts.find((s) => s.id === shiftId);
  }

  onWorkingDayChange(dayValue: number, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (isChecked) {
      if (!this.selectedWorkingDays.includes(dayValue)) {
        this.selectedWorkingDays.push(dayValue);
      }
    } else {
      this.selectedWorkingDays = this.selectedWorkingDays.filter((day) => day !== dayValue);
    }

    this.selectedWorkingDays.sort();
    this.updateEmployeeWorkingDaysInForm();
    this.form.get('employeeWorkingDays')?.markAsTouched();
    this.previousStandardWorkingDays = [...this.selectedWorkingDays];
  }

  private validateWorkingDays(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value || '';
      const selectedDays = value.split(',').filter((day: string) => day.trim() !== '');
      return selectedDays.length === 0 ? { required: true } : null;
    };
  }

  private updateEmployeeWorkingDaysInForm(): void {
    const workingDaysString = this.selectedWorkingDays.join(',');
    this.form.get('employeeWorkingDays')?.setValue(workingDaysString);
    this.form.get('employeeWorkingDays')?.updateValueAndValidity();
  }

  onSaveClick(): void {
    if (this.isSaving) return;

    Object.values(this.form.controls).forEach((ctrl) => {
      ctrl.markAsTouched();
      ctrl.updateValueAndValidity();
    });

    // Check the employees even when other fields are invalid: an empty selection would otherwise
    // only show the generic "required" text instead of the BRD's "assign at least one employee".
    const hasEmployees = this.validateEmployeeSelection();
    if (!this.form.valid || !hasEmployees) return;

    const formValue = this.form.value;

    // The global error interceptor shows the failure; re-enable Save so the user can retry.
    const onError = () => (this.isSaving = false);
    this.isSaving = true;

    if (this.model.id) {
      this.prepareModel(this.model, this.form);
      this.userWorkShiftService.update(this.model).subscribe({
        next: () => this.onSaved(this.model),
        error: onError,
      });
    } else {
      const newModel = new UserWorkShift();
      this.prepareModel(newModel, this.form);
      if (!this.isRotatingType) {
        newModel.assignedUserIds = formValue.userIdsArray || [];
      }
      this.userWorkShiftService.assignUserShift(newModel).subscribe({
        next: () => this.onSaved(newModel),
        error: onError,
      });
    }
  }

  /** Confirms a successful create / edit (BRD section 4: "Saved successfully") and closes. */
  private onSaved(model: UserWorkShift): void {
    this.afterSave(model, this.dialogRef);
    this.dialogRef.close(DIALOG_ENUM.OK);
  }

  private validateEmployeeSelection(): boolean {
    if (this.isRotatingType) {
      const hasAnyEmployee = this.rotationGroups.some((g) => g.memberIds.length > 0);
      if (!hasAnyEmployee) {
        this.alertService.showErrorMessage({
          messages: ['USER_WORK_SHIFT_ASSIGNMENT.AT_LEAST_ONE_EMPLOYEE_ONE_SHIFT'],
        });
        return false;
      }
    } else if (this.isSingleShiftType && this.singleShiftMemberIds.length === 0) {
      this.alertService.showErrorMessage({
        messages: ['USER_WORK_SHIFT_ASSIGNMENT.AT_LEAST_ONE_EMPLOYEE_EACH_SHIFT'],
      });
      return false;
    }
    return true;
  }

  isWorkingDaySelected(dayValue: number): boolean {
    return this.selectedWorkingDays.includes(dayValue);
  }

  isWeekDayDisabled(dayValue: number): boolean {
    const currentType = this.form.get('workShiftType')?.value;
    if (
      currentType === WorkShiftType.WeekOnWeekOff ||
      currentType === WorkShiftType.WeekOnWeekOff24
    ) {
      return true;
    }

    const startDate = this.form.get('startDate')?.value;
    const endDate = this.form.get('endDate')?.value;

    if (!startDate || !endDate) return false;

    return !this.getAllowedWeekDaysInRange(startDate, endDate).includes(dayValue);
  }

  private getAllowedWeekDaysInRange(startDate: Date, endDate: Date): number[] {
    const allowedDays = new Set<number>();
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    currentDate.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    while (currentDate <= end) {
      allowedDays.add(currentDate.getDay());
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return Array.from(allowedDays);
  }

  override saveFail(error: Error): void {}

  override afterSave(model: UserWorkShift, dialogRef: MatDialogRef<any, any>): void {
    const successObject = { messages: ['COMMON.SAVED_SUCCESSFULLY'] };
    this.alertService.showSuccessMessage(successObject);
  }

  override beforeSave(model: UserWorkShift, form: FormGroup): Observable<boolean> | boolean {
    return form.valid;
  }

  override prepareModel(
    model: UserWorkShift,
    form: FormGroup
  ): UserWorkShift | Observable<UserWorkShift> {
    const formValue = form.value;

    model.startDate = formValue.startDate;
    model.endDate = formValue.endDate;
    model.employeeWorkingDays = formValue.employeeWorkingDays;
    model.workShiftType = formValue.workShiftType;

    if (formValue.presenceInquiryTime instanceof Date) {
      const time = formValue.presenceInquiryTime;
      model.presenceInquiryTime = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:00`;
    } else {
      model.presenceInquiryTime = formValue.presenceInquiryTime;
    }
    model.presenceInquiryBuffer = formValue.presenceInquiryBuffer;
    model.legacyDaysCount = formValue.legacyDaysCount;

    const userIds = formValue.userIdsArray || [];
    model.fkAssignedUserId = userIds.length > 0 ? userIds[0] : null;
    model.assignedUserIds = userIds;
    model.fkShiftId = formValue.fkShiftId;

    (model as any).rotationGroups = this.rotationGroups.map((g) => ({
      memberIds: g.memberIds,
      periodOrder: g.periodOrder,
      fkShiftId: g.fkShiftId,
    }));

    return model;
  }

  private sortByName<T extends { nameAr?: string; nameEn?: string }>(arr: T[]): T[] {
    const lang = this.getCurrentLanguage();
    return [...arr].sort((a, b) =>
      getLocalizedName(a, lang).localeCompare(getLocalizedName(b, lang), undefined, {
        sensitivity: 'base',
      })
    );
  }

  getCurrentLanguage() {
    return this.langService.getCurrentLanguage();
  }

  get optionLabel(): string {
    return this.getCurrentLanguage() === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }

  get currentLang(): string {
    return this.getCurrentLanguage();
  }

  onStartDateSelect(selectedDate: Date): void {
    const newStartDate = selectedDate ?? null;
    this.minEndDate = newStartDate ? new Date(newStartDate) : null;

    const endDate = (this.form.get('endDate')?.value as Date | null) ?? null;
    if (newStartDate && endDate && new Date(endDate) < newStartDate) {
      this.form.get('endDate')?.setValue(null);
    }

    const effectiveEndDate =
      newStartDate && endDate && new Date(endDate) < newStartDate ? null : endDate;

    this.refreshAllowedWeekDays(newStartDate, effectiveEndDate);
    this.validateAndUpdateWorkingDays_WithDates(newStartDate, effectiveEndDate);
    this.form.get('endDate')?.updateValueAndValidity();
  }

  onEndDateSelect(selectedDate: Date): void {
    const newEndDate = selectedDate ?? null;
    this.maxStartDate = newEndDate ? new Date(newEndDate) : null;

    const startDate = (this.form.get('startDate')?.value as Date | null) ?? null;
    if (newEndDate && startDate && new Date(startDate) > newEndDate) {
      this.form.get('startDate')?.setValue(null);
    }

    const effectiveStartDate =
      newEndDate && startDate && new Date(startDate) > newEndDate ? null : startDate;

    this.refreshAllowedWeekDays(effectiveStartDate, newEndDate);
    this.validateAndUpdateWorkingDays_WithDates(effectiveStartDate, newEndDate);
  }

  private validateAndUpdateWorkingDays_WithDates(
    startDate: Date | null,
    endDate: Date | null
  ): void {
    if (!startDate || !endDate) return;

    const allowedDays = this.getAllowedWeekDaysInRange(startDate, endDate);
    this.selectedWorkingDays = this.selectedWorkingDays.filter((day) => allowedDays.includes(day));
    this.updateEmployeeWorkingDaysInForm();
  }

  private refreshAllowedWeekDays(startDate: Date | null, endDate: Date | null): void {
    if (!startDate || !endDate) {
      this.allowedWeekDaysInRange = [];
      return;
    }
    this.allowedWeekDaysInRange = this.getAllowedWeekDaysInRange(startDate, endDate);
  }

  onWorkShiftTypeChange(type: WorkShiftType): void {
    const isStandard = type === WorkShiftType.Standard;
    const isWeekOnOff = type === WorkShiftType.WeekOnWeekOff;
    const isWeekOnOff24 = type === WorkShiftType.WeekOnWeekOff24;
    const isRotating = type === WorkShiftType.Rotating;
    const isSingle = isStandard || isWeekOnOff || isWeekOnOff24;

    // Working days: shown and required only for Standard
    const workingDaysCtrl = this.form.get('employeeWorkingDays');
    if (isStandard) {
      workingDaysCtrl?.setValidators([this.validateWorkingDays()]);
      this.selectedWorkingDays = [...this.previousStandardWorkingDays];
      this.validateAndUpdateWorkingDays();
      this.updateEmployeeWorkingDaysInForm();
    } else {
      workingDaysCtrl?.clearValidators();
    }
    workingDaysCtrl?.updateValueAndValidity();

    // Presence fields: shown and required only for WeekOnWeekOff24
    const presenceTimeCtrl = this.form.get('presenceInquiryTime');
    const presenceBufferCtrl = this.form.get('presenceInquiryBuffer');
    if (isWeekOnOff24) {
      presenceTimeCtrl?.setValidators([Validators.required]);
      presenceBufferCtrl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      presenceTimeCtrl?.clearValidators();
      presenceTimeCtrl?.setValue(null);
      presenceBufferCtrl?.clearValidators();
      presenceBufferCtrl?.setValue(null);
    }
    presenceTimeCtrl?.updateValueAndValidity();
    presenceBufferCtrl?.updateValueAndValidity();

    // Shift / rest duration: shown and required for the cycle based types
    const legacyDaysCountCtrl = this.form.get('legacyDaysCount');
    if (isRotating || isWeekOnOff || isWeekOnOff24) {
      legacyDaysCountCtrl?.setValidators([
        Validators.required,
        CustomValidators.shiftCycleDaysRange(1, 30),
        CustomValidators.integerNumber(),
      ]);
    } else {
      legacyDaysCountCtrl?.clearValidators();
      legacyDaysCountCtrl?.setValue(null, { emitEvent: false });
    }
    legacyDaysCountCtrl?.updateValueAndValidity();

    // Rotating shift dropdowns: required and must be unique when Rotating type
    (['shift1', 'shift2', 'shift3'] as const).forEach((name) => {
      const ctrl = this.form.get(name);
      if (isRotating) {
        ctrl?.setValidators([Validators.required, this.uniqueShiftValidator(name)]);
      } else {
        ctrl?.clearValidators();
      }
      ctrl?.updateValueAndValidity({ emitEvent: false });
    });

    // Shift selection: required when the upper section is visible
    const fkShiftIdCtrl = this.form.get('fkShiftId');
    isSingle
      ? fkShiftIdCtrl?.setValidators([Validators.required])
      : fkShiftIdCtrl?.clearValidators();
    fkShiftIdCtrl?.updateValueAndValidity();

    // Employee selection: required when the upper section is visible
    const userIdsCtrl = this.form.get('userIdsArray');
    isSingle ? userIdsCtrl?.setValidators([Validators.required]) : userIdsCtrl?.clearValidators();
    userIdsCtrl?.updateValueAndValidity();

    const endDateCtrl = this.form.get('endDate');
    endDateCtrl?.setValidators([
      Validators.required,
      shiftingPeriodMaxOneYearValidator(() => this.form?.get('startDate')?.value ?? null),
    ]);
    endDateCtrl?.updateValueAndValidity();
  }

  private validateAndUpdateWorkingDays(): void {
    const startDate = this.form.get('startDate')?.value;
    const endDate = this.form.get('endDate')?.value;

    if (startDate && endDate) {
      const allowedDays = this.getAllowedWeekDaysInRange(startDate, endDate);
      this.selectedWorkingDays = this.selectedWorkingDays.filter((day) =>
        allowedDays.includes(day)
      );
      this.updateEmployeeWorkingDaysInForm();
    }
  }

  private updateDateConstraints(): void {
    const startDate = this.form.get('startDate')?.value;
    const endDate = this.form.get('endDate')?.value;
    if (startDate) this.minEndDate = new Date(startDate);
    if (endDate) this.maxStartDate = new Date(endDate);
  }

  private uniqueShiftValidator(ownName: string): ValidatorFn {
    return (): ValidationErrors | null => {
      if (!this.form) return null;
      const ownValue = this.form.get(ownName)?.value;
      if (ownValue == null) return null;
      const hasDuplicate = ['shift1', 'shift2', 'shift3']
        .filter((n) => n !== ownName)
        .some((n) => this.form.get(n)?.value === ownValue);
      return hasDuplicate ? { duplicateShift: true } : null;
    };
  }

  getOccupiedMemberIds(periodOrder: number): number[] {
    return this.rotationGroups
      .filter((g) => g.periodOrder !== periodOrder)
      .flatMap((g) => g.memberIds);
  }

  get fkShiftIdControl() {
    return this.form.get('fkShiftId') as FormControl;
  }
  get shift1Control() {
    return this.form.get('shift1') as FormControl;
  }
  get shift2Control() {
    return this.form.get('shift2') as FormControl;
  }
  get shift3Control() {
    return this.form.get('shift3') as FormControl;
  }
  get startDateControl() {
    return this.form.get('startDate') as FormControl;
  }
  get endDateControl() {
    return this.form.get('endDate') as FormControl;
  }
  get userIdsArrayControl() {
    return this.form.get('userIdsArray') as FormControl;
  }
  get employeeWorkingDaysControl() {
    return this.form.get('employeeWorkingDays') as FormControl;
  }
  get presenceInquiryTimeControl() {
    return this.form.get('presenceInquiryTime') as FormControl;
  }
  get presenceInquiryBufferControl() {
    return this.form.get('presenceInquiryBuffer') as FormControl;
  }
  get workShiftTypeControl() {
    return this.form.get('workShiftType') as FormControl;
  }
  get legacyDaysCountControl() {
    return this.form.get('legacyDaysCount') as FormControl;
  }

  get isSingleShiftType(): boolean {
    const type = this.form?.get('workShiftType')?.value;
    return (
      type === WorkShiftType.Standard ||
      type === WorkShiftType.WeekOnWeekOff ||
      type === WorkShiftType.WeekOnWeekOff24
    );
  }

  /** One fixed shift that alternates between a work period and a rest period of equal length. */
  get isFixedCycleType(): boolean {
    const type = this.form?.get('workShiftType')?.value;
    return type === WorkShiftType.WeekOnWeekOff || type === WorkShiftType.WeekOnWeekOff24;
  }

  /** Valid duration entered in the shift / rest duration field, or null. */
  get cycleDays(): number | null {
    const ctrl = this.form?.get('legacyDaysCount');
    const value = Number(ctrl?.value);
    return ctrl?.value != null && ctrl.value !== '' && ctrl.valid && Number.isInteger(value)
      ? value
      : null;
  }

  /**
   * The duration is a whole number of days. A number input also accepts "e", "+", "-" and ".",
   * and the browser turns "1e1" into 10 before the form sees it, so block those characters.
   */
  allowDigitKeysOnly(event: KeyboardEvent): void {
    const isCharacter = event.key.length === 1;
    if (isCharacter && !event.ctrlKey && !event.metaKey && !/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  allowDigitTextOnly(event: Event, data: DataTransfer | null): void {
    const text = data?.getData('text') ?? '';
    if (!/^[0-9]+$/.test(text.trim())) {
      event.preventDefault();
    }
  }

  /**
   * Translation key of the work / rest hint for the entered duration. Arabic and English need a
   * different wording per CLDR plural category (e.g. "يومان" for 2, "أيام" for 3-10, "يومًا" for
   * 11-99), so each category has its own key.
   */
  get cycleSummaryKey(): string {
    const category = new Intl.PluralRules(this.getCurrentLanguage()).select(this.cycleDays ?? 0);
    const suffix = ['one', 'two', 'few', 'many'].includes(category)
      ? category.toUpperCase()
      : 'OTHER';
    return `USER_WORK_SHIFT_ASSIGNMENT.WORK_REST_CYCLE_SUMMARY_${suffix}`;
  }

  get isRotatingType(): boolean {
    return this.form?.get('workShiftType')?.value === WorkShiftType.Rotating;
  }

  get showWorkingDays(): boolean {
    return this.form?.get('workShiftType')?.value === WorkShiftType.Standard;
  }

  get showPresenceFields(): boolean {
    return this.form?.get('workShiftType')?.value === WorkShiftType.WeekOnWeekOff24;
  }

  get showShiftPeriodDuration(): boolean {
    return this.isRotatingType || this.isFixedCycleType;
  }

  weekDays = weekDays;

  getSelectedShiftObject(controlName: string) {
    let control = this.form?.get(controlName);
    return this.shifts.find((x) => x.id == control?.value);
  }

  getSortedShiftsNames(order: number): string {
    const lang = this.getCurrentLanguage();
    const shiftIds = [1, 2, 3].map((i) => this.form.get(`shift${i}`)?.value);
    const rotated = [0, 1, 2].map((i) => shiftIds[(order + i) % 3]);

    return rotated
      .map((id) => {
        const shift = this.shifts.find((s) => s.id === id);
        return shift ? getLocalizedName(shift, lang) || '-' : '-';
      })
      .join(',');
  }
}
