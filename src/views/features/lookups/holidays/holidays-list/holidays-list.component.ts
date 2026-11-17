import { Component, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Breadcrumb } from 'primeng/breadcrumb';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';
import { TableModule } from 'primeng/table';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { HolidaysPopupComponent } from '../holidays-popup/holidays-popup.component';
import { InputTextModule } from 'primeng/inputtext';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { Holiday } from '@/models/features/lookups/holiday/holiday';
import { HolidayService } from '@/services/features/lookups/holiday.service';
import { LanguageService } from '@/services/shared/language.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HolidayFilter } from '@/models/features/lookups/holiday/holiday-filter';
import { AuthService } from '@/services/auth/auth.service';
import { MatDialogConfig } from '@angular/material/dialog';
import { NotesPopupComponent } from '../notes-popup/notes-popup/notes-popup.component';
import { EnglishNamePipe } from '@/pipes/english-name.pipe';
import { getEnglishName } from '@/utils/localized-name';

@Component({
  selector: 'app-holidays-list',
  imports: [
    Breadcrumb,
    TableModule,
    PaginatorModule,
    InputTextModule,
    FormsModule,
    TranslatePipe,
    DatePickerModule,
    FluidModule,
    TableModule,
    CommonModule,
    RouterModule,
    EnglishNamePipe,
  ],

  providers: [DatePipe],
  templateUrl: './holidays-list.component.html',
  styleUrl: './holidays-list.component.scss',
})
export default class HolidaysListComponent extends BaseListComponent<
  Holiday,
  HolidaysPopupComponent,
  HolidayService,
  HolidayFilter
> {
  languageService = inject(LanguageService); // Assuming you have a LanguageService to handle language changes
  override dialogSize = {
    maxWidth: '600px',
  };
  holidayService = inject(HolidayService);
  authService = inject(AuthService);
  datePipe = inject(DatePipe);

  filterModel: HolidayFilter = new HolidayFilter();
  override get service() {
    return this.holidayService;
  }

  override initListComponent(): void {}
  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'HOLIDAYS_PAGE.HOLIDAYS_LIST' }];
  }

  override openDialog(model: Holiday): void {
    const viewMode = model.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.openBaseDialog(HolidaysPopupComponent as any, model, viewMode);
  }

  addOrEditModel(holiday?: Holiday): void {
    this.openDialog(holiday ?? new Holiday());
  }

  protected override mapModelToExcelRow(model: Holiday): { [key: string]: any } {
    return {
      [this.translateService.instant('HOLIDAYS_PAGE.HOLIDAY_NAME_ARABIC')]: model.nameAr,
      [this.translateService.instant('HOLIDAYS_PAGE.HOLIDAY_NAME_ENGLISH')]: getEnglishName(model),
      [this.translateService.instant('HOLIDAYS_PAGE.START_DATE')]: this.formatDate(
        model.startDate
      ),
      [this.translateService.instant('HOLIDAYS_PAGE.END_DATE')]: this.formatDate(model.endDate),
    };
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    return this.datePipe.transform(new Date(date), 'dd/MM/yyyy') ?? '-';
  }
  showAddEditButtons() {
    return this.authService.isSuperHROfficer;
  }
  openDataDialog(notes: string): void {
    let dialogConfig: MatDialogConfig = new MatDialogConfig();
    dialogConfig.width = this.dialogSize.maxWidth;
    dialogConfig.data = { notes: notes };
    this.matDialog.open(NotesPopupComponent as any, dialogConfig);
  }
  set dateFrom(value: Date | null) {
    this.filterModel.dateFrom = value;

    // If dateTo is before dateFrom, reset or adjust it
    if (this.filterModel.dateTo && value && this.filterModel.dateTo < value) {
      this.filterModel.dateTo = null; // or set it to value
    }
  }
  get dateFrom(): Date | null | undefined {
    return this.filterModel.dateFrom;
  }
}
