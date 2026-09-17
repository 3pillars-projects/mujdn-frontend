import { Component, inject, OnInit } from '@angular/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { AddPermissionPopupComponent } from '../popups/add-permission-popup/add-permission-popup.component';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { Permission } from '@/models/features/lookups/permission/permission';
import { PermissionFilter } from '@/models/features/lookups/permission/permission-filter';
import { PermissionService } from '@/services/features/lookups/permission.service';
import { LanguageService } from '@/services/shared/language.service';
import { CommonModule, formatDate } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';
import { Select } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { PermissionTypeService } from '@/services/features/lookups/permission-type.service';
import { DepartmentService } from '@/services/features/lookups/department.service';
import { PermissionStatusService } from '@/services/features/lookups/permission-status.service';
import { UserService } from '@/services/features/user.service';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { PermissionReasonService } from '@/services/features/lookups/permission-reason.service';
import { PermissionsDataPopupComponent } from '../popups/permissions-data-popup/permissions-data-popup.component';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { MatDialogConfig } from '@angular/material/dialog';
import { PERMISSION_STATUS_ENUM } from '@/enums/permission-status-enum';
import { PERMISSION_TABS_ENUM } from '@/enums/permission-tabs-enum';
import { CustomValidators } from '@/validators/custom-validators';
import { AuthService } from '@/services/auth/auth.service';
import { finalize, Observable } from 'rxjs';
import { downloadBlobData } from '@/utils/utils';

@Component({
  selector: 'app-permissions-list',
  imports: [
    Breadcrumb,
    FormsModule,
    Select,
    DatePickerModule,
    FluidModule,
    TableModule,
    CommonModule,
    RouterModule,
    PaginatorModule,
    TabsModule,
    InputTextModule,
    TranslatePipe,
  ],

  templateUrl: './permissions-list.component.html',
  styleUrl: './permissions-list.component.scss',
})
export default class PermissionsListComponent
  extends BaseListComponent<
    Permission,
    AddPermissionPopupComponent,
    PermissionService,
    PermissionFilter
  >
  implements OnInit
{
  activeTabIndex = 0;
  languageService = inject(LanguageService); // Assuming you have a LanguageService to handle language changes
  override dialogSize = {
    width: '100%',
    maxWidth: '800px',
  };
  permissionService = inject(PermissionService);
  permissionTypeService = inject(PermissionTypeService);
  departmentService = inject(DepartmentService);
  prmissionStatusService = inject(PermissionStatusService);
  prmissionReasonService = inject(PermissionReasonService);
  userService = inject(UserService);
  permissionStatusEnum = PERMISSION_STATUS_ENUM;
  permissionTypes: BaseLookupModel[] = [];
  departments: BaseLookupModel[] = [];
  users: BaseLookupModel[] = [];
  prmissionStatuses: BaseLookupModel[] = [];
  prmissionReasons: BaseLookupModel[] = [];
  filterModel: PermissionFilter = new PermissionFilter();
  viewMode = ViewModeEnum;
  isIncomingPermissions: boolean = false;
  authService = inject(AuthService);
  downloadingPermissionId?: number;

  override get service() {
    return this.permissionService;
  }

  override initListComponent(): void {
    this.permissionTypeService.getLookup().subscribe((res: BaseLookupModel[]) => {
      this.permissionTypes = res;
    });
    this.userService.getMyDepartmentsLookup().subscribe((res: BaseLookupModel[]) => {
      this.departments = res;
    });
    this.prmissionStatusService.getLookup().subscribe((res: BaseLookupModel[]) => {
      this.prmissionStatuses = res;
    });
    this.userService.getMyDepartmentUsersLookup().subscribe((res: BaseLookupModel[]) => {
      this.users = res;
    });
    this.prmissionReasonService.getLookup().subscribe((res: BaseLookupModel[]) => {
      this.prmissionReasons = res;
    });
  }

  override openDialog(model: Permission, viewMode?: ViewModeEnum): void {
    const lookups = {
      permissionTypes: this.permissionTypes,
      prmissionReasons: this.prmissionReasons,
    };
    this.openBaseDialog(AddPermissionPopupComponent as any, model, viewMode!, lookups);
  }

  addOrEditModel(permission?: Permission) {
    const viewMode = permission ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    permission = permission || new Permission();
    this.openDialog(permission, viewMode);
  }

  mapIncomingRequestsToExcelRow(model: Permission): { [key: string]: any } {
    return {
      [this.translateService.instant('PERMISSION_PAGE.PERMISSION_TYPE')]:
        model.getPermissionTypeName(),
      [this.translateService.instant('EMPLOYEES_PAGE.EMPLOYEE_NAME')]: model.getCreationUserName(),
      [this.translateService.instant('DEPARTMENTS_HEADER_PAGE.DEPARTMENT_NAME')]:
        model.getPermissionDepartmentName(),
      [this.translateService.instant('PERMISSION_PAGE.PERMISSION_DATE')]: !!model.permissionDate ? formatDate(model.permissionDate, 'd/M/yyyy', 'en-US') : '',
      [this.translateService.instant('PERMISSION_PAGE.PERMISSION_REASON')]:
        model.getPermissionReasonName(),
      [this.translateService.instant('PERMISSION_PAGE.PERMISSION_STATUS')]: model.getStatusName(),
    };
  }
  protected override mapModelToPdfRow(model: Permission): { [key: string]: any } {
    return this.mapModelToExcelRow(model);
  }

  protected override getPdfTitle(): { ar: string; en: string } {
    return {
      ar: 'قائمة الاذونات',
      en: 'Permissions List',
    };
  }

  protected override getPdfExportRequest(isIncomingPermissions: boolean = false): Observable<Blob> {
    return isIncomingPermissions
      ? this.service.exportDepartmentPermissionsPdf(
          this.langService.getCurrentLanguage(),
          this.getPdfExportFilterOptions(isIncomingPermissions)
        )
      : super.getPdfExportRequest(isIncomingPermissions);
  }
  getPropertyName() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';
  }

  loadIncomingPermissions() {
    this.service
      .loadDepartmentPermissionPaginated(this.paginationParams, { ...this.appliedFilterModel! })
      .subscribe({
        next: (response) => {
          this.list = response.list || [];

          if (response.paginationInfo) {
            this.paginationInfoMap(response);
          } else {
            this.paginationInfo.totalItems = this.list.length;
          }
        },
        error: (_) => {
          this.list = [];
          this.paginationInfo.totalItems = 0;
        },
      });
  }

  clickIncomingPermissionTab() {
    this.isIncomingPermissions = true;
    this.filterModel = new PermissionFilter();
    this.activeTabIndex == PERMISSION_TABS_ENUM.MY_PERMISSIONS && this.loadIncomingPermissions();
    this.activeTabIndex = PERMISSION_TABS_ENUM.INCOMING_PERMISSIONS;
  }

  clickMyPermissionTab() {
    if (this.activeTabIndex == PERMISSION_TABS_ENUM.INCOMING_PERMISSIONS) {
      this.resetSearch();
    }
    this.activeTabIndex = PERMISSION_TABS_ENUM.MY_PERMISSIONS;
  }

  departmentPermissionSearch() {
    this.appliedFilterModel = { ...this.filterModel };
    this.paginationParams.pageNumber = 1;
    this.first = 0;
    this.loadIncomingPermissions();
  }

  departmentPermissionResetSearch() {
    this.filterModel = new PermissionFilter();
    this.appliedFilterModel = new PermissionFilter();
    this.paginationParams.pageNumber = 1;
    this.paginationParams.pageSize = 10;
    this.first = 0;
    this.loadIncomingPermissions();
  }

  openDataDialog(
    model: Permission,
    canTakeAction?: ViewModeEnum,
    isIncomingPermission: boolean = false
  ): void {
    let dialogConfig: MatDialogConfig = new MatDialogConfig();
    dialogConfig.width = this.dialogSize.width;
    dialogConfig.maxWidth = this.dialogSize.maxWidth;
    dialogConfig.data = {
      model: model,
      ViewMode: canTakeAction,
      isIncomingPermission: isIncomingPermission,
    };
    const dialogRef = this.matDialog.open(PermissionsDataPopupComponent as any, dialogConfig);

    dialogRef.afterClosed().subscribe((result: DIALOG_ENUM) => {
      if (result && result == DIALOG_ENUM.OK) {
        this.loadIncomingPermissions();
      }
    });
  }

  /** A root-department admin with no manager/HR role of their own gets the reject-after-acceptance
   * override only, never the normal accept/reject chain; a manager/HR role keeps its normal actions. */
  canTakeNormalAction(permission: Permission): boolean {
    return !!permission.canTakeAction && !this.authService.isRootDepartmentOversightOnly;
  }

  showIncomingPermissions() {
    return (
      this.authService.isDepartmentManager ||
      this.authService.isHROfficer ||
      this.authService.isRootDepartmentAdmin
    );
  }

  /** Downloading a permission as a file is offered to department managers, on accepted requests only. */
  showDownloadPdf(permission: Permission): boolean {
    return !!this.authService.isDepartmentManager && permission.isAccepted();
  }

  downloadPermissionPdf(permission: Permission): void {
    if (this.downloadingPermissionId !== undefined) return;

    this.downloadingPermissionId = permission.id;
    this.service
      .exportPermissionPdf(this.langService.getCurrentLanguage(), { id: permission.id })
      .pipe(finalize(() => (this.downloadingPermissionId = undefined)))
      .subscribe({
        next: (blob) => {
          if (!blob || blob.size === 0) {
            this.alertsService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
            return;
          }

          downloadBlobData(blob, this.getPermissionPdfFileName(permission));
        },
        error: () => {
          this.alertsService.showErrorMessage({ messages: ['COMMON.ERROR'] });
        },
      });
  }

  private getPermissionPdfFileName(permission: Permission): string {
    const title = this.translateService.instant('PERMISSION_PAGE.PERMISSION_PDF_FILE_NAME');
    const employeeName = permission.getCreationUserName();
    return `${employeeName ? `${title} - ${employeeName}` : title}.pdf`;
  }

  showAddingPermissionButton(): boolean {
    const isManagerOfRoot =
      this.authService.isdepartmentActualManager && this.authService.isRootdepartment;
    return !isManagerOfRoot;
  }

  onIncomingPermissionPageChange(event: PaginatorState) {
    this.first = event.first!;
    this.rows = event.rows!;
    this.paginationParams.pageNumber = Math.floor(this.first / this.rows) + 1;
    this.paginationParams.pageSize = this.rows;
    this.loadIncomingPermissions();
  }

  override exportExcel(fileName: string = '', isIncomingPermissions: boolean = false): void {
    if (!fileName) {
      fileName = this.getTranslatedFileName(
        isIncomingPermissions ? 'PERMISSION_PAGE.INCOMING_REQUESTS' : 'PERMISSION_PAGE.MY_REQUESTS',
        'xlsx'
      );
    }
    const allDataParams = {
      ...this.paginationParams,
      pageNumber: 1,
      pageSize: CustomValidators.defaultLengths.INT_MAX,
    };

    const fetchAll = isIncomingPermissions
      ? this.service.loadDepartmentPermissionPaginated(allDataParams, {
          ...this.appliedFilterModel!,
        })
      : this.service.loadPaginated(allDataParams, { ...this.appliedFilterModel! });

    fetchAll.subscribe({
      next: (response) => {
        const fullList = response.list || [];
        if (fullList.length === 0) {
          this.alertsService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
          return;
        } else {
          const transformedData = this.addSequenceToExcelRows(
            fullList.map((item) =>
              isIncomingPermissions
                ? this.mapIncomingRequestsToExcelRow(item)
                : this.mapModelToExcelRow(item)
            )
          );
          this.writeExcelFile(transformedData, fileName);
        }
      },
      error: (_) => {
        this.alertsService.showErrorMessage({ messages: ['COMMON.ERROR'] });
      },
    });
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'PERMISSION_PAGE.PERMISSIONS' }];
  }

  protected override mapModelToExcelRow(model: Permission): { [key: string]: any } {
    return {
      [this.translateService.instant('PERMISSION_PAGE.PERMISSION_TYPE')]:
        model.getPermissionTypeName(),
      [this.translateService.instant('PERMISSION_PAGE.PERMISSION_DATE')]: !!model.permissionDate ? formatDate(model.permissionDate, 'd/M/yyyy', 'en-US') : '',
      [this.translateService.instant('PERMISSION_PAGE.PERMISSION_REASON')]:
        model.getPermissionReasonName(),
      [this.translateService.instant('PERMISSION_PAGE.PERMISSION_STATUS')]: model.getStatusName(),
    };
  }
}
