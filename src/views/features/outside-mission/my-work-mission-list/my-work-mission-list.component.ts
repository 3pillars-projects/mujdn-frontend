import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { SplitButton } from 'primeng/splitbutton';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { ViewMissionDataPopupComponent } from '../popups/view-mission-data-popup/view-mission-data-popup.component';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { WorkMission } from '@/models/features/business/work-mission';
import { WorkMissionService } from '@/services/features/business/work-mission.service';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import MyWorkMissionFilter from '@/models/features/business/my-work-missions-filter';
import { PaginationInfo } from '@/models/shared/response/pagination-info';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { PaginatedListResponseData } from '@/models/shared/response/paginated-list-response-data';
import { CustomValidators } from '@/validators/custom-validators';
import {
  getWorkMissionTypeName,
  WORK_MISSION_TYPE_OPTIONS,
  WorkMissionTypeOption,
} from '@/models/features/business/work-mission-type-option';
import { Observable } from 'rxjs';
import { getEnglishName } from '@/utils/localized-name';
import { EnglishNamePipe } from '@/pipes/english-name.pipe';
import { LocalizedNamePipe } from '@/pipes/localized-name.pipe';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';
interface Adminstration {
  type: string;
}
@Component({
  selector: 'app-my-work-mission-list',
  imports: [
    InputTextModule,
    TableModule,
    CommonModule,
    RouterModule,
    CommonModule,
    PaginatorModule,
    DatePickerModule,
    TabsModule,
    FormsModule,
    TranslatePipe,
    Select,
    EnglishNamePipe,
    LocalizedNamePipe,
    WithNameFallbackPipe,
  ],
  templateUrl: './my-work-mission-list.component.html',
  styleUrl: './my-work-mission-list.component.scss',
})
export class MyWorkMissionListComponent extends BaseListComponent<
  WorkMission,
  ViewMissionDataPopupComponent,
  WorkMissionService,
  MyWorkMissionFilter
> {
  filterOptions: MyWorkMissionFilter = new MyWorkMissionFilter();
  workMissionService = inject(WorkMissionService);
  creators: BaseLookupModel[] = [];
  myMissions: WorkMission[] = [];
  workMissionTypeOptions: WorkMissionTypeOption[] = WORK_MISSION_TYPE_OPTIONS;
  override list: WorkMission[] = [];
  override dialogSize: any = {
    width: '100%',
    maxWidth: '1024px',
  };
  override get filterModel(): MyWorkMissionFilter {
    return this.filterOptions;
  }

  override set filterModel(val: MyWorkMissionFilter) {
    this.filterOptions = val;
  }

  override get service(): WorkMissionService {
    return this.workMissionService;
  }
  addOrEditModel(model?: WorkMission): void {
    this.openDialog(model);
  }
  override openDialog(model?: WorkMission): void {
    const mission = model || new WorkMission();
    const viewMode = model?.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.openBaseDialog(ViewMissionDataPopupComponent as any, mission, viewMode);
  }
  override search() {
    this.appliedFilterModel = { ...this.filterModel };
    this.paginationParams.pageNumber = 1;
    this.first = 0;
    this.loadMyPresenceInquiriesList();
  }
  override resetSearch() {
    this.filterModel = new MyWorkMissionFilter();
    this.appliedFilterModel = new MyWorkMissionFilter();
    this.paginationParams.pageNumber = 1;
    this.paginationParams.pageSize = 10;
    this.first = 0;
    this.loadMyPresenceInquiriesList();
  }
  loadMyPresenceInquiriesList() {
    this.service
      .getMyWorkMissionsAsync(this.paginationParams, { ...this.appliedFilterModel! })
      .subscribe((res: PaginatedListResponseData<WorkMission>) => {
        this.list = res.data.list;
        this.paginationInfo = res.data.paginationInfo;
      });
  }
  override initListComponent(): void {
    this.loadInitialData();
  }
  resetFilter(): void {
    this.filterModel = new MyWorkMissionFilter(); // fresh empty filter
  }
  loadMyMissions(): void {
    // Always fetch fresh data
    this.paginationParams.pageNumber = 1;
    this.first = 0;
    this.service
      .getMyWorkMissionsAsync(this.paginationParams, { ...this.appliedFilterModel })
      .subscribe((res: PaginatedListResponseData<WorkMission>) => {
        this.list = res.data.list;
        this.paginationInfo = res.data.paginationInfo;
      });
  }

  private loadInitialData(): void {
    const resolverData = this.activatedRoute.snapshot.data['list'];
    this.creators = resolverData.creators || [];
    this.myMissions = resolverData.myMissions.list || [];
    this.list = this.myMissions;
    this.paginationInfo = {
      ...new PaginationInfo(),
      ...resolverData.myMissions.paginationInfo,
      totalItems: resolverData.myMissions.paginationInfo.totalItems || 0,
    };
  }

  protected override getBreadcrumbKeys(): {
    labelKey: string;
    icon?: string;
    routerLink?: string;
  }[] {
    return [{ labelKey: 'dashboard' }, { labelKey: 'workMissions' }];
  }

  protected override mapModelToExcelRow(model: WorkMission): { [key: string]: any } {
    return {
      [this.translateService.instant('WORK_MISSIONS.MISSION_NAME_AR')]: model.nameAr,
      [this.translateService.instant('WORK_MISSIONS.MISSION_NAME_EN')]: getEnglishName(model),
      [this.translateService.instant('WORK_MISSIONS.START_DATE')]: model.startDate,
      [this.translateService.instant('WORK_MISSIONS.END_DATE')]: model.endDate,
      [this.translateService.instant('WORK_MISSIONS.MISSION_TYPE')]: getWorkMissionTypeName(
        model.workMissionType,
        this.isCurrentLanguageEnglish()
      ),
      [this.translateService.instant('WORK_MISSIONS.MISSION_CREATOR_AR')]:
        model.missionCreator?.nameAr || '',
      [this.translateService.instant('WORK_MISSIONS.MISSION_CREATOR_EN')]: getEnglishName(
        model.missionCreator
      ),
    };
  }
  override exportExcel(
    fileName: string = 'my-work-missions.xlsx',
    isStoredProcedure?: boolean
  ): void {
    const allDataParams = {
      ...this.paginationParams,
      pageNumber: 1,
      pageSize: CustomValidators.defaultLengths.INT_MAX,
    };

    const fetchAll = this.service.getMyWorkMissionsAsync(allDataParams, {
      ...this.appliedFilterModel!,
    });

    fetchAll.subscribe({
      next: (response) => {
        const fullList = (response.data?.list || []) as any[];
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

  protected override getPdfExportRequest(): Observable<Blob> {
    return this.service.exportMyWorkMissionsPdf(
      this.langService.getCurrentLanguage(),
      this.getPdfExportFilterOptions()
    );
  }

  getPropertyName(): string {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';
  }

  isCurrentLanguageEnglish(): boolean {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH;
  }
  getWorkMissionTypeName(model: WorkMission): string {
    return getWorkMissionTypeName(model.workMissionType, this.isCurrentLanguageEnglish());
  }
}
