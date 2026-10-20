import { Component, Inject, inject, ElementRef, Renderer2 } from '@angular/core';
import { WorkMissionStatusEnum } from '@/enums/work-mission-status-enum';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { WorkMission } from '@/models/features/business/work-mission';
import { M } from '@angular/material/dialog.d-B5HZULyo';
import { Observable } from 'rxjs';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserProfileDataWithNationalId } from '@/models/features/business/user-profile-data-with-national-id';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { PaginationInfo } from '@/models/shared/response/pagination-info';
import { WorkMissionService } from '@/services/features/business/work-mission.service';
import { PaginationParams } from '@/models/shared/pagination-params';
import { OptionsContract } from '@/contracts/options-contract';
import { TranslatePipe } from '@ngx-translate/core';
import { MissionEmployeesAssignement } from '@/models/features/business/mission-employees-assignment';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { TooltipModule } from 'primeng/tooltip';
import { AlertService } from '@/services/shared/alert.service';
import { getWorkMissionTypeName } from '@/models/features/business/work-mission-type-option';
@Component({
  selector: 'app-assign-employees',
  imports: [
    FormsModule,
    Select,
    DatePickerModule,
    InputTextModule,
    ReactiveFormsModule,
    CommonModule,
    TableModule,
    PaginatorModule,
    TranslatePipe,
    TooltipModule,
  ],
  templateUrl: './assign-employees.component.html',
  styleUrl: './assign-employees.component.scss',
})
export class AssignEmployeesComponent extends BasePopupComponent<WorkMission> {
  override model: WorkMission = new WorkMission();
  override form: FormGroup<any> = new FormGroup({});
  declare viewMode: ViewModeEnum;
  isCreateMode = false;
  employees: UserProfileDataWithNationalId[] = [];
  selectedUsers: MissionEmployeesAssignement = new MissionEmployeesAssignement();
  selectedEmployees: UserProfileDataWithNationalId[] = [];
  paginationInfo: PaginationInfo = new PaginationInfo();
  departments: BaseLookupModel[] = [];
  workMissionService = inject(WorkMissionService);
  alertService = inject(AlertService);
  paginationParams: PaginationParams = new PaginationParams();
  filterModel: OptionsContract = {};
  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    super();
  }
  override initPopup(): void {
    this.model = this.data.model;
    this.departments = this.data.lookups.departments;
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode == ViewModeEnum.CREATE;

    this.sortDepartments();
    // Load available employees for the table
    this.loadEmployees();
    // Pre-fill selected employees from already assigned employees
    if (this.model.assignedEmployees && this.model.assignedEmployees.length > 0) {
      // Copy into selectedEmployees
      this.selectedEmployees = [...this.model.assignedEmployees] as UserProfileDataWithNationalId[];

      // Fill employee IDs for checkbox checking
      this.selectedUsers.employeesIds = this.model.assignedEmployees
        .filter((emp) => emp.id !== undefined)
        .map((emp) => emp.id as number);
    }
  }

  private sortDepartments() {
    this.departments.sort((a, b) => {
      const currentLang = this.languageService.getCurrentLanguage();
      const prop = currentLang === LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';

      return (a[prop] || '').localeCompare(
        b[prop] || '',
        currentLang === LANGUAGE_ENUM.ENGLISH ? 'en' : 'ar'
      );
    });
  }

  override buildForm(): void {}
  override saveFail(_error: Error): void {}
  override afterSave(_model: WorkMission, _dialogRef: M<any, any>): void {}
  override beforeSave(_model: WorkMission, form: FormGroup): Observable<boolean> | boolean {
    return form.valid;
  }
  override prepareModel(
    model: WorkMission,
    _form: FormGroup
  ): WorkMission | Observable<WorkMission> {
    return model;
  }
  first: number = 0;
  rows: number = 10;
  date2: Date | undefined;

  onPageChange(event: PaginatorState) {
    this.first = event.first!;
    this.rows = event.rows!;
    this.paginationParams.pageNumber = Math.floor(this.first / this.rows) + 1;
    this.paginationParams.pageSize = this.rows;
    this.workMissionService
      .getEmployeesToBeAssigned(this.paginationParams, this.filterModel, this.model?.id)
      .subscribe({
        next: (response) => {
          this.employees = response.data.list;
          this.paginationInfoMap(response.data);
        },
        error: () => {},
      });
  }

  private loadEmployees() {
    this.workMissionService
      .getEmployeesToBeAssigned(this.paginationParams, this.filterModel, this.model?.id)
      .subscribe({
        next: (response) => {
          this.employees = response.data.list;
          this.paginationInfoMap(response.data);
        },
        error: () => {},
      });
  }
  get allCurrentPageHaveConflicts(): boolean {
    return this.employees.length > 0 && this.employees.every((emp) => emp.hasConflictingMissions);
  }

  // Add this method to check if all employees on current page are selected
  areAllCurrentPageSelected(): boolean {
    if (!this.employees || this.employees.length === 0) {
      return false;
    }

    return this.employees.every(
      (employee) => employee.id && this.selectedUsers.employeesIds.includes(employee.id)
    );
  }

  toggleAll(checked: boolean): void {
    if (checked) {
      // Add all employees from current page that aren't already selected and don't have conflicts
      const newEmployees = this.employees.filter(
        (u) =>
          u.id !== undefined &&
          !this.selectedUsers.employeesIds.includes(u.id) &&
          !u.hasConflictingMissions // Exclude employees with conflicting missions
      );
      const newEmployeeIds = newEmployees.map((u) => u.id as number);

      // Add to selected arrays
      this.selectedUsers.employeesIds = [...this.selectedUsers.employeesIds, ...newEmployeeIds];

      if (this.selectedEmployees) {
        this.selectedEmployees = [...this.selectedEmployees, ...newEmployees];
      }
    } else {
      // Remove all employees from current page
      const currentPageEmployeeIds = this.employees
        .filter((u) => u.id !== undefined)
        .map((u) => u.id as number);

      this.selectedUsers.employeesIds = this.selectedUsers.employeesIds.filter(
        (userId) => !currentPageEmployeeIds.includes(userId)
      );

      if (this.selectedEmployees) {
        this.selectedEmployees = this.selectedEmployees.filter(
          (emp) => !currentPageEmployeeIds.includes(emp.id!)
        );
      }
    }
  }

  toggleUserSelection(userId: number, event?: Event): void {
    const user = this.employees.find((u) => u.id === userId);

    // Don't allow selection if employee has conflicting missions
    if (user?.hasConflictingMissions) {
      if (event?.target) {
        (event.target as HTMLInputElement).checked = false;
      }
      return;
    }

    if ((event?.target as HTMLInputElement)?.checked) {
      // Add if not already in the list
      if (!this.selectedUsers.employeesIds.some((id) => id === userId)) {
        if (user && !this.selectedUsers.employeesIds.some((id) => id === userId)) {
          this.selectedUsers.employeesIds.push(user.id as number);
          this.selectedEmployees.push(user);
        }
      }
    } else {
      // Remove if unchecked
      this.selectedUsers.employeesIds = this.selectedUsers.employeesIds.filter(
        (id) => id !== userId
      );
      this.selectedEmployees = this.selectedEmployees.filter((emp) => emp.id !== userId);
    }
  }
  isUserSelected(userId: number): boolean {
    return this.selectedUsers.employeesIds.some((id) => id === userId);
  }
  returnCheckAllStatus(): boolean {
    // Only check employees without conflicts
    const selectableEmployees = this.employees.filter((emp) => !emp.hasConflictingMissions);

    if (selectableEmployees.length === 0) {
      return false;
    }

    return selectableEmployees.every((emp) =>
      this.selectedEmployees.map((selectedUser) => selectedUser.id).includes(emp.id)
    );
  }
  getSelectedEmployeeName(employeeId: number): string {
    const employee = this.selectedEmployees.find((emp) => emp.id === employeeId);

    if (!employee) {
      return 'Employee ID: ' + employeeId; // Fallback
    }

    // Return name based on current language
    const currentLang = this.languageService.getCurrentLanguage();
    return currentLang === LANGUAGE_ENUM.ENGLISH
      ? employee.nameEn || employee.nameAr || 'N/A'
      : employee.nameAr || employee.nameEn || 'N/A';
  }
  search() {
    this.first = 0;
    this.paginationParams.pageNumber = 1;
    this.paginationParams.pageSize = 10;
    this.loadEmployees();
  }
  paginationInfoMap(response: PaginatedList<UserProfileDataWithNationalId>) {
    const paginationInfo = response.paginationInfo;
    this.paginationInfo.totalItems = paginationInfo.totalItems || 0;
    this.paginationParams.pageSize = paginationInfo.pageSize || 10;
    this.paginationParams.pageNumber = paginationInfo.currentPage || 1;

    this.rows = this.paginationParams.pageSize;
    this.first = (this.paginationParams.pageNumber - 1) * this.paginationParams.pageSize;
  }

  resetSearch() {
    this.filterModel = {};
    this.paginationParams.pageNumber = 1;
    this.paginationParams.pageSize = 10;
    this.first = 0;
    this.loadEmployees();
  }

  getPropertyName(): string {
    return this.isCurrentLanguageEnglish() ? 'nameEn' : 'nameAr';
  }
  saveAssignments() {
    this.selectedUsers.missionId = this.model?.id;
    const previousStatus = this.model?.status;
    this.workMissionService.addUsersToMission(this.selectedUsers).subscribe({
      next: (response) => {
        const conflictingIds = response?.conflictingUserIds ?? [];
        // Where the assignment moved the mission in the HR workflow, if it moved.
        const statusMessage = this.assignmentStatusMessageKey(previousStatus, response?.status);
        if (conflictingIds.length > 0) {
          // Partial conflict: some assigned, some skipped
          this.alertService.showWarningMessage({
            messages: ['WORK_MISSIONS.ASSIGN_PARTIAL_CONFLICT', ...statusMessage],
          });
        } else {
          // All assigned successfully
          this.alertService.showSuccessMessage({
            messages: ['WORK_MISSIONS.ASSIGN_SUCCESS', ...statusMessage],
          });
        }
        // Closing with OK reloads the list: the mission's status (and row version) may have changed.
        this.dialogRef.close(DIALOG_ENUM.OK);
      },
      error: () => {
        // All-conflict case: error message is already shown by the global HTTP interceptor
      },
    });
  }
  private assignmentStatusMessageKey(
    previousStatus?: WorkMissionStatusEnum,
    status?: WorkMissionStatusEnum
  ): string[] {
    if (!status || status === previousStatus) {
      return [];
    }
    switch (status) {
      case WorkMissionStatusEnum.PendingHrApproval:
        return ['WORK_MISSIONS.SENT_TO_HR'];
      case WorkMissionStatusEnum.Approved:
        return ['WORK_MISSIONS.APPROVED_AUTOMATICALLY'];
      case WorkMissionStatusEnum.Draft:
        return ['WORK_MISSIONS.BACK_TO_DRAFT'];
      default:
        return [];
    }
  }

  isCurrentLanguageEnglish() {
    return this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH;
  }
  getWorkMissionTypeName(model: WorkMission): string {
    return getWorkMissionTypeName(model.workMissionType, this.isCurrentLanguageEnglish());
  }

  onTooltipHover(event: MouseEvent): void {
    const button = event.currentTarget as HTMLElement;
    const tooltip = button.querySelector('.tooltip-text') as HTMLElement;

    if (!tooltip) return;

    const rect = button.getBoundingClientRect();
    const tooltipHeight = tooltip.offsetHeight || 40;
    const topPosition = rect.top - tooltipHeight - 10; // 10px gap above button
    const leftPosition = rect.left + rect.width / 2;

    this.renderer.setStyle(tooltip, 'top', `${topPosition}px`);
    this.renderer.setStyle(tooltip, 'left', `${leftPosition}px`);
  }

  private renderer = inject(Renderer2);
}
