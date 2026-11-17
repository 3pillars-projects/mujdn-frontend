import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, input, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { PresenceInquiriesPopupComponent } from '../presence-inquiries-popup/presence-inquiries-popup.component';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { PresenceInquiry } from '@/models/features/presence-inquiry/presence-inquiry';
import { PresenceInquiryFilter } from '@/models/features/presence-inquiry/presence-inquiry-filter';
import { DepartmentService } from '@/services/features/lookups/department.service';
import { PresenceInquiryStatusService } from '@/services/features/presence-inquiry-status.service';
import { PresenceInquiryService } from '@/services/features/presence-inquiry.service';
import { TranslatePipe } from '@ngx-translate/core';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { MatDialogConfig } from '@angular/material/dialog';
import { PRESENCE_INQUIRY_STATUS_ENUM } from '@/enums/presence-inquiry-status-enum';
import { AssignEmployeeResponsibilityPopupComponent } from '../assign-employee-responsibility-popup/assign-employee-responsibility-popup.component';
import { ViewEmployeesCheckPopupComponent } from '../view-employees-check-popup/view-employees-check-popup.component';
import { UserProfileService } from '@/services/features/user-profile.service';
import { CustomValidators } from '@/validators/custom-validators';
import { LanguageService } from '@/services/shared/language.service';
import { formatDateTo12Hour } from '@/utils/general-helper';
import { Observable } from 'rxjs';
import { getLocalizedName } from '@/utils/localized-name';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

@Component({
  selector: 'app-others-presence-inquiries-list',
  imports: [
    InputTextModule,
    CommonModule,
    PaginatorModule,
    Select,
    DatePickerModule,
    TabsModule,
    TableModule,
    FormsModule,
    TranslatePipe,
    WithNameFallbackPipe,
  ],
  providers: [DatePipe],
  templateUrl: './others-presence-inquiries-list.component.html',
  styleUrl: './others-presence-inquiries-list.component.scss',
})
export class OthersPresenceInquiriesListComponent extends BaseListComponent<
  PresenceInquiry,
  PresenceInquiriesPopupComponent,
  PresenceInquiryService,
  PresenceInquiryFilter
> {
  override dialogSize = {
    width: '100%',
    maxWidth: '600px',
  };

  presenceInquiryService = inject(PresenceInquiryService);
  filterModel: PresenceInquiryFilter = new PresenceInquiryFilter();
  departments: BaseLookupModel[] = [];
  departmentService = inject(DepartmentService);
  userProfileService = inject(UserProfileService);
  presenceInquiryStatusService = inject(PresenceInquiryStatusService);
  presenceInquiryStatuses: BaseLookupModel[] = [];
  inquiryStatusEnum = PRESENCE_INQUIRY_STATUS_ENUM;
  datePipe = inject(DatePipe);
  languageService = inject(LanguageService);

  override get service() {
    return this.presenceInquiryService;
  }

  override initListComponent(): void {
    // Preload dropdown data
    this.presenceInquiryStatusService.getLookup().subscribe((res) => {
      this.presenceInquiryStatuses = res;
    });
    this.departmentService.getLookup().subscribe((res) => {
      this.departments = res;
    });
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'PRESENCE_INQUIRIES_PAGE.PRESENCE_INQUIRIES' }];
  }

  override openDialog(model: PresenceInquiry): void {
    const viewMode = model.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.openBaseDialog(PresenceInquiriesPopupComponent as any, model, viewMode);
  }

  override loadList() {
    return this.service.loadPresenceInquiriesPaginated(this.paginationParams, {
      ...this.appliedFilterModel!,
    });
  }

  addOrEditModel(presenceInquiry?: PresenceInquiry): void {
    this.openDialog(presenceInquiry ?? new PresenceInquiry());
  }

  protected override mapModelToExcelRow(model: PresenceInquiry): { [key: string]: any } {
    return {
      [this.translateService.instant('INQUIRIES_PAGE.INQUIRY_DATE')]: this.formatDate(
        model.assignedDate
      ),
      [this.translateService.instant('INQUIRIES_PAGE.INQUIRY_TIME')]: this.formatTime(
        model.assignedDate ? new Date(model.assignedDate) : undefined
      ),
      [this.translateService.instant('INQUIRIES_PAGE.ALLOWED_ATTENDANCE_PERIOD')]: model.buffer,
      [this.translateService.instant('INQUIRIES_PAGE.INQUIRY_STATUS')]: this.getStatusName(
        model.statusId ?? 0
      ),
    };
  }

  set dateFrom(value: Date | null) {
    this.filterModel.dateFrom = value;
    if (this.filterModel.dateTo && value && this.filterModel.dateTo < value) {
      this.filterModel.dateTo = null;
    }
  }

  get dateFrom(): Date | null | undefined {
    return this.filterModel.dateFrom;
  }

  getPropertyName() {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';
  }

  openModal(id: number) {
    const dialogRef = this.matDialog.open(AssignEmployeeResponsibilityPopupComponent, {
      data: { id },
      width: '100%',
      maxWidth: '1024px',
    });

    dialogRef.afterClosed().subscribe((result: DIALOG_ENUM) => {
      if (result === DIALOG_ENUM.OK) {
        this.loadList().subscribe({
          next: (response) => this.handleLoadListSuccess(response),
        });
      }
    });
  }

  openDataModal(model: PresenceInquiry) {
    const dialogRef = this.matDialog.open(ViewEmployeesCheckPopupComponent, {
      data: { model },
      width: '100%',
      maxWidth: '1024px',
    });
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    return this.datePipe.transform(new Date(date), 'dd-MM-yyyy') ?? '-';
  }

  formatTime(date: Date | null | undefined): string {
    if (!date) return '-';
    const locale = this.isCurrentLanguageEnglish() ? 'en-US' : 'ar-EG';
    return formatDateTo12Hour(date, locale);
  }

  getStatusName(id: number): string {
    const status = this.presenceInquiryStatuses.find((d) => d.id === id);
    return getLocalizedName(status, this.languageService.getCurrentLanguage());
  }

  override exportExcel(fileName: string = 'PresenceProofInquiry.xlsx'): void {
    const allDataParams = {
      ...this.paginationParams,
      pageNumber: 1,
      pageSize: CustomValidators.defaultLengths.INT_MAX,
    };

    this.service
      .loadPresenceInquiriesPaginated(allDataParams, {
        ...this.appliedFilterModel!,
      })
      .subscribe({
        next: (response) => {
          const fullList = response.list || [];
          if (fullList.length === 0) {
            this.alertsService.showErrorMessage({ messages: ['COMMON.NO_DATA_TO_EXPORT'] });
            return;
          }

          const transformedData = this.mapModelsToExcelRows(fullList);
          this.writeExcelFile(transformedData, fileName);
        },
        error: (_) => {
          this.alertsService.showErrorMessage({ messages: ['COMMON.ERROR'] });
        },
      });
  }
  isCurrentLanguageEnglish() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH;
  }

  protected override getPdfExportRequest(): Observable<Blob> {
    return this.service.exportAllPresenceInquiriesPdf(
      this.langService.getCurrentLanguage(),
      this.getPdfExportFilterOptions()
    );
  }
}
