import { Component, inject, Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { Breadcrumb } from 'primeng/breadcrumb';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { DepartmentService } from '@/services/features/lookups/department.service';
import { UserService } from '@/services/features/user.service';
import { EmployeeShiftDayService } from '@/services/features/lookups/employee-shift-day.service';
import EmployeeShiftDay from '@/models/features/lookups/work-shifts/employee-shift-day';
import { EmployeeShiftDayFilter } from '@/models/features/lookups/work-shifts/employee-shift-day-filter';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { PaginationInfo } from '@/models/shared/response/pagination-info';
import {
  formatDateOnly,
  formatDateTimeForExcel,
  formatTimeRange,
  formatTimeTo12Hour,
} from '@/utils/general-helper';
import {
  WORK_SHIFT_TYPE_OPTIONS,
  WorkShiftTypeOption,
} from '@/models/features/lookups/work-shifts/work-shift-type-option';
import { WorkDaysPopupComponent } from '../work-days-popup/work-days-popup.component';
import { WorkDaysSettingService } from '@/services/features/setting/work-days-setting.service';
import { WorkDaysSetting } from '@/models/features/setting/work-days-setting';
import EmployeeShift from '@/models/features/lookups/work-shifts/employee-shift';
import { WorkShiftType } from '@/enums/work-shift-type';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { getLocalizedName } from '@/utils/localized-name';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

@Component({
  selector: 'app-shifts-view',
  imports: [
    InputTextModule,
    TableModule,
    CommonModule,
    RouterModule,
    PaginatorModule,
    Breadcrumb,
    MultiSelectModule,
    DatePickerModule,
    FormsModule,
    TranslatePipe,
    WithNameFallbackPipe,
  ],
  templateUrl: './shifts-view.component.html',
  styleUrl: './shifts-view.component.scss',
})
export class ShiftsViewComponent extends BaseListComponent<
  EmployeeShiftDay,
  any,
  EmployeeShiftDayService,
  EmployeeShiftDayFilter
> {
  @Input() embedded = false;

  dialogSize = { width: '100%', maxWidth: '1024px' };

  departments: BaseLookupModel[] = [];
  usersProfiles: UsersWithDepartmentLookup[] = [];

  filterOptions: EmployeeShiftDayFilter = new EmployeeShiftDayFilter();

  private shiftTypeOptions: WorkShiftTypeOption[] = WORK_SHIFT_TYPE_OPTIONS;
  private defaultWorkDays: WorkDaysSetting = new WorkDaysSetting();

  employeeShiftDayService = inject(EmployeeShiftDayService);
  private departmentService = inject(DepartmentService);
  private userService = inject(UserService);
  private workDaysSettingService = inject(WorkDaysSettingService);

  override get filterModel(): EmployeeShiftDayFilter {
    return this.filterOptions;
  }

  override set filterModel(val: EmployeeShiftDayFilter) {
    this.filterOptions = val as EmployeeShiftDayFilter;
  }

  override get service(): EmployeeShiftDayService {
    return this.employeeShiftDayService;
  }

  override initListComponent(): void {
    const resolverData = this.activatedRoute.snapshot.data['list'];
    const initialList = resolverData?.employeeShiftDays ?? resolverData;
    this.paginationInfo = this.paginationInfo || new PaginationInfo();

    if (initialList?.list) {
      this.handleLoadListSuccess(initialList);
      this.loadLookups();
      return;
    }

    if (this.embedded) {
      this.list = [];
      this.paginationInfo.totalItems = 0;
      return;
    } else {
      this.applyTimeFormatting(this.list);
    }

    this.loadLookups();
  }

  loadEmbeddedData(): void {
    this.loadLookups();
    this.loadList().subscribe({
      next: (response) => this.handleLoadListSuccess(response),
      error: () => this.handleLoadListError(),
    });
  }

  private loadLookups(): void {
    this.departmentService.getLookup().subscribe({
      next: (data) => {
        this.departments = data.sort((a, b) => this.compareByLocalizedName(a, b));
      },
    });

    this.userService.getUsersWithDepartment().subscribe({
      next: (data) => {
        this.usersProfiles = data.sort((a, b) => this.compareByLocalizedName(a, b));
      },
    });

    this.workDaysSettingService.getWorkDays().subscribe({
      next: (data) => {
        this.defaultWorkDays = data;
      },
    });
  }

  override handleLoadListSuccess(response: PaginatedList<EmployeeShiftDay>): void {
    super.handleLoadListSuccess(response);
    this.applyTimeFormatting(this.list);
  }

  private applyTimeFormatting(list: EmployeeShiftDay[]): void {
    if (!list) return;
    list.forEach((item) => {
      item.formattedTimeRange = this.getFormattedTimeRange(item);
    });
  }

  override openDialog(_model: EmployeeShiftDay): void {
    // view-only page
  }

  openShiftDetails(item: EmployeeShiftDay): void {
    const locale = this.isArabic ? 'ar-EG' : 'en-US';
    const shift = new EmployeeShift();
    shift.nameAr = item.shiftDetails?.nameAr;
    shift.nameEn = item.shiftDetails?.nameEn;
    shift.workShiftType = item.shiftAssignmentType as unknown as WorkShiftType;
    shift.timeFrom = item.timeFrom;
    shift.timeTo = item.timeTo;
    shift.dayBoundaryTime = item.dayBoundaryTime;
    shift.formattedTimeFrom = formatTimeTo12Hour(item.timeFrom, locale);
    shift.formattedTimeTo = formatTimeTo12Hour(item.timeTo, locale);
    shift.startDate = item.dateFrom;
    shift.endDate = item.dateTo;
    shift.beforeAttendanceBuffer = item.beforeAttendanceBuffer;
    shift.afterAttendanceBuffer = item.afterAttendanceBuffer;
    shift.beforeLeaveBuffer = item.beforeLeaveBuffer;
    shift.afterLeaveBuffer = item.afterLeaveBuffer;
    shift.employeeWorkingDays = item.employeeWorkingDays!;
    shift.presenceInquiryTime = item.presenceInquiryTime!;
    shift.presenceInquiryBuffer = item.presenceInquiryBuffer;
    shift.isRestDay = item.isRestDay;
    const lookups = { defaultWorkDays: [this.defaultWorkDays] };
    this.openBaseDialog(WorkDaysPopupComponent as any, shift as any, ViewModeEnum.VIEW, lookups);
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'SHIFTS_VIEW_PAGE.TITLE' }];
  }

  protected override mapModelToExcelRow(model: EmployeeShiftDay): { [key: string]: any } {
    return {
      [this.translateService.instant('SHIFTS_VIEW_PAGE.EMPLOYEE_NAME')]:
        this.getEmployeeName(model),
      [this.translateService.instant('SHIFTS_VIEW_PAGE.DATE_TIME')]: formatDateTimeForExcel(
        this.getFormattedDateRange(model.dateFrom, model.dateTo),
        this.getFormattedTimeRange(model),
        this.isArabic ? 'ar-EG' : 'en-US'
      ),
      [this.translateService.instant('SHIFTS_VIEW_PAGE.SHIFT_NAME')]: this.getShiftName(model),
      [this.translateService.instant('SHIFTS_VIEW_PAGE.SHIFT_TYPE')]: this.getShiftTypeName(
        model.shiftAssignmentType
      ),
      [this.translateService.instant('SHIFTS_VIEW_PAGE.IS_REST_DAY')]:
        model.isRestDay == null
          ? ''
          : model.isRestDay
            ? this.translateService.instant('SHIFTS_VIEW_PAGE.YES')
            : this.translateService.instant('SHIFTS_VIEW_PAGE.NO'),
    };
  }

  protected override getPdfTitle(): { ar: string; en: string } {
    return { ar: 'ورديات الموظفين', en: 'Employee Shift Days' };
  }

  protected override getPdfExportRequest(): Observable<Blob> {
    return this.employeeShiftDayService.exportPdf(
      this.langService.getCurrentLanguage(),
      this.getPdfExportFilterOptions()
    );
  }

  get filteredUsersProfiles(): UsersWithDepartmentLookup[] {
    const selectedDeptIds = this.filterOptions.fkDepartmentIds;
    if (!selectedDeptIds || selectedDeptIds.length === 0) return this.usersProfiles;
    return this.usersProfiles.filter(
      (u) => u.departmentId != null && selectedDeptIds.includes(u.departmentId)
    );
  }

  onDepartmentChange(): void {
    const selectedDeptIds = this.filterOptions.fkDepartmentIds;
    if (!selectedDeptIds || selectedDeptIds.length === 0) return;

    // Remove any already-selected employees whose department is no longer selected
    const currentUserIds = this.filterOptions.fkUserProfileIds ?? [];
    this.filterOptions.fkUserProfileIds = currentUserIds.filter((userId) => {
      const user = this.usersProfiles.find((u) => u.id === userId);
      return user?.departmentId != null && selectedDeptIds.includes(user.departmentId);
    });
  }

  get optionLabel(): string {
    return this.isArabic ? 'nameAr' : 'nameEn';
  }

  get isArabic(): boolean {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ARABIC;
  }

  getEmployeeName(item: EmployeeShiftDay): string {
    return getLocalizedName(item.employeeName, this.langService.getCurrentLanguage());
  }

  getShiftName(item: EmployeeShiftDay): string {
    return getLocalizedName(item.shiftDetails, this.langService.getCurrentLanguage());
  }

  private compareByLocalizedName(a: BaseLookupModel, b: BaseLookupModel): number {
    const lang = this.langService.getCurrentLanguage();
    return getLocalizedName(a, lang).localeCompare(getLocalizedName(b, lang));
  }

  getShiftTypeName(type: number): string {
    const option = this.shiftTypeOptions.find((opt) => opt.value === type);
    if (!option) return '';
    return this.isArabic ? option.nameAr : option.nameEn;
  }

  getFormattedDateRange(dateFrom: string, dateTo: string): string {
    const from = formatDateOnly(dateFrom);
    const to = formatDateOnly(dateTo);
    return from === to ? from : `${from} - ${to}`;
    // return `${from} - ${to}`;
  }

  getFormattedTimeRange(item: EmployeeShiftDay): string {
    return formatTimeRange(item.timeFrom, item.timeTo, this.isArabic ? 'ar-EG' : 'en-US');
  }

  get dateFrom(): Date | undefined {
    return this.filterOptions.dateFrom;
  }

  get dateTo(): Date | undefined {
    return this.filterOptions.dateTo;
  }
}
