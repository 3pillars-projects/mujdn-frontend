import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { PresenceInquiriesPopupComponent } from '../presence-inquiries-popup/presence-inquiries-popup.component';
import { FormsModule } from '@angular/forms';
import { PresenceInquiryFilter } from '@/models/features/presence-inquiry/presence-inquiry-filter';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { PresenceInquiryService } from '@/services/features/presence-inquiry.service';
import { PresenceInquiry } from '@/models/features/presence-inquiry/presence-inquiry';
import { TranslatePipe } from '@ngx-translate/core';
import { USER_PRESENCE_INQUIRY_STATUS_ENUM } from '@/enums/user-presence-inquiry-status-enum';
import { UserPresenceInquiryStatusService } from '@/services/features/user-presence-inquiry-status.service';
import { LanguageService } from '@/services/shared/language.service';
import { CustomValidators } from '@/validators/custom-validators';
import { formatDateTo12Hour } from '@/utils/general-helper';
import { Observable } from 'rxjs';
import { getLocalizedName } from '@/utils/localized-name';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

@Component({
  selector: 'app-my-presence-inquiries-list',
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
  templateUrl: './my-presence-inquiries-list.component.html',
  styleUrl: './my-presence-inquiries-list.component.scss',
})
export class MyPresenceInquiriesListComponent extends BaseListComponent<
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
  userPresenceInquiryStatusService = inject(UserPresenceInquiryStatusService);
  userPresenceInquiryStatuses: BaseLookupModel[] = [];
  userInquiryStatusEnum = USER_PRESENCE_INQUIRY_STATUS_ENUM;
  languageService = inject(LanguageService);
  datePipe = inject(DatePipe);

  override get service() {
    return this.presenceInquiryService;
  }

  override initListComponent(): void {
    // Preload lookup data
    this.userPresenceInquiryStatusService.getLookup().subscribe((res) => {
      this.userPresenceInquiryStatuses = res;
    });
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'PRESENCE_INQUIRIES_PAGE.PRESENCE_INQUIRIES' }];
  }

  override openDialog(model: PresenceInquiry): void {
    // No dialog currently needed for My Presence Inquiries
  }

  override loadList() {
    return this.service.loadMyPresenceInquiriesPaginated(this.paginationParams, {
      ...this.appliedFilterModel!,
    });
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
      [this.translateService.instant('INQUIRIES_PAGE.CONFIRMATION_STATUS')]: this.getStatusName(
        model.assignedUsers?.[0]?.inquiryStatusId ?? 0
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

  getStatusName(id: number): string {
    const status = this.userPresenceInquiryStatuses.find((d) => d.id === id);
    return getLocalizedName(status, this.languageService.getCurrentLanguage());
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

  override exportExcel(fileName: string = 'MyPresenceProofInquiry.xlsx'): void {
    const allDataParams = {
      ...this.paginationParams,
      pageNumber: 1,
      pageSize: CustomValidators.defaultLengths.INT_MAX,
    };

    this.service
      .loadMyPresenceInquiriesPaginated(allDataParams, {
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
    return this.service.exportMyPresenceInquiriesPdf(
      this.langService.getCurrentLanguage(),
      this.getPdfExportFilterOptions()
    );
  }
}
