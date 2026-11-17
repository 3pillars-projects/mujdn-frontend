import { Component, inject, Input } from '@angular/core';
// import { Breadcrumb } from 'primeng/breadcrumb';
import { TableModule } from 'primeng/table';
import { CommonModule, formatDate } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { MatDialog } from '@angular/material/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { WorkShiftsAssignmentPopupComponent } from '../work-shifts-assignment-popup/work-shifts-assignment-popup.component';
import { TranslatePipe } from '@ngx-translate/core';
import UserWorkShift from '@/models/features/lookups/work-shifts/user-work-shifts';
import { UserWorkShiftService } from '@/services/features/lookups/user-workshift.service';
import ShiftsFilter from '@/models/features/lookups/work-shifts/shifts-filter';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { PaginationInfo } from '@/models/shared/response/pagination-info';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import UserWorkShiftsFilter from '@/models/features/lookups/work-shifts/user-work-shifts-filter';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import Shift from '@/models/features/lookups/work-shifts/shift';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { WorkDaysSetting } from '@/models/features/setting/work-days-setting';
import { CONFIRMATION_DIALOG_ICONS_ENUM } from '@/enums/confirmation-dialog-icons-enum';
import { ConfirmationService } from '@/services/shared/confirmation.service';
import { catchError, filter, forkJoin, of, switchMap } from 'rxjs';
import {
  WORK_SHIFT_TYPE_OPTIONS,
  WorkShiftTypeOption,
} from '@/models/features/lookups/work-shifts/work-shift-type-option';
import { TooltipModule } from 'primeng/tooltip';
import { Breadcrumb } from 'primeng/breadcrumb';
import { DepartmentService } from '@/services/features/lookups/department.service';
import { ShiftService } from '@/services/features/lookups/shift.service';
import { UserService } from '@/services/features/user.service';
import { WorkDaysSettingService } from '@/services/features/setting/work-days-setting.service';
import { AuthService } from '@/services/auth/auth.service';
import { getLocalizedName } from '@/utils/localized-name';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

@Component({
  selector: 'app-work-shifts-assignment',
  imports: [
    // Breadcrumb,
    InputTextModule,
    TableModule,
    CommonModule,
    RouterModule,
    CommonModule,
    PaginatorModule,
    Select,
    MultiSelectModule,
    DatePickerModule,
    FormsModule,
    TranslatePipe,
    TooltipModule,
    WithNameFallbackPipe,
    Breadcrumb,
  ],
  templateUrl: './work-shifts-assignment.component.html',
  styleUrl: './work-shifts-assignment.component.scss',
})
export default class WorkShiftsAssignmentComponent extends BaseListComponent<
  UserWorkShift,
  WorkShiftsAssignmentPopupComponent,
  UserWorkShiftService,
  ShiftsFilter
> {
  @Input() embedded = false;

  usersProfiles: UsersWithDepartmentLookup[] = [];
  userWorkShift: UserWorkShift[] = [];
  departments: BaseLookupModel[] = [];
  defaultWorkDays: WorkDaysSetting = new WorkDaysSetting();
  filteredEmployees: UsersWithDepartmentLookup[] = [];
  filterOptions: UserWorkShiftsFilter = new UserWorkShiftsFilter();
  shifts: Shift[] = [];
  shiftTypeOptions: WorkShiftTypeOption[] = WORK_SHIFT_TYPE_OPTIONS;

  confirmationService = inject(ConfirmationService);
  userworkShiftService = inject(UserWorkShiftService);
  private departmentService = inject(DepartmentService);
  private shiftService = inject(ShiftService);
  private userService = inject(UserService);
  private workDaysSettingService = inject(WorkDaysSettingService);
  private authService = inject(AuthService);
  popupViewMode: ViewModeEnum = ViewModeEnum.VIEW;

  override get filterModel(): UserWorkShiftsFilter {
    return this.filterOptions;
  }
  override set filterModel(val: UserWorkShiftsFilter) {
    this.filterOptions = val as UserWorkShiftsFilter;
  }
  override get service(): UserWorkShiftService {
    return this.userWorkShiftService;
  }
  override initListComponent(): void {
    const resolverData = this.activatedRoute.snapshot.data['list'];
    this.paginationInfo = this.paginationInfo || new PaginationInfo();

    if (resolverData?.userShifts) {
      this.applyAssignmentData(resolverData);
      return;
    }

    if (this.embedded) {
      this.list = [];
      this.paginationInfo.totalItems = 0;
      return;
    }

    this.loadEmbeddedData();
  }

  loadEmbeddedData(): void {
    forkJoin({
      userShifts: this.userWorkShiftService
        .loadPaginated(this.paginationParams, { ...this.appliedFilterModel })
        .pipe(catchError(() => of(null))),
      users: this.userService.getUsersWithDepartment().pipe(catchError(() => of([]))),
      shifts: this.shiftService.getShiftLookupWithTime().pipe(catchError(() => of([]))),
      departments: this.departmentService.getLookup().pipe(catchError(() => of([]))),
      defaultworkDays: this.workDaysSettingService
        .getWorkDays()
        .pipe(catchError(() => of(new WorkDaysSetting()))),
    }).subscribe({
      next: (data) => this.applyAssignmentData(data),
      error: () => this.handleLoadListError(),
    });
  }

  private applyAssignmentData(data: {
    userShifts: PaginatedList<UserWorkShift> | null;
    users: UsersWithDepartmentLookup[];
    departments: BaseLookupModel[];
    shifts: Shift[];
    defaultworkDays: WorkDaysSetting;
  }): void {
    this.shifts = data.shifts || [];
    this.list = data.userShifts?.list || [];
    this.paginationInfo =
      data.userShifts?.paginationInfo || this.paginationInfo || new PaginationInfo();
    this.usersProfiles = data.users || [];
    this.departments = data.departments || [];
    this.defaultWorkDays = data.defaultworkDays || new WorkDaysSetting();
    this.filteredEmployees = this.usersProfiles;
    this.departments = this.sortByName(this.departments);
    this.filteredEmployees = this.sortByName(this.filteredEmployees);
  }
  private sortByName<T extends BaseLookupModel>(arr: T[]): T[] {
    const lang = this.langService.getCurrentLanguage();
    return [...arr].sort((a, b) =>
      getLocalizedName(a, lang).localeCompare(getLocalizedName(b, lang), undefined, {
        sensitivity: 'base',
      })
    );
  }

  protected override mapModelToExcelRow(model: UserWorkShift): { [key: string]: any } {
    const shiftName = (this.getShiftNames(model as any) as (string | undefined)[])
      .filter(Boolean)
      .join(', ');
    const startDate = model.startDate
      ? formatDate(model.startDate, 'dd/MM/yyyy', 'en-US')
      : '';
    const endDate = model.endDate
      ? formatDate(model.endDate, 'dd/MM/yyyy', 'en-US')
      : '---';

    return {
      [this.translateService.instant('USER_WORK_SHIFT_PAGE.SHIFT_NAME_AR')]: shiftName,
      [this.translateService.instant('USER_WORK_SHIFT_PAGE.SHIFT_TYPE')]: this.getShiftTypeName(
        model.workShiftType
      ),
      [this.translateService.instant('USER_WORK_SHIFT_PAGE.START_DATE')]: startDate,
      [this.translateService.instant('USER_WORK_SHIFT_PAGE.END_DATE')]: endDate,
    };
  }
  dialogSize = {
    width: '100%',
    maxWidth: '1024px',
  };
  userWorkShiftService = inject(UserWorkShiftService);
  dialog = inject(MatDialog);
  date2: Date | undefined;
  attendance!: any[];

  canAddOrEditOrDelete() {
    return this.authService.isHROfficer;
  }

  canView() {
    return this.authService.isDepartmentManager;
  }

  addModel(): void {
    this.popupViewMode = ViewModeEnum.CREATE;
    this.openDialog(new UserWorkShift());
  }

  editModel(userWorkShift: UserWorkShift, viewMode: ViewModeEnum): void {
    this.popupViewMode = viewMode;
    this.openDialog(userWorkShift);
  }

  cloneModel(userWorkShift: UserWorkShift): void {
    const cloned = Object.assign(new UserWorkShift(), userWorkShift);
    delete (cloned as any).id;
    this.popupViewMode = ViewModeEnum.EDIT;
    this.openDialog(cloned);
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'USER_WORK_SHIFT_PAGE.WORK_SHIFT_ASSIGNMENT' }];
  }

  override openDialog(userWorkShift: UserWorkShift) {
    const model = userWorkShift ?? new UserWorkShift();
    const lookups = {
      usersProfiles: this.usersProfiles,
      departments: this.departments,
      shifts: this.shifts,
      defaultWorkDays: [this.defaultWorkDays],
    };

    return this.openBaseDialog(
      WorkShiftsAssignmentPopupComponent as any,
      model,
      this.popupViewMode,
      lookups
    );
  }

  get optionLabel(): string {
    const lang = this.langService.getCurrentLanguage();
    return lang === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }

  isCurrentLanguageEnglish() {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH;
  }

  get startDate() {
    return this.filterOptions.startDate as Date;
  }

  get endDate() {
    return this.filterOptions.endDate as Date;
  }

  override resetSearch(isStoredProcedure: boolean = false) {
    this.filterModel = {} as UserWorkShiftsFilter;
    this.appliedFilterModel = {} as UserWorkShiftsFilter;
    this.filteredEmployees = this.usersProfiles;
    this.paginationParams.pageNumber = 1;
    this.paginationParams.pageSize = 10;
    this.first = 0;
    if (isStoredProcedure) {
      this.loadListSP().subscribe({
        next: (response) => this.handleLoadListSuccess(response),
        error: this.handleLoadListError,
      });
    } else {
      this.loadList().subscribe({
        next: (response) => this.handleLoadListSuccess(response),
        error: this.handleLoadListError,
      });
    }
  }

  deleteUserShiftAssignment(shiftLogId: number) {
    const confirmMessage = this.translateService.instant('COMMON.CONFIRM_DELETE');
    const confirmationData = {
      icon: CONFIRMATION_DIALOG_ICONS_ENUM.WARNING.toString(),
      messages: [confirmMessage],
    };

    this.confirmationService
      .open(confirmationData)
      .afterClosed()
      .pipe(
        filter((result) => result === DIALOG_ENUM.OK),
        switchMap(() => this.userworkShiftService.deleteUserShiftAssignment(shiftLogId)),
        switchMap(() => this.loadList())
      )
      .subscribe({
        next: (response: PaginatedList<UserWorkShift>) => {
          this.handleLoadListSuccess(response);

          this.alertService.showSuccessMessage({
            messages: ['COMMON.DELETED_SUCCESSFULLY'],
          });
        },
        error: () => {
          this.alertService.showErrorMessage({
            messages: ['COMMON.DELETION_FAILED'],
          });
        },
      });
  }

  onDepartmentChange(): void {
    const selectedDeptId = this.filterOptions.fkDepartmentId;
    if (!selectedDeptId) {
      this.filteredEmployees = this.sortByName(this.usersProfiles);
    } else {
      this.filteredEmployees = this.sortByName(
        this.usersProfiles.filter(
          (u) => u.departmentId != null && u.departmentId === selectedDeptId
        )
      );
    }
    if (this.filterOptions.fkAssignedUserId != null) {
      const validIds = new Set(this.filteredEmployees.map((e) => e.id));
      if (!validIds.has(this.filterOptions.fkAssignedUserId)) {
        this.filterOptions.fkAssignedUserId = null;
      }
    }
  }

  getShiftTypeName(type: number): string {
    const option = this.shiftTypeOptions.find((opt) => opt.value === type);
    return option
      ? this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ARABIC
        ? option.nameAr
        : option.nameEn
      : '';
  }

  getShiftNames(shift: Shift) {
    const lang = this.langService.getCurrentLanguage();
    if (shift.shiftDetails) {
      return [getLocalizedName(shift.shiftDetails, lang)];
    } else {
      return shift.rotationGroups.map((x) => getLocalizedName(x.shiftDetails, lang));
    }
  }

  protected readonly ViewModeEnum = ViewModeEnum;
}
