import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { ValidationErrorKeyEnum } from '@/enums/validation-error-key-enum';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { TemporaryRoleAssignment } from '@/models/features/temporary-role-assignment/temporary-role-assignment';
import { TemporaryRoleAssignmentService } from '@/services/features/temporary-role-assignment.service';
import { AlertService } from '@/services/shared/alert.service';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { Component, Inject, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { DatePickerModule } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { RequiredMarkerDirective } from '../../../../directives/required-marker.directive';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

@Component({
  selector: 'app-temporary-role-assignment-popup',
  imports: [
    Select,
    DatePickerModule,
    ReactiveFormsModule,
    RequiredMarkerDirective,
    TranslatePipe,
    ValidationMessagesComponent,
    WithNameFallbackPipe,
  ],
  templateUrl: './temporary-role-assignment-popup.component.html',
  styleUrl: './temporary-role-assignment-popup.component.scss',
})
export class TemporaryRoleAssignmentPopupComponent
  extends BasePopupComponent<TemporaryRoleAssignment>
  implements OnInit
{
  declare model: TemporaryRoleAssignment;
  declare form: FormGroup;
  declare viewMode: ViewModeEnum;

  service = inject(TemporaryRoleAssignmentService);
  alertService = inject(AlertService);
  fb = inject(FormBuilder);

  employees: UsersWithDepartmentLookup[] = [];
  isCreateMode = false;
  isEditMode = false;
  dateFromMinDate = this.getToday();
  dateToMinDate: Date | null = null;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    super();
  }

  // ── Model date controls (carry the full datetime; sent to backend via interceptor) ──

  get employeeControl(): FormControl {
    return this.form.get('fkUserProfileId') as FormControl;
  }

  get dateFromControl(): FormControl {
    return this.form.get('dateFrom') as FormControl;
  }

  get dateToControl(): FormControl {
    return this.form.get('dateTo') as FormControl;
  }

  // ── UI-only time controls (spliced into date controls on every change) ────────────

  get timeFromControl(): FormControl {
    return this.form.get('timeFrom') as FormControl;
  }

  get timeToControl(): FormControl {
    return this.form.get('timeTo') as FormControl;
  }

  override initPopup(): void {
    this.model = this.data.model;
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode === ViewModeEnum.CREATE;
    this.isEditMode = this.viewMode === ViewModeEnum.EDIT;
    this.employees = this.data.lookups?.employees ?? [];
  }

  override buildForm(): void {
    this.form = this.fb.group(this.model.buildForm());

    this.applyDefaultTimes();
    this.applyEditabilityRules();
    this.setupDateValidation();
    this.setupDateTimeSync();
  }

  override saveFail(_: Error): void {}

  /**
   * dateFrom / dateTo already carry the correct full datetime because
   * spliceTimeIntoDate() kept them in sync as the user interacted.
   * We just strip the two UI-only time keys before the interceptor serialises
   * the model to the wire format.
   */
  override prepareModel(
    model: TemporaryRoleAssignment,
    form: FormGroup
  ): TemporaryRoleAssignment | Observable<TemporaryRoleAssignment> {
    const { timeFrom, timeTo, ...modelFields } = form.getRawValue();

    this.model = Object.assign(model, modelFields);
    return this.model;
  }

  beforeSave(_: TemporaryRoleAssignment, form: FormGroup): boolean {
    this.syncDateTimeControls();
    this.syncDateValidation();
    return form.valid;
  }

  afterSave() {
    this.alertService.showSuccessMessage({ messages: ['COMMON.SAVED_SUCCESSFULLY'] });
  }

  getPropertyName(): string {
    return this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH
      ? 'nameEn'
      : 'nameAr';
  }

  // ── Private helpers ───────────────────────────────────────────────────────────────

  /**
   * Seeds dateFrom/dateTo with the time already held in the timeFrom/timeTo controls
   * (either parsed from the stored model datetime, or the start/end-of-day defaults).
   */
  private applyDefaultTimes(): void {
    const raw = this.form.getRawValue();

    if (raw.dateFrom) {
      const merged = new Date(raw.dateFrom);
      const t = raw.timeFrom as Date;
      merged.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
      this.dateFromControl.setValue(merged, { emitEvent: false });
    }

    if (raw.dateTo) {
      const merged = new Date(raw.dateTo);
      const t = raw.timeTo as Date;
      merged.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
      this.dateToControl.setValue(merged, { emitEvent: false });
    }
  }

  private applyEditabilityRules(): void {
    if (this.model.isDateToOnlyEditable) {
      this.employeeControl.disable();
      this.dateFromControl.disable();
      this.timeFromControl.disable(); // keep time locked when date is locked
    }
  }

  /**
   * On every time-picker change, writes h/m/s into the corresponding date
   * control (emitEvent: true) so validation subscriptions fire automatically.
   */
  private setupDateTimeSync(): void {
    this.timeFromControl.valueChanges.subscribe((time: Date | null) => {
      this.spliceTimeIntoDate(this.dateFromControl, time);
    });

    this.timeToControl.valueChanges.subscribe((time: Date | null) => {
      this.spliceTimeIntoDate(this.dateToControl, time);
    });

    this.dateFromControl.valueChanges.subscribe(() => {
      this.spliceTimeIntoDate(this.dateFromControl, this.timeFromControl.getRawValue());
    });

    this.dateToControl.valueChanges.subscribe(() => {
      this.spliceTimeIntoDate(this.dateToControl, this.timeToControl.getRawValue());
    });
  }

  private spliceTimeIntoDate(dateControl: FormControl, time: Date | null): void {
    const rawDate = dateControl.getRawValue();
    if (!rawDate || !time) return;

    const current = new Date(rawDate);
    const merged = new Date(rawDate);
    merged.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), 0);

    if (current.getTime() === merged.getTime()) {
      return;
    }

    dateControl.setValue(merged, { emitEvent: true });
  }

  private syncDateTimeControls(): void {
    this.spliceTimeIntoDate(this.dateFromControl, this.timeFromControl.getRawValue());
    this.spliceTimeIntoDate(this.dateToControl, this.timeToControl.getRawValue());
  }

  private setupDateValidation(): void {
    this.updateDateToMinDate();
    this.syncDateValidation();

    this.dateFromControl.valueChanges.subscribe(() => {
      this.updateDateToMinDate();
      this.syncDateValidation();
    });

    this.dateToControl.valueChanges.subscribe(() => this.syncDateValidation());
  }

  private updateDateToMinDate(): void {
    if (this.model.isDateToOnlyEditable) {
      this.dateToMinDate = this.dateFromMinDate;
      return;
    }

    const dateFrom = this.normalizeDate(this.form.getRawValue().dateFrom);
    this.dateToMinDate =
      dateFrom && dateFrom > this.dateFromMinDate ? dateFrom : this.dateFromMinDate;
  }

  private syncDateValidation(): void {
    const rawDateFrom: Date | null = this.form.getRawValue().dateFrom
      ? new Date(this.form.getRawValue().dateFrom)
      : null;
    const rawDateTo: Date | null = this.form.getRawValue().dateTo
      ? new Date(this.form.getRawValue().dateTo)
      : null;

    const dateFromNormalized = this.normalizeDate(rawDateFrom);
    const dateToNormalized = this.normalizeDate(rawDateTo);

    // ── Past-date checks (calendar day only) ───────────────────────────────
    this.setControlError(
      this.dateFromControl,
      ValidationErrorKeyEnum.PAST_DATE,
      !this.model.isDateToOnlyEditable &&
        !!dateFromNormalized &&
        dateFromNormalized < this.dateFromMinDate
    );

    this.setControlError(
      this.dateToControl,
      ValidationErrorKeyEnum.PAST_DATE,
      !!dateToNormalized && dateToNormalized < this.dateFromMinDate
    );

    // ── Date-range check ───────────────────────────────────────────────────
    this.setControlError(
      this.dateToControl,
      ValidationErrorKeyEnum.START_AFTER_END,
      !!dateFromNormalized && !!dateToNormalized && dateToNormalized < dateFromNormalized
    );

    // ── Same-day time check: timeTo must be strictly after timeFrom ─────────
    const sameDay =
      !!dateFromNormalized &&
      !!dateToNormalized &&
      dateFromNormalized.getTime() === dateToNormalized.getTime();

    this.setControlError(
      this.timeToControl,
      ValidationErrorKeyEnum.TIME_FROM_AFTER_TIME_TO,
      sameDay && !!rawDateFrom && !!rawDateTo && rawDateTo <= rawDateFrom
    );
  }

  private setControlError(
    control: FormControl,
    errorKey: ValidationErrorKeyEnum,
    hasError: boolean
  ): void {
    const errors = { ...(control.errors ?? {}) };

    if (hasError) {
      control.setErrors({ ...errors, [errorKey]: true });
      return;
    }

    delete errors[errorKey];
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  /** Zeroes h/m/s — used for calendar-day comparisons ONLY. */
  private normalizeDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
}
