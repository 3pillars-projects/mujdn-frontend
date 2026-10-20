import { Component, inject, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogConfig } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize } from 'rxjs';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { AuthService } from '@/services/auth/auth.service';
import { downloadBlobData } from '@/utils/utils';
import { Leave } from '@/models/features/lookups/leave/leave';
import { LeaveFilter } from '@/models/features/lookups/leave/leave-filter';
import { LeaveService } from '@/services/features/lookups/leave.service';
import { LeaveTypeService } from '@/services/features/lookups/leave-type.service';
import { UserService } from '@/services/features/user.service';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { LEAVE_STATUS_ENUM } from '@/enums/leave-status-enum';
import { LEAVE_SUBMISSION_TYPE_ENUM } from '@/enums/leave-submission-type-enum';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { LeavesViewPopupComponent } from '../leaves-view-popup/leaves-view-popup.component';
import { LeavesAddEditPopupComponent } from '../leaves-add-edit-popup/leaves-add-edit-popup.component';
import { formatDateOnly } from '@/utils/general-helper';
import {
  leaveStatusBadgeClass,
  leaveStatusDotClass,
  leaveStatusTextKey,
} from '@/utils/leave-status';
import { CustomValidators } from '@/validators/custom-validators';
import { PaginationInfo } from '@/models/shared/response/pagination-info';

@Component({
  selector: 'app-other-leaves',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    PaginatorModule,
    DatePickerModule,
    SelectModule,
    InputTextModule,
    TranslatePipe,
  ],
  templateUrl: './other-leaves.component.html',
  styleUrl: './other-leaves.component.scss',
})
export class OtherLeavesComponent
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
  downloadingLeaveId?: number;
  filterModel: LeaveFilter = new LeaveFilter();
  leaveTypes: BaseLookupModel[] = [];
  employees: UsersWithDepartmentLookup[] = [];
  departments: BaseLookupModel[] = [];
  leaveStatusEnum = LEAVE_STATUS_ENUM;

  override get service() {
    return this.leaveService;
  }

  override initListComponent(): void {
    // The container route resolves the MY-leaves list; this embedded tab must not
    // consume (or mutate) that shared snapshot state — start fresh and load its own page.
    this.list = [];
    this.paginationInfo = new PaginationInfo();
    this.loadLookups();
    this.loadList().subscribe({
      next: (response) => this.handleLoadListSuccess(response),
      error: () => this.handleLoadListError(),
    });
  }

  loadLookups(): void {
    this.leaveTypeService.getLookup().subscribe((res) => {
      this.leaveTypes = res;
    });
    this.leaveService.getEmployeesLookup().subscribe((res) => {
      this.employees = res;
    });
    this.userService.getMyDepartmentsLookup().subscribe((res) => {
      this.departments = res;
    });
  }

  override loadList() {
    return this.service.loadMyCreatedLeavesPaginated(this.paginationParams, {
      ...this.appliedFilterModel!,
    });
  }

  override openDialog(model: Leave): void {
    const dialogConfig: MatDialogConfig = new MatDialogConfig();
    dialogConfig.data = { model, isSubordinateLeave: true };
    dialogConfig.width = this.dialogSize.width;
    dialogConfig.maxWidth = this.dialogSize.maxWidth;
    this.matDialog.open(LeavesViewPopupComponent as any, dialogConfig);
  }

  addOrEditModel(leave?: Leave): void {
    // The server decides (`canEdit`): a leave filed on behalf of an employee until HR decides it,
    // or the manager's own request (listed here too) until someone approves it.
    if (leave?.id && !leave.canEdit) {
      this.openDialog(leave);
      return;
    }
    const model = leave ?? new Leave();
    const viewMode = model.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    // His own request keeps its employee: edit it without the employee picker.
    const isSelf = !!model.id && model.submissionType !== LEAVE_SUBMISSION_TYPE_ENUM.OnBehalf;
    this.openBaseDialog(
      LeavesAddEditPopupComponent as any,
      model,
      viewMode,
      {
        employees: this.employees,
        departments: this.departments,
        leaveTypes: this.leaveTypes,
      },
      { isSelf }
    );
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'LEAVES_PAGE.OTHER_LEAVES_LIST' }];
  }

  /** Downloading a leave as a file is offered to department managers, on accepted leaves only. */
  showDownloadPdf(leave: Leave): boolean {
    return !!this.authService.isDepartmentManager && leave.isAccepted();
  }

  downloadLeavePdf(leave: Leave): void {
    if (this.downloadingLeaveId !== undefined) return;

    this.downloadingLeaveId = leave.id;
    this.service
      .exportLeavePdf(this.langService.getCurrentLanguage(), { id: leave.id })
      .pipe(finalize(() => (this.downloadingLeaveId = undefined)))
      .subscribe({
        next: (blob) => {
          if (!blob || blob.size === 0) {
            this.alertsService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
            return;
          }

          downloadBlobData(blob, this.getLeavePdfFileName(leave));
        },
        error: () => {
          this.alertsService.showErrorMessage({ messages: ['COMMON.ERROR'] });
        },
      });
  }

  private getLeavePdfFileName(leave: Leave): string {
    const title = this.translateService.instant('LEAVES_PAGE.LEAVE_PDF_FILE_NAME');
    const employeeName = this.employeeName(leave);
    return `${employeeName ? `${title} - ${employeeName}` : title}.pdf`;
  }

  protected override getPdfExportRequest(): Observable<Blob> {
    return this.service.exportMyCreatedLeavesPdf(
      this.langService.getCurrentLanguage(),
      this.getPdfExportFilterOptions()
    );
  }

  override exportExcel(fileName: string = 'data.xlsx'): void {
    const allDataParams = {
      ...this.paginationParams,
      pageNumber: 1,
      pageSize: CustomValidators.defaultLengths.INT_MAX,
    };

    this.service
      .loadMyCreatedLeavesPaginated(allDataParams, { ...this.appliedFilterModel! })
      .subscribe({
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
