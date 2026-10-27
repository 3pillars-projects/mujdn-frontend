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
import { Menu, MenuModule } from 'primeng/menu';
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
    InputTextModule,
    PaginatorModule,
    TranslatePipe,
    Select,
    MenuModule,
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
  /** Items of the row ⋮ menu, rebuilt for the row that opens it. */
  actionList: MenuItem[] = [];
  readonly dangerItemClass = 'mission-menu-danger';
  /** Marks the Take action item, shown with the same red dot as the ⋮ button. */
  readonly pendingItemClass = 'mission-menu-pending';
  @ViewChild('missionContainer', { static: true }) missionContainer!: ElementRef;
  @ViewChild('rowMenu') rowMenu?: Menu;

  // Services and dependencies
  workMissionService = inject(WorkMissionService);
  private injector = inject(Injector);
  dialog = inject(MatDialog);

  // Filter model
  filterOptions: WorkMissionFilter = new WorkMissionFilter();
  // Accept signals as inputs
  @Input() missionsSignal!: WritableSignal<PaginatedList<WorkMission>>;
  @Input() departmentsSignal!: WritableSignal<BaseLookupModel[]>;
  /** Whether the "Add new mission" button shows (department work-missions setting). */
  @Input() canCreate = false;

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

    this.buildStatusFilterOptions();

    // The row menu is rebuilt each time it opens, so only the filter labels need refreshing.
    this.translateService.onLangChange.subscribe(() => {
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
      [this.translateService.instant('WORK_MISSIONS.STATUS')]: model.status
        ? this.translateService.instant(workMissionStatusTextKey(model.status))
        : '',
    };
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

  /** The details popup carries Approve and Reject for a mission the caller may decide. */
  takeAction(mission: WorkMission): void {
    this.viewMission(mission);
  }

  /** A new mission's main action: assign its first employees. */
  canStartAssignment(mission: WorkMission): boolean {
    return mission.status === WorkMissionStatusEnum.Draft && !!mission.canAssign;
  }

  /** A pending mission HR covering the creator's department can decide; offered from the ⋮ menu. */
  canDecide(mission: WorkMission): boolean {
    return mission.status === WorkMissionStatusEnum.PendingHrApproval && !!mission.canTakeAction;
  }

  /**
   * Once a mission leaves draft its assignment moves into the ⋮ menu: pending missions for their
   * creator and covering HR, approved ones for Super HR only (the server sets `canAssign`).
   */
  canEditAssignment(mission: WorkMission): boolean {
    return (
      !!mission.canAssign &&
      (mission.status === WorkMissionStatusEnum.PendingHrApproval ||
        mission.status === WorkMissionStatusEnum.Approved)
    );
  }

  /**
   * Download sits in the row except on a new mission, where Assign employees takes its place and
   * Download moves into the ⋮ menu. The menu shows only when it has something to offer.
   */
  hasRowMenu(mission: WorkMission): boolean {
    return (
      this.canStartAssignment(mission) ||
      this.canDecide(mission) ||
      !!mission.canEdit ||
      !!mission.canDelete ||
      this.canEditAssignment(mission)
    );
  }

  openRowMenu(event: Event, mission: WorkMission): void {
    this.selectedModel = mission;
    this.actionList = this.buildRowActions(mission);
    this.rowMenu?.toggle(event);
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

  /**
   * The ⋮ menu follows the server's per-row flags: the creator and HR covering the creator's
   * department may edit, reassign or delete until HR decides; after approval only Super HR may
   * still edit or reassign (never delete); anyone who sees the row may download it.
   */
  private buildRowActions(mission: WorkMission): MenuItem[] {
    const label = (key: string) => this.translateService.instant(key);
    const items: MenuItem[] = [];
    if (this.canDecide(mission)) {
      items.push({
        label: label('WORK_MISSIONS.TAKE_ACTION'),
        styleClass: this.pendingItemClass,
        command: () => this.takeAction(mission),
      });
    }
    if (mission.canEdit) {
      items.push({
        label: label('WORK_MISSIONS.EDIT_MISSION'),
        command: () => this.addOrEditModel(mission),
      });
    }
    // Download is a row button unless Assign employees has taken its place.
    if (this.canStartAssignment(mission)) {
      items.push({
        label: label('WORK_MISSIONS.DOWNLOAD_FILE'),
        disabled: this.downloadingMissionId !== undefined,
        command: () => this.downloadMissionPdf(mission),
      });
    }
    // A new mission's assignment is the main row action; once pending, it moves here.
    if (this.canEditAssignment(mission)) {
      items.push({
        label: label('WORK_MISSIONS.EDIT_ASSIGNMENT'),
        command: () => this.openAssignEmployeesDialog(mission),
      });
    }
    if (mission.canDelete) {
      items.push({
        label: label('WORK_MISSIONS.DELETE_MISSION'),
        styleClass: this.dangerItemClass,
        command: () => this.deleteModel(mission.id),
      });
    }
    // Thin dividers between the items, as in the design.
    return items.flatMap((item, index) => (index ? [{ separator: true }, item] : [item]));
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
