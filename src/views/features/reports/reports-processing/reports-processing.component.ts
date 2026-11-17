import { AccordionModule } from 'primeng/accordion';
import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Breadcrumb } from 'primeng/breadcrumb';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MultiSelect } from 'primeng/multiselect';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, Observable, Subject, takeUntil } from 'rxjs';
import { LanguageService } from '@/services/shared/language.service';
import { DepartmentService } from '@/services/features/lookups/department.service';
import { UserService } from '@/services/features/user.service';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { ManualProcessing } from '@/models/features/business/manual-processing';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { RequiredMarkerDirective } from '../../../../directives/required-marker.directive';
import { AlertService } from '@/services/shared/alert.service';
import { ConfirmationService } from '@/services/shared/confirmation.service';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { CustomValidators } from '@/validators/custom-validators';
import { ManualProcessingService } from '@/services/features/business/manual-processing.service';
import { Select } from 'primeng/select';
import { getLocalizedName } from '@/utils/localized-name';
import { LocalizedNamePipe } from '@/pipes/localized-name.pipe';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

interface DepartmentEmployees {
  department: BaseLookupModel;
  employees: UsersWithDepartmentLookup[];
}

@Component({
  selector: 'app-reports-processing',
  imports: [
    Breadcrumb,
    InputTextModule,
    TableModule,
    CommonModule,
    RouterModule,
    PaginatorModule,
    DatePickerModule,
    FormsModule,
    ReactiveFormsModule,
    MultiSelect,
    AccordionModule,
    TranslatePipe,
    ValidationMessagesComponent,
    RequiredMarkerDirective,
    Select,
    LocalizedNamePipe,
    WithNameFallbackPipe,
  ],
  templateUrl: './reports-processing.component.html',
  styleUrl: './reports-processing.component.scss',
})
export default class ReportsProcessingComponent implements OnInit, OnDestroy {
  @ViewChild('departmentsDropdown', { static: true }) departmentsDropdown!: MultiSelect;
  @ViewChild('usersDropdown', { static: true }) usersDropdown!: MultiSelect;
  form!: FormGroup;
  items: MenuItem[] | undefined;
  translateService = inject(TranslateService);
  destroy$: Subject<void> = new Subject<void>();
  langService = inject(LanguageService);
  activatedRoute = inject(ActivatedRoute);
  departmentService = inject(DepartmentService);
  userService = inject(UserService);
  confirmationService = inject(ConfirmationService);
  alertService = inject(AlertService);
  manualProcessingService = inject(ManualProcessingService);
  fb = inject(FormBuilder);

  departmentList: BaseLookupModel[] = [];
  employeeList: UsersWithDepartmentLookup[] = [];
  filteredEmployeeList: UsersWithDepartmentLookup[] = [];
  selectedEmployees: UsersWithDepartmentLookup[] = [];
  selectedDepartments: BaseLookupModel[] = [];
  processAllEmployees = false;
  private readonly _minAllowedDate = new Date(2025, 0, 1); // Jan 1, 2025
  private readonly _maxAllowedDate = (() => {
    const d = new Date();
    d.setDate(d.getDate()); // yesterday
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  // Grouped employees by department for accordion display
  departmentEmployeesGroups: DepartmentEmployees[] = [];

  breadcrumbs: MenuItem[] = [];
  home = {
    label: this.translateService.instant('COMMON.HOME'),
    icon: 'pi pi-home',
    routerLink: '/home',
  };

  // Current language
  currentLang = 'ar'; // Default to Arabic

  ngOnInit() {
    this.initializeForm();
    this.setHomeItem();
    this.initBreadcrumbs();
    this.loadLookups();

    // Get current language
    this.currentLang =
      this.langService.getCurrentLanguage() || this.translateService.currentLang || 'ar';

    // Listen to language changes
    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((langChangeEvent) => {
        this.currentLang = langChangeEvent.lang;
        this.setHomeItem();
        this.initBreadcrumbs();
        this.departmentEmployeesGroups = this.sortDepartmentsAlphabetically(
          this.departmentEmployeesGroups
        );
      });

    // Listen to language service changes if available
    this.langService.languageChanged$.pipe(takeUntil(this.destroy$)).subscribe((lang: string) => {
      this.currentLang = lang;
    });
  }

  initializeForm(): void {
    const model = new ManualProcessing();
    const formConfig = model.buildForm();

    this.form = this.fb.group(
      {
        startDate: formConfig.startDate,
        endDate: formConfig.endDate,
        userIdsArray: formConfig.userIdsArray,
        departmentIds: formConfig.departmentIds, // Changed from departmentId to departmentIds for multi-select
      },
      {
        validators: [
          CustomValidators.dateRangeValidator(this.minAllowedDate, this.maxAllowedDate, 3),
        ],
      }
    );

    // Watch for department changes to filter employees
    this.form
      .get('departmentIds')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((departmentIds) => {
        this.onDepartmentChange(departmentIds);
      });

    // Watch for employee selection changes
    this.form
      .get('userIdsArray')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((userIdsArray) => {
        this.onEmployeeSelectionChange(userIdsArray);
      });
  }

  loadLookups(): void {
    this.departmentService.getLookup().subscribe((res: BaseLookupModel[]) => {
      this.departmentList = res;
    });

    this.userService.getUsersWithDepartment().subscribe((res: UsersWithDepartmentLookup[]) => {
      this.employeeList = res;
      this.filteredEmployeeList = [];
    });
  }

  onDepartmentChange(departmentId: number | null): void {
    // Get previously selected departments
    // const previousDepartmentIds = this.selectedDepartments.map((dept) => dept.id);

    if (departmentId) {
      // Update selected departments
      this.selectedDepartments = this.departmentList.filter((dept) => departmentId == dept.id);

      // Filter employees by selected departments
      this.filteredEmployeeList = this.employeeList.filter(
        (emp) => departmentId == emp.departmentId
      );
    } else {
      // No departments selected - clear everything
      this.selectedDepartments = [];
      this.filteredEmployeeList = [];

      // Clear all selected employees if departments are cleared
      // this.form.patchValue({ userIds: [] });
    }
  }

  removeEmployeesFromDeselectedDepartments(deselectedDepartmentIds: (number | undefined)[]): void {
    const currentUserIds = this.form.get('userIdsArray')?.value || [];

    // Find employees that belong to deselected departments
    const employeesToRemove = this.employeeList
      .filter((emp) => deselectedDepartmentIds.includes(emp.departmentId))
      .map((emp) => emp.id);

    // Filter out employees from deselected departments
    const updatedUserIds = currentUserIds.filter(
      (userId: number) => !employeesToRemove.includes(userId)
    );

    this.form.patchValue({ userIdsArray: updatedUserIds });
  }

  onEmployeeSelectionChange(userIdsArray: number[] | null): void {
    if (userIdsArray && userIdsArray.length > 0) {
      // Get selected employees from the full list
      this.selectedEmployees = this.employeeList.filter((emp) =>
        userIdsArray.includes(emp.id || 0)
      );
    } else {
      this.selectedEmployees = [];
    }

    // Update grouped employees by department
    this.updateDepartmentEmployeesGroups();
  }

  get optionLabel(): string {
    return this.currentLang === 'ar' ? 'nameAr' : 'nameEn';
  }

  updateDepartmentEmployeesGroups(): void {
    const groupsMap = new Map<number, DepartmentEmployees>();

    this.selectedEmployees.forEach((employee) => {
      const deptId = employee.departmentId;
      const department = this.departmentList.find((dept) => dept.id === deptId);

      if (department) {
        if (!groupsMap.has(deptId || 0)) {
          groupsMap.set(deptId || 0, {
            department: department,
            employees: [],
          });
        }
        groupsMap.get(deptId || 0)!.employees.push(employee);
      }
    });

    this.departmentEmployeesGroups = this.sortDepartmentsAlphabetically(
      Array.from(groupsMap.values())
    );
  }

  sortDepartmentsAlphabetically(departments: DepartmentEmployees[]) {
    return departments.sort((a, b) =>
      getLocalizedName(a.department, this.currentLang).localeCompare(
        getLocalizedName(b.department, this.currentLang)
      )
    );
  }

  removeEmployee(employee: UsersWithDepartmentLookup): void {
    const currentUserIds = this.form.get('userIdsArray')?.value || [];
    const updatedUserIds = currentUserIds.filter((id: number) => id !== employee.id);
    this.form.patchValue({ userIdsArray: updatedUserIds });
  }

  removeAllEmployeesFromDepartment(departmentId: number | undefined): void {
    const currentUserIds = this.form.get('userIdsArray')?.value || [];
    const employeesToRemove = this.selectedEmployees
      .filter((emp) => emp.departmentId === departmentId)
      .map((emp) => emp.id);

    const updatedUserIds = currentUserIds.filter((id: number) => !employeesToRemove.includes(id));
    this.form.patchValue({ userIdsArray: updatedUserIds });
  }

  onProcessAllEmployeesChange(): void {
    const hasValues =
      (this.form.get('departmentIds')?.value?.length ?? 0) > 0 ||
      (this.form.get('userIdsArray')?.value?.length ?? 0) > 0;

    if (this.processAllEmployees) {
      if (hasValues) {
        this.openConfirmation().subscribe((confirmed) => {
          if (confirmed) {
            this.resetFormForProcessAll();
          } else {
            // Revert the checkbox if user canceled
            this.processAllEmployees = false;
          }
        });
      } else {
        this.resetFormForProcessAll();
      }
    } else {
      // Clear selection
      this.form.get('departmentIds')?.enable();
      this.form.get('userIdsArray')?.enable();
      this.form.patchValue({ userIdsArray: [] });
    }
  }

  private resetFormForProcessAll(): void {
    // const allUserIds = this.filteredEmployeeList.map((emp) => emp.id);

    this.form.patchValue({ userIdsArray: [] });
    this.form.patchValue({ departmentIds: [] });
    this.form.get('departmentIds')?.disable();
    this.form.get('userIdsArray')?.disable();
    this.departmentsDropdown.filterValue = null;
    this.usersDropdown.filterValue = null;
  }

  openConfirmation(): Observable<boolean> {
    const dialogRef = this.confirmationService.open({
      icon: 'warning',
      messages: [
        'ATTENDANCE_REPORT_PROCESSING_PAGE.CONFIRM_PROCESS_ALL_EMPLOYEES',
        'ATTENDANCE_REPORT_PROCESSING_PAGE.CONFIRM_PROCESS_ALL_EMPLOYEES_MESSAGE',
      ],
      confirmText: 'COMMON.OK',
      cancelText: 'COMMON.CANCEL',
    });

    return dialogRef.afterClosed().pipe(map((result) => result === DIALOG_ENUM.OK));
  }

  resetForm(): void {
    this.form.reset();
    this.selectedEmployees = [];
    this.departmentEmployeesGroups = [];
    this.selectedDepartments = [];
    this.processAllEmployees = false;
    this.filteredEmployeeList = [];
    this.form.get('departmentIds')?.enable();
    this.form.get('userIdsArray')?.enable();
    this.departmentsDropdown.filterValue = null;
    this.usersDropdown.filterValue = null;
  }

  processEmployees(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      const submittedModel = Object.assign(new ManualProcessing(), { ...formValue });
      const successObject = {
        messages: ['ATTENDANCE_REPORT_PROCESSING_PAGE.PROCESSED_SUCCESSFULLY'],
      };
      this.manualProcessingService.excuteManualProcessing(submittedModel).subscribe((res) => {
        this.alertService.showSuccessMessage(successObject);
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }

  setHomeItem(): void {
    this.home = {
      label: this.translateService.instant('COMMON.HOME'),
      icon: 'pi pi-home',
      routerLink: '/home',
    };
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = this.getBreadcrumbKeys().map((item) => ({
      label: this.translateService.instant(item.labelKey),
      icon: item.icon,
      routerLink: item.routerLink,
    }));
  }

  getBreadcrumbKeys(): {
    labelKey: string;
    icon?: string;
    routerLink?: string;
  }[] {
    return [{ labelKey: 'ATTENDANCE_REPORT_PROCESSING_PAGE.EMPLOYEE_REPORTS_PROCESSING' }];
  }

  // Form control getters
  get startDateControl(): FormControl {
    return this.form.get('startDate') as FormControl;
  }

  get endDateControl(): FormControl {
    return this.form.get('endDate') as FormControl;
  }

  get userIdsArrayControl(): FormControl {
    return this.form.get('userIdsArray') as FormControl;
  }

  get departmentIdsControl(): FormControl {
    return this.form.get('departmentIds') as FormControl;
  }

  // global min / max for both pickers
  get minAllowedDate(): Date {
    return this._minAllowedDate;
  }
  get maxAllowedDate(): Date {
    return this._maxAllowedDate;
  }

  getSelectedEmployeesLabel() {
    const count = this.userIdsArrayControl?.value?.length || 0;
    return (
      this.translateService.instant('ATTENDANCE_REPORT_PROCESSING_PAGE.SELECTED_EMPLOYEES') +
      ' ' +
      count
    );
  }

  getSelectedDepartmentsLabel() {
    const count = this.departmentIdsControl?.value?.length || 0;
    return (
      this.translateService.instant('ATTENDANCE_REPORT_PROCESSING_PAGE.SELECTED_DEPARTMENTS') +
      ' ' +
      count
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
