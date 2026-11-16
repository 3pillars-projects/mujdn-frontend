import { Component, Inject, inject, OnInit } from '@angular/core';
import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { AttendanceLog } from '@/models/features/attendance/attendance-log/attendance-log';
import { AttendanceService } from '@/services/features/attendance-log.service';
import { AlertService } from '@/services/shared/alert.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { RequiredMarkerDirective } from '../../../../directives/required-marker.directive';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { LanguageService } from '@/services/shared/language.service';
import { getLocalizedName } from '@/utils/localized-name';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

@Component({
  selector: 'app-attendance-log-popup',
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
    WithNameFallbackPipe,
  ],
  templateUrl: './attendance-log-popup.component.html',
  styleUrl: './attendance-log-popup.component.scss',
})
export class AttendanceLogPopupComponent
  extends BasePopupComponent<AttendanceLog>
  implements OnInit
{
  declare model: AttendanceLog;
  declare form: FormGroup;
  declare viewMode: ViewModeEnum;
  alertService = inject(AlertService);
  service = inject(AttendanceService);
  fb = inject(FormBuilder);
  isCreateMode = false;

  departments: BaseLookupModel[] = [];
  employees: UsersWithDepartmentLookup[] = [];
  filteredEmployees: UsersWithDepartmentLookup[] = [];
  langService = inject(LanguageService);

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    super();
  }

  get departmentControl() {
    return this.form.get('departmentId') as FormControl;
  }

  get employeeControl() {
    return this.form.get('employeeId') as FormControl;
  }

  get nationalIdControl() {
    return this.form.get('nationalId') as FormControl;
  }

  get selectedDateControl() {
    return this.form.get('selectedDate') as FormControl;
  }

  get selectedTimeControl() {
    return this.form.get('selectedTime') as FormControl;
  }

  get swipeTimeControl() {
    return this.form.get('swipeTime') as FormControl;
  }

  private sortByName<T extends BaseLookupModel>(arr: T[]): T[] {
    const language = this.getCurrentLanguage();
    return [...arr].sort((a, b) => {
      const nameA = getLocalizedName(a, language).toLowerCase();
      const nameB = getLocalizedName(b, language).toLowerCase();
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });
  }

  getCurrentLanguage() {
    return this.langService.getCurrentLanguage();
  }

  override initPopup() {
    this.model = this.data.model;
    this.departments = this.data.lookups?.departments ?? [];
    this.departments = this.sortByName(this.departments);
    this.employees = this.data.lookups?.employees ?? [];
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode == ViewModeEnum.CREATE;
    this.filteredEmployees = [];
    // Initialize form controls with existing data if in edit mode
    if (this.model.swipeTime) {
      const existingDateTime = new Date(this.model.swipeTime);
      this.model.selectedDate = existingDateTime;
      this.model.selectedTime = existingDateTime;
    }

    // Filter employees if department is already selected
    if (this.model.departmentId) {
      this.filterEmployeesByDepartment(this.model.departmentId);
    }
  }

  override saveFail(error: Error): void {
    this.alertService.showErrorMessage({ messages: ['COMMON.SAVE_FAILED'] });
  }

  override prepareModel(
    model: AttendanceLog,
    form: FormGroup
  ): AttendanceLog | Observable<AttendanceLog> {
    // Combine date and time into swipeTime
    const combinedDateTime = this.combineDateTimeLocalIso(
      form.get('selectedDate')?.value,
      form.get('selectedTime')?.value
    );

    // Get selected employee's national ID
    const selectedEmployee = this.employees.find((emp) => emp.id === form.get('employeeId')?.value);

    this.model = Object.assign(model, {
      departmentId: form.get('departmentId')?.value,
      employeeId: form.get('employeeId')?.value,
      nationalId: selectedEmployee?.nationalId || form.get('nationalId')?.value,
      swipeTime: combinedDateTime,
    });

    return this.model;
  }

  override buildForm() {
    this.form = this.fb.group(this.model.buildForm(this.viewMode));

    // Set up form subscriptions for reactive updates
    this.setupFormSubscriptions();
  }

  beforeSave(model: AttendanceLog, form: FormGroup): boolean {
    // Validate that both date and time are selected
    // if (!form.get('selectedDate')?.value || !form.get('selectedTime')?.value) {
    //   this.alertService.showErrorMessage({
    //     messages: ['ATTENDANCE_LOG_PAGE.DATE_TIME_REQUIRED'],
    //   });
    //   return false;
    // }

    // // Validate that department and employee are selected
    // if (!form.get('departmentId')?.value) {
    //   this.alertService.showErrorMessage({
    //     messages: ['ATTENDANCE_LOG_PAGE.DEPARTMENT_REQUIRED'],
    //   });
    //   return false;
    // }

    // if (!form.get('employeeId')?.value) {
    //   this.alertService.showErrorMessage({
    //     messages: ['ATTENDANCE_LOG_PAGE.EMPLOYEE_REQUIRED'],
    //   });
    //   return false;
    // }

    return form.valid;
  }

  afterSave() {
    const successObject = { messages: ['COMMON.SAVED_SUCCESSFULLY'] };
    this.alertService.showSuccessMessage(successObject);
  }

  getPropertyName(): string {
    return this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH
      ? 'nameEn'
      : 'nameAr';
  }

  // Public method to get filtered employees for template
  getFilteredEmployees(): UsersWithDepartmentLookup[] {
    return this.filteredEmployees;
  }

  private setupFormSubscriptions() {
    // Subscribe to department changes
    this.form.get('departmentId')?.valueChanges.subscribe((departmentId) => {
      if (departmentId) {
        this.filterEmployeesByDepartment(departmentId);
        // Clear employee selection when department changes
        this.form.get('employeeId')?.setValue(null);
        this.form.get('nationalId')?.setValue('');
      } else {
        this.filteredEmployees = [...this.employees];
      }
    });

    // Subscribe to employee changes
    this.form.get('employeeId')?.valueChanges.subscribe((employeeId) => {
      if (employeeId) {
        const selectedEmployee = this.employees.find((emp) => emp.id === employeeId);
        if (selectedEmployee) {
          this.form.get('nationalId')?.setValue(selectedEmployee.nationalId);
        }
      }
    });

    // Subscribe to date/time changes
    this.form.get('selectedDate')?.valueChanges.subscribe(() => {
      this.updateSwipeTime();
    });

    this.form.get('selectedTime')?.valueChanges.subscribe(() => {
      this.updateSwipeTime();
    });
  }

  private filterEmployeesByDepartment(departmentId: number) {
    this.filteredEmployees = this.employees.filter((emp) => emp.departmentId === departmentId);
  }

  private updateSwipeTime() {
    const dateValue = this.form.get('selectedDate')?.value;
    const timeValue = this.form.get('selectedTime')?.value;

    if (dateValue && timeValue) {
      const combinedDateTime = this.combineDateTimeLocalIso(dateValue, timeValue);
      this.form.get('swipeTime')?.setValue(combinedDateTime);
    }
  }
  private combineDateTimeObject(date: Date, time: Date): Date {
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return combined;
  }

  private combineDateTimeLocalIso(date: Date | undefined, time: Date | undefined): string {
    if (!date || !time) return '';

    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);

    const pad = (n: number) => (n < 10 ? '0' + n : n.toString());
    const YYYY = combined.getFullYear();
    const MM = pad(combined.getMonth() + 1);
    const DD = pad(combined.getDate());
    const hh = pad(combined.getHours());
    const mm = pad(combined.getMinutes());
    const ss = '00';

    // local, no timezone suffix
    return `${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}`;
  }

  // private combineDateTime(date: Date | undefined, time: Date | undefined): string {
  //   if (!date || !time) return '';

  //   const combined = new Date(date);
  //   combined.setHours(time.getHours());
  //   combined.setMinutes(time.getMinutes());
  //   combined.setSeconds(0);
  //   combined.setMilliseconds(0);

  //   return combined.toISOString();
  // }
}
