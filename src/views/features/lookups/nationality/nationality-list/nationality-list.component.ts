import { Component, inject, OnInit } from '@angular/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { NationalityPopupComponent } from '@/views/features/lookups/nationality/nationality-popup/nationality-popup.component';
import { NationalityFilter } from '@/models/features/lookups/Nationality-filter';
import { Nationality } from '@/models/features/lookups/Nationality';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { NationalityService } from '@/services/features/lookups/nationality.service';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { EnglishNamePipe } from '@/pipes/english-name.pipe';
import { getEnglishName } from '@/utils/localized-name';

@Component({
  selector: 'app-nationality-list',
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
  providers: [NationalityService],
  templateUrl: './nationality-list.component.html',
  styleUrl: './nationality-list.component.scss',
})
export default class NationalityListComponent
  extends BaseListComponent<
    Nationality,
    NationalityPopupComponent,
    NationalityService,
    NationalityFilter
  >
  implements OnInit
{
  override dialogSize = {
    width: '100%',
    maxWidth: '600px',
  };
  nationalityService = inject(NationalityService);
  filterModel: NationalityFilter = new NationalityFilter();

  override get service() {
    return this.nationalityService;
  }

  override initListComponent(): void {}

  override openDialog(model: Nationality): void {
    const viewMode = model.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.openBaseDialog(NationalityPopupComponent as any, model, viewMode);
  }

  addOrEditModel(nationality?: Nationality): void {
    this.openDialog(nationality ?? new Nationality());
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'NATIONALITIES_PAGE.NATIONALITIES_LIST' }];
  }

  protected override mapModelToExcelRow(model: Nationality): { [key: string]: any } {
    return {
      [this.translateService.instant('NATIONALITIES_PAGE.NATIONALITY_IN_ARABIC')]: model.nameAr,
      [this.translateService.instant('NATIONALITIES_PAGE.NATIONALITY_IN_ENGLISH')]:
        getEnglishName(model),
    };
  }
}
