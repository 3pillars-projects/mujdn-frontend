import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  Input,
  OnInit,
  runInInjectionContext,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MenuItem, MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { AddNewMissionPopupComponent } from '../popups/add-new-mission-popup/add-new-mission-popup.component';
import { ViewMissionDataPopupComponent } from '../popups/view-mission-data-popup/view-mission-data-popup.component';
import { AssignEmployeesComponent } from '../popups/assign-employees/assign-employees.component';
import { SplitButton, SplitButtonModule } from 'primeng/splitbutton';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { WorkMission } from '@/models/features/business/work-mission';
import WorkMissionFilter from '@/models/features/business/work-mission-filter';
import { WorkMissionService } from '@/services/features/business/work-mission.service';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { PaginationInfo } from '@/models/shared/response/pagination-info';
import { TranslatePipe } from '@ngx-translate/core';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { MenuModule } from 'primeng/menu';
import { UserProfileDataWithNationalId } from '@/models/features/business/user-profile-data-with-national-id';
import { PaginatedListResponseData } from '@/models/shared/response/paginated-list-response-data';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { Select } from 'primeng/select';
import {
  getWorkMissionTypeName,
  WORK_MISSION_TYPE_OPTIONS,
  WorkMissionTypeOption,
} from '@/models/features/business/work-mission-type-option';
import { finalize } from 'rxjs';
import { downloadBlobData } from '@/utils/utils';
import { WorkMissionStatusEnum } from '@/enums/work-mission-status-enum';
import {
  WORK_MISSION_STATUS_OPTIONS,
  workMissionStatusBadgeClass,
  workMissionStatusDotClass,
  workMissionStatusTextKey,
} from '@/utils/work-mission-status';

@Component({
  selector: 'app-assign-work-mission-list',
  imports: [
    CommonModule,
    FormsModule,
    DatePickerModule,
    TableModule,
    SplitButton,
    InputTextModule,
    PaginatorModule,
    TranslatePipe,
    Select,
    MenuModule,
    SplitButtonModule,
  ],
  templateUrl: './assign-work-mission-list.component.html',
  styleUrl: './assign-work-mission-list.component.scss',
  providers: [MessageService],
})
export class AssignWorkMissionListComponent
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
  actionList: MenuItem[] = [];
  @ViewChild('missionContainer', { static: true }) missionContainer!: ElementRef;

  // Services and dependencies
  workMissionService = inject(WorkMissionService);
  private injector = inject(Injector);
  dialog = inject(MatDialog);

  // Filter model
  filterOptions: WorkMissionFilter = new WorkMissionFilter();
  // Accept signals as inputs
  @Input() missionsSignal!: WritableSignal<PaginatedList<WorkMission>>;
  @Input() departmentsSignal!: WritableSignal<BaseLookupModel[]>;

  // Component data
  missions: WorkMission[] = [];
  departments: BaseLookupModel[] = [];
  workMissionTypeOptions: WorkMissionTypeOption[] = WORK_MISSION_TYPE_OPTIONS;
  readonly statusOptions = WORK_MISSION_STATUS_OPTIONS;
  readonly statusTextKey = workMissionStatusTextKey;
  readonly statusBadgeClass = workMissionStatusBadgeClass;
  readonly statusDotClass = workMissionStatusDotClass;
  statusFilterOptions: { value: WorkMissionStatusEnum; label: string }[] = [];
  downloadingMissionId?: number;

  // Base class overrides
  override get filterModel(): WorkMissionFilter {
    return this.filterOptions;
  }

  override set filterModel(val: WorkMissionFilter) {
    this.filterOptions = val;
  }

  override get service(): WorkMissionService {
    return this.workMissionService;
  }

  override openDialog(model?: WorkMission): void {
    const mission = model || new WorkMission();
    const viewMode = model?.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.openBaseDialog(AddNewMissionPopupComponent as any, mission, viewMode);
  }

  override initListComponent(): void {
    // Initialize effects to sync with parent signals
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const currentMissions = this.missionsSignal?.();
        if (currentMissions) {
          this.list = currentMissions.list || [];
          this.paginationInfo = currentMissions.paginationInfo || null;
        }
      });

      effect(() => {
        const currentDepartments = this.departmentsSignal?.();
        if (currentDepartments) {
          this.departments = currentDepartments;
        }
      });
    });

    this.initializeActionList();
    this.buildStatusFilterOptions();

    // Re-initialize action list when language changes
    this.translateService.onLangChange.subscribe(() => {
      this.initializeActionList();
      this.buildStatusFilterOptions();
    });
  }

  protected override getBreadcrumbKeys(): {
    labelKey: string;
    icon?: string;
    routerLink?: string;
  }[] {
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
      [this.translateService.instant('WORK_MISSIONS.CREATOR_DEPARTMENT')]: this.lookupName(
        model.creatorDepartment
      ),
      [this.translateService.instant('WORK_MISSIONS.STATUS')]: model.status
        ? this.translateService.instant(workMissionStatusTextKey(model.status))
        : '',
    };
  }

  /** Department names in the current language. */
  lookupName(item?: { nameAr?: string; nameEn?: string | null } | null): string {
    if (!item) return '';
    return (this.isCurrentLanguageEnglish() ? item.nameEn || item.nameAr : item.nameAr) ?? '';
  }

  /** Status options with their label resolved for the filter dropdown. */
  private buildStatusFilterOptions(): void {
    this.statusFilterOptions = this.statusOptions.map((option) => ({
      value: option.value,
      label: this.translateService.instant(option.labelKey),
    }));
  }
  addOrEditModel(mission?: WorkMission): void {
    this.openDialog(mission ?? new WorkMission());
  }
  // Component methods

  viewMission(mission: WorkMission): void {
    const missionObj = mission || new WorkMission();
    const viewMode = ViewModeEnum.EDIT;
    this.openBaseDialog(ViewMissionDataPopupComponent as any, mission, viewMode);
  }

  openAssignEmployeesDialog(mission: WorkMission): void {
    const viewMode = ViewModeEnum.EDIT;
    const data = {
      departments: this.departments,
    };
    this.openBaseDialog(AssignEmployeesComponent as any, mission, viewMode, data);
  }

  editMission(mission: WorkMission): void {
    const dialogRef = this.dialog.open(AddNewMissionPopupComponent, {
      width: '100%',
      maxWidth: '1024px',
      data: { mission, isEdit: true },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // this.loadData();
      }
    });
  }

  deleteMission(missionId: number): void {
    // Implement confirmation dialog and delete logic
    this.deleteModel(missionId);
  }

  setSelectedModel(model: WorkMission) {
    this.selectedModel = model;
    this.initializeActionList();
  }

  downloadMissionPdf(mission: WorkMission): void {
    if (this.downloadingMissionId !== undefined) return;

    this.downloadingMissionId = mission.id;
    this.service
      .exportMissionPdf(this.langService.getCurrentLanguage(), { id: mission.id })
      .pipe(finalize(() => (this.downloadingMissionId = undefined)))
      .subscribe({
        next: (blob) => {
          if (!blob || blob.size === 0) {
            this.alertsService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
            return;
          }

          downloadBlobData(blob, this.getMissionPdfFileName(mission));
        },
        error: () => {
          this.alertsService.showErrorMessage({ messages: ['COMMON.ERROR'] });
        },
      });
  }

  private getMissionPdfFileName(mission: WorkMission): string {
    const title = this.translateService.instant('WORK_MISSIONS.MISSION_PDF_FILE_NAME');
    const missionName = this.isCurrentLanguageEnglish() ? mission.nameEn : mission.nameAr;
    return `${missionName ? `${title} - ${missionName}` : title}.pdf`;
  }

  // Edit/Delete follow the server's per-row flags: only the creator, and only until HR decides.
  private initializeActionList(): void {
    const mission = this.selectedModel;
    const items: MenuItem[] = [];
    if (!mission || mission.canEdit) {
      items.push({
        label: this.translateService.instant('COMMON.EDIT'),
        command: () => {
          this.addOrEditModel(this.selectedModel);
        },
      });
    }
    if (!mission || mission.canDelete) {
      if (items.length) {
        items.push({ separator: true });
      }
      items.push({
        label: this.translateService.instant('COMMON.DELETE'),
        command: () => {
          this.deleteMission(this.selectedModel!.id);
        },
      });
    }
    this.actionList = items;
  }

  resetFilter(): void {
    this.filterModel = new WorkMissionFilter(); // fresh empty filter
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
}
