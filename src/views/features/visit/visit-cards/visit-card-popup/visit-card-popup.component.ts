import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { VisitCard } from '@/models/features/visit/visit-card';
import { VisitCardService } from '@/services/features/visit/visit-card.service';
import { AlertService } from '@/services/shared/alert.service';
import { VisitCardValidators } from '@/validators/visit-card-validators';
import { markFormGroupTouched } from '@/utils/general-helper';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { Component, Inject, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { filter, map, Observable, startWith, Subject, take, takeUntil } from 'rxjs';
import { RequiredMarkerDirective } from '../../../../../directives/required-marker.directive';

/** Add/edit a visit card. Card ID and friendly number are checked for uniqueness while typing. */
@Component({
  selector: 'app-visit-card-popup',
  imports: [
    InputTextModule,
    ReactiveFormsModule,
    RequiredMarkerDirective,
    TranslatePipe,
    ValidationMessagesComponent,
  ],
  templateUrl: './visit-card-popup.component.html',
})
export class VisitCardPopupComponent
  extends BasePopupComponent<VisitCard>
  implements OnInit, OnDestroy
{
  declare model: VisitCard;
  declare form: FormGroup;
  declare viewMode: ViewModeEnum;
  alertService = inject(AlertService);
  service = inject(VisitCardService);
  fb = inject(FormBuilder);
  isCreateMode = false;
  private destroy$ = new Subject<void>();

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    super();
  }

  get cardIdControl() {
    return this.form.get('cardId') as FormControl;
  }

  get friendlyNumberControl() {
    return this.form.get('friendlyNumber') as FormControl;
  }

  override initPopup() {
    this.model = this.data.model;
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode == ViewModeEnum.CREATE;
  }

  override buildForm() {
    this.form = this.fb.group(this.model.buildForm());
    const excludeId = this.model.id ?? null;

    this.cardIdControl.addAsyncValidators(
      VisitCardValidators.availability(
        (cardId) =>
          this.service.checkAvailability({
            cardId: VisitCardValidators.normalizeCardId(cardId),
            excludeId,
          }),
        (result) => result.cardIdTaken,
        'cardIdTaken'
      )
    );
    this.friendlyNumberControl.addAsyncValidators(
      VisitCardValidators.availability(
        (friendlyNumber) =>
          this.service.checkAvailability({ friendlyNumber: Number(friendlyNumber), excludeId }),
        (result) => result.friendlyNumberTaken,
        'friendlyNumberTaken'
      )
    );

    if (this.isCreateMode) {
      this.suggestFriendlyNumber();
    }
  }

  /** Pre-fills the next free friendly number; the user can still change it. */
  private suggestFriendlyNumber() {
    this.service
      .getNextFriendlyNumber()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (next) => {
          if (this.friendlyNumberControl.value == null || this.friendlyNumberControl.value === '') {
            this.friendlyNumberControl.setValue(next);
          }
        },
        // No suggestion is not an error: the field stays empty and required.
        error: () => undefined,
      });
  }

  normalizeCardIdInput() {
    const normalized = VisitCardValidators.normalizeCardId(this.cardIdControl.value);
    if (normalized !== this.cardIdControl.value) {
      this.cardIdControl.setValue(normalized);
    }
  }

  /** Waits for pending uniqueness checks to finish before deciding whether to save. */
  override beforeSave(model: VisitCard, form: FormGroup): Observable<boolean> | boolean {
    if (!form.pending) {
      return form.valid;
    }
    return form.statusChanges.pipe(
      startWith(form.status),
      filter((status) => status !== 'PENDING'),
      take(1),
      map((status) => {
        if (status !== 'VALID') markFormGroupTouched(form);
        return status === 'VALID';
      })
    );
  }

  override prepareModel(model: VisitCard, form: FormGroup): VisitCard {
    this.model = Object.assign(model, { ...form.value });
    return this.model;
  }

  /** Shows a server-side duplicate (e.g. saved by someone else meanwhile) on the right field. */
  override saveFail(error: any): void {
    const messageKey = error?.error?.error?.messageKey;
    if (messageKey === 'VISIT_CARD_ID_ALREADY_EXISTS') {
      this.cardIdControl.setErrors({ cardIdTaken: true });
      this.cardIdControl.markAsTouched();
    } else if (messageKey === 'VISIT_CARD_FRIENDLY_NUMBER_ALREADY_EXISTS') {
      this.friendlyNumberControl.setErrors({ friendlyNumberTaken: true });
      this.friendlyNumberControl.markAsTouched();
    }
  }

  override afterSave() {
    this.alertService.showSuccessMessage({ messages: ['COMMON.SAVED_SUCCESSFULLY'] });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
