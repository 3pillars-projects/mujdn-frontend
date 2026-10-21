import { Component, inject, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
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
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { LEAVE_STATUS_ENUM } from '@/enums/leave-status-enum';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LeavesViewPopupComponent } from '../leaves-view-popup/leaves-view-popup.component';
import { LeavesAddEditPopupComponent } from '../leaves-add-edit-popup/leaves-add-edit-popup.component';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { formatDateOnly } from '@/utils/general-helper';
import {
  leaveStatusBadgeClass,
  leaveStatusDotClass,
  leaveStatusTextKey,
} from '@/utils/leave-status';
import {
  getLeaveRequestStatus,
  leaveRequestStatusOptions,
  setLeaveRequestStatus,
} from '@/utils/leave-status-filter';
import { CustomValidators } from '@/validators/custom-validators';

@Component({
  selector: 'app-my-leaves',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    PaginatorModule,
    DatePickerModule,
    SelectModule,
    TranslatePipe,
  ],
  templateUrl: './my-leaves.component.html',
  styleUrl: './my-leaves.component.scss',
})
export class MyLeavesComponent
  extends BaseListComponent<Leave, LeavesViewPopupComponent, LeaveService, LeaveFilter>
  implements OnInit
{
  override dialogSize = {
    width: '100%',
    maxWidth: '1024px',
  };
  leaveService = inject(LeaveService);
  leaveTypeService = inject(LeaveTypeService);
  filterModel: LeaveFilter = new LeaveFilter();
  leaveTypes: BaseLookupModel[] = [];
  leaveStatusEnum = LEAVE_STATUS_ENUM;

  override get service() {
    return this.leaveService;
  }

  override initListComponent(): void {
    this.leaveTypeService.getLookup().subscribe((res) => {
      this.leaveTypes = res;
    });
  }

  override loadList() {
    return this.service.loadMyLeavesPaginated(this.paginationParams, {
      ...this.appliedFilterModel!,
    });
  }

  /**
   * Files or edits the caller's own leave. It goes to his manager(s) and then HR; the server
   * decides the route and whether an existing leave may still be edited (`canEdit`).
   */
  addOrEditOwnLeave(leave?: Leave): void {
    if (leave?.id && !leave.canEdit) {
      this.openDialog(leave);
      return;
    }
    const model = leave ?? new Leave();
    const viewMode = model.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.openBaseDialog(
      LeavesAddEditPopupComponent as any,
      model,
      viewMode,
      { leaveTypes: this.leaveTypes },
      { isSelf: true }
    );
  }

  override openDialog(model: Leave): void {
    const dialogConfig: MatDialogConfig = new MatDialogConfig();
    dialogConfig.data = { model };
    dialogConfig.width = this.dialogSize.width;
    dialogConfig.maxWidth = this.dialogSize.maxWidth;
    this.matDialog.open(LeavesViewPopupComponent as any, dialogConfig);
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'LEAVES_PAGE.MY_LEAVES_LIST' }];
  }

  protected override getPdfExportRequest(): Observable<Blob> {
    return this.service.exportMyLeavesPdf(
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

    this.service.loadMyLeavesPaginated(allDataParams, { ...this.appliedFilterModel! }).subscribe({
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
      [this.translateService.instant('LEAVES_PAGE.LEAVE_TYPE')]: this.leaveTypeName(model),
      [this.translateService.instant('LEAVES_PAGE.DATE_FROM')]: formatDateOnly(model.dateFrom),
      [this.translateService.instant('LEAVES_PAGE.DATE_TO')]: formatDateOnly(model.dateTo),
      [this.translateService.instant('LEAVES_PAGE.REQUEST_STATUS')]: this.getStatusText(model),
    };
  }

  get optionLabel(): string {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }

  get requestStatuses(): { id: string; label: string }[] {
    return leaveRequestStatusOptions.map((option) => ({
      id: option.id,
      label: this.translateService.instant(`LEAVES_PAGE.${option.id}`),
    }));
  }

  get requestStatus(): string | null {
    return getLeaveRequestStatus(this.filterModel);
  }

  set requestStatus(id: string | null) {
    setLeaveRequestStatus(this.filterModel, id);
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
