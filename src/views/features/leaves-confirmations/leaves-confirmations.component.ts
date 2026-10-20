import { Component, inject, OnInit } from '@angular/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { PaginatorModule } from 'primeng/paginator';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogConfig } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { Leave } from '@/models/features/lookups/leave/leave';
import { LeaveFilter } from '@/models/features/lookups/leave/leave-filter';
import { LeaveService } from '@/services/features/lookups/leave.service';
import { LeaveTypeService } from '@/services/features/lookups/leave-type.service';
import { UserService } from '@/services/features/user.service';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { LEAVE_STATUS_ENUM } from '@/enums/leave-status-enum';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { LeavesViewPopupComponent } from '../leaves/leaves-view-popup/leaves-view-popup.component';
import { LeavesAddEditPopupComponent } from '../leaves/leaves-add-edit-popup/leaves-add-edit-popup.component';
import { formatDateOnly } from '@/utils/general-helper';
import { AuthService } from '@/services/auth/auth.service';
import { CustomValidators } from '@/validators/custom-validators';
import {
  leaveStatusBadgeClass,
  leaveStatusDotClass,
  leaveStatusTextKey,
} from '@/utils/leave-status';

@Component({
  selector: 'app-leaves-confirmations',
  imports: [
    CommonModule,
    FormsModule,
    Breadcrumb,
    TableModule,
    TabsModule,
    PaginatorModule,
    DatePickerModule,
    SelectModule,
    InputTextModule,
    TranslatePipe,
  ],
  templateUrl: './leaves-confirmations.component.html',
  styleUrl: './leaves-confirmations.component.scss',
})
export default class LeavesConfirmationsComponent
  extends BaseListComponent<Leave, LeavesAddEditPopupComponent, LeaveService, LeaveFilter>
  implements OnInit
{
  override dialogSize = {
    width: '100%',
    maxWidth: '1024px',
  };
  leaveService = inject(LeaveService);
  leaveTypeService = inject(LeaveTypeService);
  userService = inject(UserService);
  authService = inject(AuthService);
  // 'manager': leaves waiting at a manager level the caller decides (and ones he decided);
  // 'hr': every leave in the caller's HR scope. A user with both roles switches with tabs; the
  // route resolver loads the same list the page starts on.
  readonly showManagerTab = !!this.authService.isDepartmentManager;
  readonly showHrTab = !!this.authService.isHROfficer;
  mode: 'manager' | 'hr' = this.showHrTab ? 'hr' : 'manager';
  filterModel: LeaveFilter = new LeaveFilter();
  leaveTypes: BaseLookupModel[] = [];
  employees: UsersWithDepartmentLookup[] = [];
  departments: BaseLookupModel[] = [];
  leaveStatusEnum = LEAVE_STATUS_ENUM;

  override get service() {
    return this.leaveService;
  }

  override initListComponent(): void {
    this.leaveTypeService.getLookup().subscribe((res) => {
      this.leaveTypes = res;
    });
    this.userService.getMyDepartmentUsersLookup().subscribe((res) => {
      this.employees = res;
    });
    this.userService.getMyDepartmentsLookup().subscribe((res) => {
      this.departments = res;
    });
  }

  override loadList() {
    return this.mode === 'hr'
      ? this.service.loadPaginated(this.paginationParams, { ...this.appliedFilterModel! })
      : this.service.loadApprovalsPaginated(this.paginationParams, {
          ...this.appliedFilterModel!,
        });
  }

  onModeChange(mode: string | number): void {
    if (mode === this.mode) return;
    this.mode = mode === 'hr' ? 'hr' : 'manager';
    this.search();
  }

  get listTitleKey(): string {
    return this.mode === 'hr'
      ? 'LEAVES_PAGE.INCOMING_LEAVES_LIST'
      : 'LEAVES_PAGE.AWAITING_MY_APPROVAL_LIST';
  }

  override exportExcel(fileName: string = 'data.xlsx'): void {
    const allDataParams = {
      ...this.paginationParams,
      pageNumber: 1,
      pageSize: CustomValidators.defaultLengths.INT_MAX,
    };
    const fetchAll =
      this.mode === 'hr'
        ? this.service.loadPaginated(allDataParams, { ...this.appliedFilterModel! })
        : this.service.loadApprovalsPaginated(allDataParams, { ...this.appliedFilterModel! });

    fetchAll.subscribe({
      next: (response) => {
        const fullList = response.list || [];
        if (fullList.length === 0) {
          this.alertsService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
          return;
        }
        this.writeExcelFile(this.mapModelsToExcelRows(fullList), fileName);
      },
      error: (_) => {
        this.alertsService.showErrorMessage({ messages: ['COMMON.ERROR'] });
      },
    });
  }

  override openDialog(model: Leave): void {
    const dialogConfig: MatDialogConfig = new MatDialogConfig();
    dialogConfig.data = { model };
    dialogConfig.width = this.dialogSize.width;
    dialogConfig.maxWidth = this.dialogSize.maxWidth;
    this.matDialog.open(LeavesViewPopupComponent as any, dialogConfig);
  }

  openTakeActionDialog(model: Leave): void {
    if (!model.isNew() && !model.isAccepted()) {
      this.openDialog(model);
      return;
    }
    this.openBaseDialog(
      LeavesAddEditPopupComponent as any,
      model,
      ViewModeEnum.TAKE_ACTION,
      {
        employees: this.employees,
        departments: this.departments,
        leaveTypes: this.leaveTypes,
      },
      // Only an HR decision may amend the dates; the server says which this caller's would be
      // (a user who is also the stage's manager decides as manager even on the HR tab).
      { canChangeDates: !!model.canAmendDates }
    );
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'LEAVES_PAGE.LEAVES_CONFIRMATIONS' }];
  }

  protected override getPdfExportRequest(): Observable<Blob> {
    return this.service.exportDepartmentLeavesPdf(
      this.langService.getCurrentLanguage(),
      this.getPdfExportFilterOptions()
    );
  }

  protected override mapModelToExcelRow(model: Leave): { [key: string]: any } {
    return {
      [this.translateService.instant('LEAVES_PAGE.NATIONAL_ID')]: model.employee?.nationalId ?? '',
      [this.translateService.instant('LEAVES_PAGE.DEPARTMENT')]: this.departmentName(model),
      [this.translateService.instant('LEAVES_PAGE.EMPLOYEE_NAME')]: this.employeeName(model),
      [this.translateService.instant('LEAVES_PAGE.LEAVE_TYPE')]: this.leaveTypeName(model),
      [this.translateService.instant('LEAVES_PAGE.DATE_FROM')]: formatDateOnly(model.dateFrom),
      [this.translateService.instant('LEAVES_PAGE.DATE_TO')]: formatDateOnly(model.dateTo),
      [this.translateService.instant('LEAVES_PAGE.REQUEST_STATUS')]: this.getStatusText(model),
    };
  }

  get optionLabel(): string {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }

  get requestStatuses(): { id: number; label: string }[] {
    return [
      { id: LEAVE_STATUS_ENUM.New, label: this.translateService.instant('LEAVES_PAGE.NEW') },
      {
        id: LEAVE_STATUS_ENUM.Accepted,
        label: this.translateService.instant('LEAVES_PAGE.ACCEPTED'),
      },
      {
        id: LEAVE_STATUS_ENUM.Rejected,
        label: this.translateService.instant('LEAVES_PAGE.REJECTED'),
      },
    ];
  }

  get filteredEmployees(): UsersWithDepartmentLookup[] {
    return this.filterModel.fkDepartmentId
      ? this.employees.filter((emp) => emp.departmentId === this.filterModel.fkDepartmentId)
      : this.employees;
  }

  onDepartmentChange(): void {
    if (
      this.filterModel.fkEmployeeId &&
      !this.filteredEmployees.some((emp) => emp.id === this.filterModel.fkEmployeeId)
    ) {
      this.filterModel.fkEmployeeId = null;
    }
  }

  employeeName(leave: Leave): string {
    const lang = this.langService.getCurrentLanguage();
    return (
      (lang === LANGUAGE_ENUM.ARABIC
        ? leave.employee?.nameAr
        : (leave.employee?.nameEn ?? leave.employee?.nameAr)) ?? ''
    );
  }

  departmentName(leave: Leave): string {
    const lang = this.langService.getCurrentLanguage();
    return (
      (lang === LANGUAGE_ENUM.ARABIC
        ? leave.employee?.department?.nameAr
        : (leave.employee?.department?.nameEn ?? leave.employee?.department?.nameAr)) ?? ''
    );
  }

  leaveTypeName(leave: Leave): string {
    const lang = this.langService.getCurrentLanguage();
    return (
      (lang === LANGUAGE_ENUM.ARABIC
        ? leave.leaveType?.nameAr
        : (leave.leaveType?.nameEn ?? leave.leaveType?.nameAr)) ?? ''
    );
  }

  getStatusBadgeClass(leave: Leave): string {
    return leaveStatusBadgeClass(leave);
  }

  getStatusBadgeDotClass(leave: Leave): string {
    return leaveStatusDotClass(leave);
  }

  getStatusText(leave: Leave): string {
    const key = leaveStatusTextKey(leave);
    return key ? this.translateService.instant(key) : '';
  }
}
