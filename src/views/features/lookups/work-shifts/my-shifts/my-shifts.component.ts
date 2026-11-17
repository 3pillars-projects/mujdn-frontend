import { Component, inject, Input, OnInit } from '@angular/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { TableModule } from 'primeng/table';
import { CommonModule, formatDate } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { WorkDaysPopupComponent } from '../work-days-popup/work-days-popup.component';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import EmployeeShift from '@/models/features/lookups/work-shifts/employee-shift';
import { EmployeeShiftsFilter } from '@/models/features/lookups/work-shifts/employee-shifts-filter';
import { PaginationInfo } from '@/models/shared/response/pagination-info';
import { PaginationParams } from '@/models/shared/pagination-params';
import { OptionsContract } from '@/contracts/options-contract';
import { MyShiftsService } from '@/services/features/lookups/my-shifts.service';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { LanguageService } from '@/services/shared/language.service';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { CustomValidators } from '@/validators/custom-validators';
import { changeTimeSuffix } from '@/utils/general-helper';
import { WorkDaysSetting } from '@/models/features/setting/work-days-setting';
import { getShiftTypeTranslation } from '@/utils/shift-helper';
import { getLocalizedName } from '@/utils/localized-name';
import {
  WORK_SHIFT_TYPE_OPTIONS,
  WorkShiftTypeOption,
} from '@/models/features/lookups/work-shifts/work-shift-type-option';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { Observable } from 'rxjs';
@Component({
  selector: 'app-my-shifts',
  imports: [
    Breadcrumb,
    InputTextModule,
    TableModule,
    CommonModule,
    RouterModule,
    CommonModule,
    PaginatorModule,
    DatePickerModule,
    FormsModule,
    TranslatePipe,
    SelectModule,
    TooltipModule,
  ],
  templateUrl: './my-shifts.component.html',
  styleUrl: './my-shifts.component.scss',
})
export default class MyShiftsComponent extends BaseListComponent<
  EmployeeShift,
  WorkDaysPopupComponent,
  MyShiftsService,
  EmployeeShiftsFilter
> {
  @Input() embedded = false;

  // Required by BaseListComponent
  filterModel: EmployeeShiftsFilter = new EmployeeShiftsFilter();
  dialogSize = {
    width: '100%',
    maxWidth: '1024px',
  };
  filterOptions: EmployeeShiftsFilter = new EmployeeShiftsFilter();
  defaultWorkDays: WorkDaysSetting = new WorkDaysSetting();
  employeeShifts: EmployeeShift[] = [];
  service = inject(MyShiftsService);
  languageService = inject(LanguageService);
  locale: 'en-US' | 'ar-EG' = 'en-US';
  shiftTypeOptions: WorkShiftTypeOption[] = WORK_SHIFT_TYPE_OPTIONS;
  override initListComponent(): void {
    this.locale = this.isCurrentLanguageEnglish() ? 'en-US' : 'ar-EG';
    this.loadInitialData();

    this.languageService.languageChanged$.subscribe(() => {
      this.locale = this.isCurrentLanguageEnglish() ? 'en-US' : 'ar-EG';
      this.employeeShifts?.forEach((shift) => {
        changeTimeSuffix(
          this.isCurrentLanguageEnglish.bind(this),
          shift,
          'timeFrom',
          'formattedTimeFrom'
        );
        changeTimeSuffix(
          this.isCurrentLanguageEnglish.bind(this),
          shift,
          'timeTo',
          'formattedTimeTo'
        );
      });
    });
  }

  reloadEmbeddedData(): void {
    this.loadShifts(this.paginationParams.pageNumber || 1);
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'MY_SHIFTS.MY_SHIFTS' }];
  }
  protected override mapModelToExcelRow(model: EmployeeShift): { [key: string]: any } {
    const shiftName = this.getShiftNames(model).filter(Boolean).join(', ');
    const startDate = model.startDate
      ? formatDate(model.startDate, 'dd/MM/yyyy', 'en-US')
      : '';
    const endDate = model.endDate
      ? formatDate(model.endDate, 'dd/MM/yyyy', 'en-US')
      : '';

    return {
      [this.translateService.instant('MY_SHIFTS.SHIFT_NAME')]: shiftName,
      [this.translateService.instant('USER_WORK_SHIFT_PAGE.SHIFT_TYPE')]:
        this.getShiftTypeName(model),
      [this.translateService.instant('MY_SHIFTS.START_DATE')]: startDate,
      [this.translateService.instant('MY_SHIFTS.END_DATE')]: endDate,
    };
  }

  openDialog(shift: EmployeeShift): void {
    const viewMode = ViewModeEnum.EDIT;
    const lookups = {
      defaultWorkDays: [this.defaultWorkDays],
    };
    this.openBaseDialog(WorkDaysPopupComponent as any, shift, viewMode, lookups);
  }

  private loadInitialData(): void {
    const resolverData = this.activatedRoute.snapshot.data['list'];
    const myShifts = resolverData?.myShifts;

    this.employeeShifts = myShifts?.list || [];
    this.list = this.employeeShifts; // Update base class list
    this.paginationInfo = {
      ...new PaginationInfo(),
      ...myShifts?.paginationInfo,
      totalItems: myShifts?.paginationInfo?.totalItems || 0,
    };
    this.defaultWorkDays = resolverData?.defaultworkDays || new WorkDaysSetting();
  }

  override search(isStoredProcedure: boolean = false): void {
    this.appliedFilterModel = { ...this.filterModel };
    this.first = 0;
    this.paginationParams.pageNumber = 1;
    this.paginationParams.pageSize = this.rows;

    // Sync filter options
    this.syncFilters();

    const filterOptions = this.convertFilterToOptions(this.filterModel);

    this.service.getMyShifts(this.paginationParams, filterOptions).subscribe({
      next: (response) => {
        this.handleSearchSuccess(response);
      },
      error: (error) => {
        this.handleLoadListError();
      },
    });
  }
  override resetSearch(isStoredProcedure: boolean = false): void {
    this.filterModel = new EmployeeShiftsFilter();
    this.appliedFilterModel = new EmployeeShiftsFilter();
    this.filterOptions = new EmployeeShiftsFilter();
    this.paginationParams.pageNumber = 1;
    this.paginationParams.pageSize = 10;
    this.first = 0;
    this.loadShifts();
  }

  // Custom reset method for template
  onResetFilters(): void {
    this.resetSearch();
  }

  // Custom search method for template
  onSearch(): void {
    this.syncFilters();
    this.search();
  }

  // Page change - override base class method
  override onPageChange(event: PaginatorState, isStoredProcedure: boolean = false): void {
    this.first = event.first!;
    this.rows = event.rows!;
    this.paginationParams.pageNumber = Math.floor(this.first / this.rows) + 1;
    this.paginationParams.pageSize = this.rows;
    this.loadShifts(this.paginationParams.pageNumber);
  }

  private loadShifts(page: number = 1): void {
    this.paginationParams.pageNumber = page;
    this.paginationParams.pageSize = this.rows;

    // Update filter dates

    const filterOptions = this.convertFilterToOptions(this.filterModel);

    this.service.getMyShifts(this.paginationParams, filterOptions).subscribe({
      next: (response) => {
        this.handleSearchSuccess(response);
      },
      error: (error) => {
        this.handleLoadListError();
      },
    });
  }

  // Handle successful responses
  private handleSearchSuccess(response: any): void {
    this.employeeShifts = response.list || [];
    this.list = this.employeeShifts;

    this.convertTimeFormatToTwelve();
    this.updatePaginationInfo(response);
  }

  convertTimeFormatToTwelve() {
    this.employeeShifts?.forEach((shift) => {
      changeTimeSuffix(
        this.isCurrentLanguageEnglish.bind(this),
        shift,
        'timeFrom',
        'formattedTimeFrom'
      );
      changeTimeSuffix(
        this.isCurrentLanguageEnglish.bind(this),
        shift,
        'timeTo',
        'formattedTimeTo'
      );
    });
  }

  private handleLoadSuccess(response: any): void {
    this.employeeShifts = response.list || [];
    this.list = this.employeeShifts;
    this.updatePaginationInfo(response);
  }

  private updatePaginationInfo(response: any): void {
    if (response.paginationInfo) {
      this.paginationInfo = {
        ...new PaginationInfo(),
        ...response.paginationInfo,
        totalItems: response.paginationInfo.totalItems || 0,
      };
    } else {
      this.paginationInfo.totalItems = this.employeeShifts.length;
    }
  }

  // Sync between template filters and model filters
  private syncFilters(): void {
    this.filterModel.nameAr = this.filterOptions.nameAr;
    this.filterModel.nameEn = this.filterOptions.nameEn;
    this.filterModel.startDate = this.filterOptions.startDate;
    this.filterModel.endDate = this.filterOptions.endDate;
    this.filterModel.workShiftType = this.filterOptions.workShiftType;
  }

  // Convert filter to options contract
  private convertFilterToOptions(filter: EmployeeShiftsFilter): OptionsContract {
    const options: OptionsContract = {};

    if (filter.nameAr) options['nameAr'] = filter.nameAr;
    if (filter.nameEn) options['nameEn'] = filter.nameEn;
    if (filter.startDate) options['startDate'] = filter.startDate;
    if (filter.endDate) options['endDate'] = filter.endDate;
    if (filter.workShiftType) options['workShiftType'] = filter.workShiftType;

    return options;
  }

  // Additional utility methods
  getTotalRecords(): number {
    return this.paginationInfo?.totalItems || 0;
  }

  isCurrentLanguageEnglish(): boolean {
    return this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH;
  }

  onExportExcel(): void {
    this.exportExcel(this.getTranslatedFileName('MY_SHIFTS.MY_SHIFTS', 'xlsx'));
  }

  override exportExcel(fileName: string = 'my-shifts.xlsx', isStoredProcedure?: boolean): void {
    const allDataParams = {
      ...this.paginationParams,
      pageNumber: 1,
      pageSize: CustomValidators.defaultLengths.INT_MAX,
    };

    const fetchAll = this.service.getMyShifts(allDataParams, { ...this.appliedFilterModel! });

    fetchAll.subscribe({
      next: (response) => {
        const fullList = response.list || [];
        if (fullList.length === 0) {
          this.alertsService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
          return;
        } else {
          const transformedData = this.mapModelsToExcelRows(fullList);
          this.writeExcelFile(transformedData, fileName);
        }
      },
      error: (_) => {
        this.alertsService.showErrorMessage({ messages: ['COMMON.ERROR'] });
      },
    });
  }
  protected override getDefaultPdfFileName(): string {
    return this.translateService.instant('MY_SHIFTS.MY_SHIFTS') + '.pdf';
  }

  protected override getPdfExportRequest(): Observable<Blob> {
    return this.service.exportMyShiftsPdf(
      this.langService.getCurrentLanguage(),
      this.getPdfExportFilterOptions()
    );
  }
  get startDate() {
    return this.filterOptions.startDate as Date;
  }

  get endDate() {
    return this.filterOptions.endDate as Date;
  }
  /**
   * Returns an array of display names for a shift row.
   * - Rotating shift  → one entry per rotation group (shown as pill badges).
   * - All other types → single-element array (shown as plain text).
   * Language-aware: always returns the current-UI-language name.
   */
  getShiftNames(shift: EmployeeShift): string[] {
    const lang = this.languageService.getCurrentLanguage();

    // Rotating shift — each group has its own sub-shift details
    if (shift.rotationGroups?.length) {
      return shift.rotationGroups.map((g) => getLocalizedName(g.shiftDetails, lang));
    }

    // Non-rotating shift with a nested shiftDetails object
    if (shift.shiftDetails) {
      return [getLocalizedName(shift.shiftDetails, lang)];
    }

    // Fallback: top-level nameAr / nameEn (standard API response shape)
    return [getLocalizedName(shift, lang)];
  }

  getShiftTypeName(shift?: EmployeeShift | null): string {
    return getShiftTypeTranslation(shift?.workShiftType, this.translateService);
  }

  get optionLabel(): string {
    const lang = this.langService.getCurrentLanguage();
    return lang === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }
}
