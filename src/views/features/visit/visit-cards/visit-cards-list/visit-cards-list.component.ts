import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { VisitCard } from '@/models/features/visit/visit-card';
import { VisitCardFilter } from '@/models/features/visit/visit-card-filter';
import { VisitCardService } from '@/services/features/visit/visit-card.service';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { VisitCardPopupComponent } from '../visit-card-popup/visit-card-popup.component';

/**
 * Visit card registry ("بطاقات الزيارات"). Routed under attendance settings for ADMIN only.
 */
@Component({
  selector: 'app-visit-cards-list',
  imports: [
    Breadcrumb,
    TableModule,
    PaginatorModule,
    InputTextModule,
    FormsModule,
    TranslatePipe,
    CommonModule,
    RouterModule,
    TooltipModule,
  ],
  templateUrl: './visit-cards-list.component.html',
})
export default class VisitCardsListComponent extends BaseListComponent<
  VisitCard,
  VisitCardPopupComponent,
  VisitCardService,
  VisitCardFilter
> {
  override dialogSize = {
    width: '100%',
    maxWidth: '520px',
  };
  visitCardService = inject(VisitCardService);
  filterModel: VisitCardFilter = new VisitCardFilter();

  override get service() {
    return this.visitCardService;
  }

  override initListComponent(): void {}

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'VISIT_CARDS_PAGE.TITLE' }];
  }

  override openDialog(model: VisitCard): void {
    const viewMode = model.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.openBaseDialog(VisitCardPopupComponent as any, model, viewMode);
  }

  addOrEditModel(card?: VisitCard): void {
    if (card?.isInUse) return;
    this.openDialog(card ?? new VisitCard());
  }

  deleteCard(card: VisitCard): void {
    if (card.isInUse) return;
    this.deleteModel(card.id);
  }

  protected override mapModelToExcelRow(model: VisitCard): { [key: string]: any } {
    return {
      [this.translateService.instant('VISIT_CARDS_PAGE.CARD_ID')]: model.cardId,
      [this.translateService.instant('VISIT_CARDS_PAGE.FRIENDLY_NUMBER')]: model.friendlyNumber,
    };
  }
}
