// blacklisted-nationalities-list.component.ts
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { BlacklistedNationality } from '@/models/features/visit/blacklisted-nationality';
import { BlacklistedNationalityFilter } from '@/models/features/visit/blacklisted-nationality-filter';
import { BlacklistedNationalityService } from '@/services/features/visit/blacklisted-nationality.service';
import { Component, inject, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { RouterModule } from '@angular/router';
import { BlacklistedNationalityPopupComponent } from '../blacklisted-nationality-popup/blacklisted-nationality-popup.component';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { takeUntil } from 'rxjs';
import { EnglishNamePipe } from '@/pipes/english-name.pipe';
import { getEnglishName } from '@/utils/localized-name';

@Component({
  selector: 'app-blacklisted-nationality-list',
  imports: [
    TableModule,
    PaginatorModule,
    InputTextModule,
    FormsModule,
    TranslatePipe,
    RouterModule,
    EnglishNamePipe,
  ],
  templateUrl: './blacklisted-nationalities-list.component.html',
  styleUrl: './blacklisted-nationalities-list.component.scss',
})
export class BlacklistedNationalityListComponent
  extends BaseListComponent<
    BlacklistedNationality,
    BlacklistedNationalityPopupComponent,
    BlacklistedNationalityService,
    BlacklistedNationalityFilter
  >
  implements OnInit, OnChanges
{
  @Input() isActive: boolean = false;
  @Input() nationalities: BaseLookupModel[] = [];

  override dialogSize = {
    width: '100%',
    maxWidth: '600px',
  };

  blacklistedNationalityService = inject(BlacklistedNationalityService);
  filterModel: BlacklistedNationalityFilter = new BlacklistedNationalityFilter();

  private hasInitialized = false;

  override get service() {
    return this.blacklistedNationalityService;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isActive']) {
      this.resetSearch();
      const current = changes['isActive'].currentValue;
      const previous = changes['isActive'].previousValue;

      // Skip first trigger after component init
      if (!this.hasInitialized) {
        this.hasInitialized = true;
        return;
      }

      // Only load data if tab is active and this is not the initial change
      if (current && !previous) {
        this.loadDataIfNeeded();
      }
    }
  }

  private loadDataIfNeeded(): void {
    // Load data when tab becomes active
    this.loadList().subscribe({
      next: (response) => this.handleLoadListSuccess(response),
      error: this.handleLoadListError,
    });
  }

  override initListComponent(): void {}

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'BLACKLISTED_NATIONALITIES_PAGE.BLACKLISTED_NATIONALITIES_LIST' }];
  }

  override openDialog(model: BlacklistedNationality): void {
    const viewMode = model.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.openBaseDialog(BlacklistedNationalityPopupComponent as any, model, viewMode, {
      nationalities: this.nationalities,
    });
  }

  addOrEditModel(blacklistedNationality?: BlacklistedNationality): void {
    blacklistedNationality = blacklistedNationality || new BlacklistedNationality();
    this.openDialog(blacklistedNationality);
  }

  protected override mapModelToExcelRow(model: BlacklistedNationality): { [key: string]: any } {
    return {
      [this.translateService.instant('BLACKLIST_PAGE.NATIONALITY_IN_ARABIC')]: model.nameAr,
      [this.translateService.instant('BLACKLIST_PAGE.NATIONALITY_IN_ENGLISH')]: getEnglishName(model),
    };
  }
}
