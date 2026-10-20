import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { WorkMission } from '@/models/features/business/work-mission';
import WorkMissionFilter from '@/models/features/business/work-mission-filter';
import {
  getWorkMissionTypeName,
  WORK_MISSION_TYPE_OPTIONS,
  WorkMissionTypeOption,
} from '@/models/features/business/work-mission-type-option';
import { PaginationInfo } from '@/models/shared/response/pagination-info';
import { WorkMissionService } from '@/services/features/business/work-mission.service';
import { WorkMissionStatusEnum } from '@/enums/work-mission-status-enum';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { CustomValidators } from '@/validators/custom-validators';
import {
  WORK_MISSION_STATUS_OPTIONS,
  workMissionStatusBadgeClass,
  workMissionStatusDotClass,
  workMissionStatusTextKey,
} from '@/utils/work-mission-status';
import { ViewMissionDataPopupComponent } from '../popups/view-mission-data-popup/view-mission-data-popup.component';

/**
 * HR approvals tab: missions sent to HR whose creator department is in the HR officer's scope.
 * Opens on the pending ones; each row is decided from the mission view when `canTakeAction`.
 */
@Component({
  selector: 'app-hr-mission-approvals-list',
  imports: [
    CommonModule,
    FormsModule,
    DatePickerModule,
    TableModule,
    InputTextModule,
    PaginatorModule,
    TranslatePipe,
    Select,
  ],
  templateUrl: './hr-mission-approvals-list.component.html',
})
export class HrMissionApprovalsListComponent
  extends BaseListComponent<
    WorkMission,
    ViewMissionDataPopupComponent,
    WorkMissionService,
    WorkMissionFilter
  >
  implements OnInit
{
  override dialogSize = {
    width: '100%',
    maxWidth: '1024px',
  };

  workMissionService = inject(WorkMissionService);
  filterOptions: WorkMissionFilter = HrMissionApprovalsListComponent.pendingFilter();
  workMissionTypeOptions: WorkMissionTypeOption[] = WORK_MISSION_TYPE_OPTIONS;
  // Drafts never reach HR, so they are not offered as a filter.
  statusFilterOptions: { value: WorkMissionStatusEnum; label: string }[] = [];

  readonly statusTextKey = workMissionStatusTextKey;
  readonly statusBadgeClass = workMissionStatusBadgeClass;
  readonly statusDotClass = workMissionStatusDotClass;

  override get filterModel(): WorkMissionFilter {
    return this.filterOptions;
  }

  override set filterModel(val: WorkMissionFilter) {
    this.filterOptions = val;
  }

  override get service(): WorkMissionService {
    return this.workMissionService;
  }

  private static pendingFilter(): WorkMissionFilter {
    const filter = new WorkMissionFilter();
    filter.missionStatus = WorkMissionStatusEnum.PendingHrApproval;
    return filter;
  }

  override initListComponent(): void {
    // The route's resolved data belongs to "My missions"; this tab loads its own list.
    this.list = [];
    this.paginationInfo = new PaginationInfo();
    this.buildStatusFilterOptions();
    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.buildStatusFilterOptions());
  }

  /** Called by the container whenever the tab is opened: back to the pending missions. */
  reload(): void {
    this.filterModel = HrMissionApprovalsListComponent.pendingFilter();
    this.search();
  }

  override resetSearch(): void {
    this.reload();
  }

  override loadList() {
    return this.service.loadHrApprovalsPaginated(this.paginationParams, {
      ...this.appliedFilterModel!,
    });
  }

  override exportExcel(fileName: string = 'data.xlsx'): void {
    const allDataParams = {
      ...this.paginationParams,
      pageNumber: 1,
      pageSize: CustomValidators.defaultLengths.INT_MAX,
    };

    this.service
      .loadHrApprovalsPaginated(allDataParams, { ...this.appliedFilterModel! })
      .subscribe({
        next: (response) => {
          const fullList = response.list || [];
          if (fullList.length === 0) {
            this.alertsService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
            return;
          }
          this.writeExcelFile(this.mapModelsToExcelRows(fullList), fileName);
        },
        error: () => {
          this.alertsService.showErrorMessage({ messages: ['COMMON.ERROR'] });
        },
      });
  }

  /** The mission view carries the approve/reject buttons; deciding reloads this list. */
  override openDialog(model: WorkMission): void {
    this.openBaseDialog(ViewMissionDataPopupComponent as any, model, ViewModeEnum.EDIT);
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'dashboard' }, { labelKey: 'workMissions' }];
  }

  protected override mapModelToExcelRow(model: WorkMission): { [key: string]: any } {
    const datePipe = new DatePipe('en-US');
    return {
      [this.translateService.instant('WORK_MISSIONS.MISSION_NAME_AR')]: model.nameAr,
      [this.translateService.instant('WORK_MISSIONS.MISSION_NAME_EN')]: model.nameEn,
      [this.translateService.instant('WORK_MISSIONS.START_DATE')]: datePipe.transform(
        model.startDate,
        'dd/MM/yyyy'
      ),
      [this.translateService.instant('WORK_MISSIONS.END_DATE')]: datePipe.transform(
        model.endDate,
        'dd/MM/yyyy'
      ),
      [this.translateService.instant('WORK_MISSIONS.MISSION_TYPE')]: getWorkMissionTypeName(
        model.workMissionType,
        this.isCurrentLanguageEnglish()
      ),
      [this.translateService.instant('WORK_MISSIONS.MISSION_CREATOR')]: this.lookupName(
        model.missionCreator
      ),
      [this.translateService.instant('WORK_MISSIONS.CREATOR_DEPARTMENT')]: this.lookupName(
        model.creatorDepartment
      ),
      [this.translateService.instant('WORK_MISSIONS.ASSIGNED_EMPLOYEES_COUNT')]:
        model.assignedEmployees?.length ?? 0,
      [this.translateService.instant('WORK_MISSIONS.STATUS')]: model.status
        ? this.translateService.instant(workMissionStatusTextKey(model.status))
        : '',
    };
  }

  isCurrentLanguageEnglish(): boolean {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH;
  }

  getPropertyName(): string {
    return this.isCurrentLanguageEnglish() ? 'nameEn' : 'nameAr';
  }

  getWorkMissionTypeName(model: WorkMission): string {
    return getWorkMissionTypeName(model.workMissionType, this.isCurrentLanguageEnglish());
  }

  lookupName(item?: { nameAr?: string; nameEn?: string | null } | null): string {
    if (!item) return '';
    return (this.isCurrentLanguageEnglish() ? item.nameEn || item.nameAr : item.nameAr) ?? '';
  }

  private buildStatusFilterOptions(): void {
    this.statusFilterOptions = WORK_MISSION_STATUS_OPTIONS.filter(
      (option) => option.value !== WorkMissionStatusEnum.Draft
    ).map((option) => ({
      value: option.value,
      label: this.translateService.instant(option.labelKey),
    }));
  }
}
