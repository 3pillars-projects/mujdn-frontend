import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LAYOUT_DIRECTION_ENUM } from '@/enums/layout-direction-enum';
import { Visit } from '@/models/features/visit/visit';
import { VisitCardHolder, VisitCardLookup } from '@/models/features/visit/visit-card-assignment';
import { VisitService } from '@/services/features/visit/visit.service';
import { AlertService } from '@/services/shared/alert.service';
import { ConfirmationService } from '@/services/shared/confirmation.service';
import { LanguageService } from '@/services/shared/language.service';
import { formatDateOnly, formatTimeTo12Hour } from '@/utils/general-helper';
import { CustomValidators } from '@/validators/custom-validators';
import {
  VISIT_CARD_CHECK_DEBOUNCE_MS,
  VisitCardValidators,
} from '@/validators/visit-card-validators';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import {
  catchError,
  debounceTime,
  filter,
  map,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { VisitDetailsSectionComponent } from '../visit-details-section/visit-details-section.component';

type LookupState = 'idle' | 'loading' | 'found' | 'notFound' | 'error';

type LookupResult = { ok: true; card: VisitCardLookup } | { ok: false; error: HttpErrorResponse };

const CARD_HELD_ELSEWHERE = 'VISIT_CARD_ASSIGNED_TO_ANOTHER_VISIT';
const CARD_NOT_FOUND = 'VISIT_CARD_NOT_FOUND';
const CARD_LOCKED = 'VISIT_CARD_LOCKED_AFTER_ACCESS';

/**
 * Gate dialog: shows the approved visit and lets security staff link a card by its friendly number.
 * The number is looked up after typing stops; a card held by another visit can be moved after
 * confirmation; a linked card can be unlinked.
 */
@Component({
  selector: 'app-link-visit-card-popup',
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    TranslatePipe,
    ValidationMessagesComponent,
    VisitDetailsSectionComponent,
  ],
  templateUrl: './link-visit-card-popup.component.html',
})
export class LinkVisitCardPopupComponent implements OnInit, OnDestroy {
  private data = inject<{ model: Visit }>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef);
  private visitService = inject(VisitService);
  private alertService = inject(AlertService);
  private confirmService = inject(ConfirmationService);
  private translateService = inject(TranslateService);
  private languageService = inject(LanguageService);
  private destroy$ = new Subject<void>();
  private relookup$ = new Subject<number>();

  model!: Visit;
  direction: LAYOUT_DIRECTION_ENUM =
    this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
      ? LAYOUT_DIRECTION_ENUM.LTR
      : LAYOUT_DIRECTION_ENUM.RTL;

  friendlyNumberControl = new FormControl<number | string | null>(null, [
    Validators.required,
    CustomValidators.integerNumber(),
    CustomValidators.numberRange(
      VisitCardValidators.FRIENDLY_NUMBER_MIN,
      VisitCardValidators.FRIENDLY_NUMBER_MAX
    ),
  ]);

  lookupState: LookupState = 'idle';
  lookup: VisitCardLookup | null = null;
  busy = false;
  /** This visit's own card was already used by the visitor and the visit is running: no replace or unlink. */
  ownCardLocked = false;

  ngOnInit(): void {
    this.model = this.data.model;

    const linked = this.model.assignedCard;
    if (linked) {
      this.friendlyNumberControl.setValue(linked.friendlyNumber, { emitEvent: false });
      this.lookup = {
        ...linked,
        currentAssignment: {
          visitLogId: this.model.id,
          visitorName: this.model.fullName,
          visitDate: '',
          visitTimeFrom: '',
          visitTimeTo: '',
          isLocked: false,
        },
      };
      this.lookupState = 'found';
      this.checkOwnCardLock(linked.friendlyNumber);
    }

    this.listenToFriendlyNumber();
  }

  /** The card this visit holds right now (from the list row, or after a successful link). */
  get linkedHere(): boolean {
    return this.lookup?.currentAssignment?.visitLogId === this.model.id;
  }

  /** The typed card is linked to a different visit and would have to be moved. */
  get heldElsewhere(): VisitCardHolder | null {
    const holder = this.lookup?.currentAssignment;
    return holder && holder.visitLogId !== this.model.id ? holder : null;
  }

  /** The typed card's holder already used it during a running visit, so the server refuses a move. */
  get heldElsewhereLocked(): boolean {
    return !!this.heldElsewhere?.isLocked;
  }

  get canConfirm(): boolean {
    return (
      !this.busy &&
      this.lookupState === 'found' &&
      !!this.lookup &&
      !this.linkedHere &&
      !this.heldElsewhereLocked &&
      !this.ownCardLocked &&
      this.friendlyNumberControl.valid
    );
  }

  get canUnlink(): boolean {
    return !this.busy && !!this.model.assignedCard && !this.ownCardLocked;
  }

  /**
   * Holder details for the move warning, e.g. "Visitor name — 18/11/2026 — 08:00 AM - 04:00 PM".
   * Each part is wrapped in Unicode bidi isolates so a Latin name, dates and times keep their order
   * inside an Arabic (RTL) sentence instead of being reshuffled by the bidi algorithm.
   */
  holderDescription(holder: VisitCardHolder): string {
    const isEnglish = this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH;
    const locale = isEnglish ? 'en-US' : 'ar-EG';
    // FSI…PDI: direction taken from the text itself (name, date, single time).
    const isolate = (text: string) => `⁨${text}⁩`;
    // LRI/RLI…PDI: the from-to range follows the UI direction so "from" is read first.
    const isolateUi = (text: string) => `${isEnglish ? '⁦' : '⁧'}${text}⁩`;
    const date = holder.visitDate ? formatDateOnly(holder.visitDate) : '';
    const from = holder.visitTimeFrom ? formatTimeTo12Hour(holder.visitTimeFrom, locale) : '';
    const to = holder.visitTimeTo ? formatTimeTo12Hour(holder.visitTimeTo, locale) : '';
    const range = from && to ? isolateUi(`${isolate(from)} - ${isolate(to)}`) : '';
    return [holder.visitorName && isolate(holder.visitorName), date && isolate(date), range]
      .filter(Boolean)
      .join(' — ');
  }

  confirm(): void {
    if (!this.canConfirm || !this.lookup) return;

    const holder = this.heldElsewhere;
    if (!holder) {
      this.link(false);
      return;
    }

    this.confirmService
      .open({
        icon: 'warning',
        messages: [
          this.translateService.instant('VISIT_REQUEST_PAGE.MOVE_CARD_CONFIRM', {
            friendlyNumber: this.lookup.friendlyNumber,
            holder: this.holderDescription(holder),
          }),
        ],
        confirmText: 'VISIT_REQUEST_PAGE.MOVE_CARD',
        cancelText: 'COMMON.CANCEL',
      })
      .afterClosed()
      .pipe(filter((result) => result === DIALOG_ENUM.OK))
      .subscribe(() => this.link(true));
  }

  unlink(): void {
    if (!this.canUnlink) return;

    this.confirmService
      .open({
        icon: 'warning',
        messages: ['VISIT_REQUEST_PAGE.UNLINK_CARD_CONFIRM'],
        confirmText: 'VISIT_REQUEST_PAGE.UNLINK_CARD',
        cancelText: 'COMMON.CANCEL',
      })
      .afterClosed()
      .pipe(
        filter((result) => result === DIALOG_ENUM.OK),
        tap(() => (this.busy = true)),
        switchMap(() => this.visitService.unlinkCard(this.model.id))
      )
      .subscribe({
        next: () => {
          this.alertService.showSuccessMessage({
            messages: ['VISIT_REQUEST_PAGE.CARD_UNLINKED_SUCCESSFULLY'],
          });
          this.dialogRef.close(DIALOG_ENUM.OK);
        },
        // The global error interceptor already showed the message.
        error: () => (this.busy = false),
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private link(moveFromOtherVisit: boolean): void {
    const friendlyNumber = Number(this.friendlyNumberControl.value);
    this.busy = true;

    this.visitService.linkCard(this.model.id, { friendlyNumber, moveFromOtherVisit }).subscribe({
      next: () => {
        this.alertService.showSuccessMessage({
          messages: ['VISIT_REQUEST_PAGE.CARD_LINKED_SUCCESSFULLY'],
        });
        this.dialogRef.close(DIALOG_ENUM.OK);
      },
      error: (error: HttpErrorResponse) => {
        this.busy = false;
        this.handleLinkError(error, friendlyNumber);
      },
    });
  }

  /** `linkCard` skips the global error dialog, so every failure is reported here. */
  private handleLinkError(error: HttpErrorResponse, friendlyNumber: number): void {
    const messageKey: string | undefined = error?.error?.error?.messageKey;

    if (messageKey === CARD_HELD_ELSEWHERE) {
      // Someone linked the card meanwhile: refresh the holder so the move warning appears.
      this.relookup$.next(friendlyNumber);
      return;
    }

    if (messageKey === CARD_NOT_FOUND) {
      this.showNotFound();
      return;
    }

    if (messageKey === CARD_LOCKED) {
      // The holder swiped after the lookup: refresh it so the dialog stops offering the move.
      this.relookup$.next(friendlyNumber);
    }

    const key = messageKey ? `COMMON.${messageKey}` : 'COMMON.UNKNOWN_ERROR';
    const translated = this.translateService.instant(key);
    this.alertService.showErrorMessage({
      messages: [
        translated === key ? this.translateService.instant('COMMON.UNKNOWN_ERROR') : translated,
      ],
    });
  }

  private listenToFriendlyNumber(): void {
    const typed$ = this.friendlyNumberControl.valueChanges.pipe(
      tap(() => {
        // Any edit invalidates the previous result until the new lookup answers.
        this.lookup = null;
        this.lookupState = 'idle';
      }),
      debounceTime(VISIT_CARD_CHECK_DEBOUNCE_MS),
      filter(() => this.friendlyNumberControl.valid),
      map((value) => Number(value))
    );

    const lookup$ = (friendlyNumber: number) => {
      this.lookupState = 'loading';
      return this.visitService.lookupCardByFriendlyNumber(friendlyNumber).pipe(
        map((card): LookupResult => ({ ok: true, card })),
        catchError((error: HttpErrorResponse) => of<LookupResult>({ ok: false, error }))
      );
    };

    // switchMap drops a slower, stale response when the number changes again.
    typed$
      .pipe(switchMap(lookup$), takeUntil(this.destroy$))
      .subscribe((result) => this.applyLookup(result));

    this.relookup$
      .pipe(switchMap(lookup$), takeUntil(this.destroy$))
      .subscribe((result) => this.applyLookup(result));
  }

  private applyLookup(result: LookupResult): void {
    if (result.ok) {
      this.lookup = result.card;
      this.lookupState = 'found';
      return;
    }

    if (result.error?.status === 404 || result.error?.error?.error?.messageKey === CARD_NOT_FOUND) {
      this.showNotFound();
      return;
    }

    this.lookupState = 'error';
  }

  /**
   * Looks up this visit's own card to learn whether the visitor already used it. If the check fails, the
   * actions stay enabled and the server still refuses them with VISIT_CARD_LOCKED_AFTER_ACCESS.
   */
  private checkOwnCardLock(friendlyNumber: number): void {
    this.visitService
      .lookupCardByFriendlyNumber(friendlyNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (card) => {
          const holder = card.currentAssignment;
          this.ownCardLocked = holder?.visitLogId === this.model.id && !!holder?.isLocked;
        },
        error: () => (this.ownCardLocked = false),
      });
  }

  private showNotFound(): void {
    this.lookup = null;
    this.lookupState = 'notFound';
    this.friendlyNumberControl.setErrors({
      ...(this.friendlyNumberControl.errors ?? {}),
      cardNotFound: true,
    });
    this.friendlyNumberControl.markAsTouched();
  }

  /** Retries the lookup after a network or server failure. */
  retryLookup(): void {
    if (this.friendlyNumberControl.valid) {
      this.relookup$.next(Number(this.friendlyNumberControl.value));
    }
  }
}
