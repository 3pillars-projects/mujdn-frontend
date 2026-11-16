import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import EmployeeShiftDay from '@/models/features/lookups/work-shifts/employee-shift-day';
import { EmployeeShiftDayFilter } from '@/models/features/lookups/work-shifts/employee-shift-day-filter';
import {
  WORK_SHIFT_TYPE_OPTIONS,
  WorkShiftTypeOption,
} from '@/models/features/lookups/work-shifts/work-shift-type-option';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { PaginationInfo } from '@/models/shared/response/pagination-info';
import { EmployeeShiftDayService } from '@/services/features/lookups/employee-shift-day.service';
import {
  formatDateOnly,
  formatDateTimeForExcel,
  formatTimeRange,
  formatTimeTo12Hour,
} from '@/utils/general-helper';
import { CustomValidators } from '@/validators/custom-validators';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { WorkDaysPopupComponent } from '../work-days-popup/work-days-popup.component';
import { WorkDaysSettingService } from '@/services/features/setting/work-days-setting.service';
import { WorkDaysSetting } from '@/models/features/setting/work-days-setting';
import EmployeeShift from '@/models/features/lookups/work-shifts/employee-shift';
import { WorkShiftType } from '@/enums/work-shift-type';
import { ViewModeEnum } from '@/enums/view-mode-enum';

@Component({
  selector: 'app-my-shifts-view',
  imports: [
    CommonModule,
    DatePickerModule,
    FormsModule,
    InputTextModule,
    PaginatorModule,
    TableModule,
    TranslatePipe,
  ],
  templateUrl: './my-shifts-view.component.html',
  styleUrl: './my-shifts-view.component.scss',
})
export class MyShiftsViewComponent extends BaseListComponent<
  EmployeeShiftDay,
  any,
  EmployeeShiftDayService,
  EmployeeShiftDayFilter
> {
  override dialogSize = { width: '100%', maxWidth: '1024px' };

  filterOptions: EmployeeShiftDayFilter = new EmployeeShiftDayFilter();
  employeeShiftDayService = inject(EmployeeShiftDayService);
  private workDaysSettingService = inject(WorkDaysSettingService);
  private defaultWorkDays: WorkDaysSetting = new WorkDaysSetting();
  private shiftTypeOptions: WorkShiftTypeOption[] = WORK_SHIFT_TYPE_OPTIONS;

  override get filterModel(): EmployeeShiftDayFilter {
    return this.filterOptions;
  }

  override set filterModel(val: EmployeeShiftDayFilter) {
    this.filterOptions = val || new EmployeeShiftDayFilter();
  }

  override get service(): EmployeeShiftDayService {
    return this.employeeShiftDayService;
  }

  override initListComponent(): void {
    const resolverData = this.activatedRoute.snapshot.data['list'];
    const initialList = resolverData?.myShiftDays ?? resolverData;
    this.paginationInfo = this.paginationInfo || new PaginationInfo();

    if (initialList?.list) {
      this.handleLoadListSuccess(initialList);
    }

    this.workDaysSettingService.getWorkDays().subscribe({
      next: (data) => {
        this.defaultWorkDays = data;
      },
    });
  }

  override loadList(): Observable<PaginatedList<EmployeeShiftDay>> {
    return this.service.loadMyShiftDaysPaginated(this.paginationParams, {
      ...this.appliedFilterModel,
    });
  }

  override exportExcel(fileName: string = 'my-shift-days.xlsx'): void {
    const allDataParams = {
      ...this.paginationParams,
      pageNumber: 1,
      pageSize: CustomValidators.defaultLengths.INT_MAX,
    };

    this.service.loadMyShiftDaysPaginated(allDataParams, { ...this.appliedFilterModel }).subscribe({
      next: (response) => {
        const fullList = response.list || [];

        if (fullList.length === 0) {
          this.alertsService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
          return;
        }

        const transformedData = this.mapModelsToExcelRows(fullList);
        this.writeExcelFile(transformedData, fileName);
      },
      error: () => {
        this.alertsService.showErrorMessage({ messages: ['COMMON.ERROR'] });
      },
    });
  }

  override openDialog(_model: EmployeeShiftDay): void {
    // View-only tab.
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
    return [{ labelKey: 'MY_SHIFTS.SHIFT_DAYS' }];
  }

  protected override mapModelToExcelRow(model: EmployeeShiftDay): { [key: string]: any } {
    return {
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

  protected override getPdfExportRequest(): Observable<Blob> {
    return this.employeeShiftDayService.exportMyShiftDaysPdf(
      this.langService.getCurrentLanguage(),
      this.getPdfExportFilterOptions()
    );
  }

  get isArabic(): boolean {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ARABIC;
  }

  get dateFrom(): Date | undefined {
    return this.filterOptions.dateFrom;
  }

  get dateTo(): Date | undefined {
    return this.filterOptions.dateTo;
  }

  getShiftName(item: EmployeeShiftDay): string {
    const shiftDay = item as EmployeeShiftDay & {
      shiftNameAr?: string;
      shiftNameEn?: string;
      nameAr?: string;
      nameEn?: string;
    };

    return this.isArabic
      ? (shiftDay.shiftDetails?.nameAr ?? shiftDay.shiftNameAr ?? shiftDay.nameAr ?? '')
      : (shiftDay.shiftDetails?.nameEn ??
          shiftDay.shiftNameEn ??
          shiftDay.nameEn ??
          shiftDay.shiftDetails?.nameAr ??
          shiftDay.shiftNameAr ??
          shiftDay.nameAr ??
          '');
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
  }

  getFormattedTimeRange(item: EmployeeShiftDay): string {
    return formatTimeRange(item.timeFrom, item.timeTo, this.isArabic ? 'ar-EG' : 'en-US');
  }
}
