import { Component, inject, OnInit } from '@angular/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { LeaveTypePopupComponent } from '@/views/features/lookups/leaves-settings/leave-type-popup/leave-type-popup.component';
import { LeaveTypeFilter } from '@/models/features/lookups/LeaveType-filter';
import { LeaveType } from '@/models/features/lookups/LeaveType';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LeaveTypeService } from '@/services/features/lookups/leave-type.service';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { EnglishNamePipe } from '@/pipes/english-name.pipe';
import { getEnglishName } from '@/utils/localized-name';

@Component({
  selector: 'app-leaves-settings',
  standalone: true,
  imports: [
    Breadcrumb,
    TableModule,
    PaginatorModule,
    InputTextModule,
    FormsModule,
    TranslatePipe,
    EnglishNamePipe,
  ],
  providers: [LeaveTypeService],
  templateUrl: './leaves-settings.component.html',
  styleUrl: './leaves-settings.component.scss',
})
export default class LeavesSettingsComponent
  extends BaseListComponent<LeaveType, LeaveTypePopupComponent, LeaveTypeService, LeaveTypeFilter>
  implements OnInit
{
  override dialogSize = {
    width: '100%',
    maxWidth: '600px',
  };
  leaveTypeService = inject(LeaveTypeService);
  filterModel: LeaveTypeFilter = new LeaveTypeFilter();

  override get service() {
    return this.leaveTypeService;
  }

  override initListComponent(): void {}

  override openDialog(model: LeaveType): void {
    const viewMode = model.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.openBaseDialog(LeaveTypePopupComponent as any, model, viewMode);
  }

  addOrEditModel(leaveType?: LeaveType): void {
    this.openDialog(leaveType ?? new LeaveType());
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'LEAVE_TYPES_PAGE.LEAVES_SETTINGS' }];
  }

  protected override mapModelToExcelRow(model: LeaveType): { [key: string]: any } {
    return {
      [this.translateService.instant('LEAVE_TYPES_PAGE.LEAVE_TYPE_IN_ARABIC')]: model.nameAr,
      [this.translateService.instant('LEAVE_TYPES_PAGE.LEAVE_TYPE_IN_ENGLISH')]:
        getEnglishName(model),
    };
  }
}
