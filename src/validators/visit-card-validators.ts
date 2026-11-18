import { VisitCardAvailability } from '@/models/features/visit/visit-card-assignment';
import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { catchError, map, Observable, of, switchMap, timer } from 'rxjs';

const HEX_PATTERN = /^[0-9A-F]+$/;
const SEPARATORS = /[\s:\-]/g;

/** Delay before an as-you-type server check is sent. */
export const VISIT_CARD_CHECK_DEBOUNCE_MS = 400;

/** Removes spaces, `:` and `-`, and upper-cases the card ID, mirroring the server normalization. */
function normalizeCardId(value: string | null | undefined): string {
  return (value ?? '').replace(SEPARATORS, '').toUpperCase();
}

/** Card ID must be hexadecimal (separators are allowed and stripped). Error key: `hexCardId`. */
function hexCardId(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const normalized = normalizeCardId(control.value);
    if (!normalized) {
      return null;
    }
    return HEX_PATTERN.test(normalized) ? null : { hexCardId: true };
  };
}

/**
 * Debounced server-side uniqueness check for one field of a card. Angular unsubscribes a pending
 * async validator when the value changes, so the `timer` makes this send one request after typing
 * stops. A failed check never blocks the form; the server re-validates on save.
 *
 * @param check  calls the availability endpoint for the control's value
 * @param pick   reads the relevant flag from the response
 * @param errorKey  validation error set when the value is taken
 */
function availability(
  check: (value: any) => Observable<VisitCardAvailability>,
  pick: (result: VisitCardAvailability) => boolean,
  errorKey: 'cardIdTaken' | 'friendlyNumberTaken'
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return of(null);
    }

    return timer(VISIT_CARD_CHECK_DEBOUNCE_MS).pipe(
      switchMap(() => check(control.value)),
      map((result) => {
        if (!pick(result)) return null;
        // Show the duplicate while the user is still typing, not only after blur.
        control.markAsTouched();
        return { [errorKey]: true };
      }),
      catchError(() => of(null))
    );
  };
}

const FRIENDLY_NUMBER_MIN = 1;
const FRIENDLY_NUMBER_MAX = 9999;

/**
 * Short (friendly) number: a whole number from 1 to 9999. Reports one error, `friendlyNumberRange`,
 * for every bad value (0, negative, decimal, too large), so the field shows a single "between 1 and
 * 9999" message instead of the shared min / max / length texts, which talk about time and length.
 */
function friendlyNumberRange(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const number = Number(value);
    const valid =
      Number.isInteger(number) && number >= FRIENDLY_NUMBER_MIN && number <= FRIENDLY_NUMBER_MAX;
    return valid ? null : { friendlyNumberRange: true };
  };
}

/**
 * A number input keeps leading zeros on screen ("00012") although its value, and what is saved, is
 * 12. Redraws the input as the saved number so it matches the "up to 4 digits" hint. Only the text
 * on screen changes: the form value and its validation stay as they are.
 */
function redrawFriendlyNumberInput(input: HTMLInputElement, value: unknown): void {
  if (value === null || value === undefined || value === '') {
    return;
  }
  const number = Number(value);
  if (Number.isFinite(number) && input.value !== String(number)) {
    input.value = String(number);
  }
}

export const VisitCardValidators = {
  CARD_ID_MAX_LENGTH: 32,
  FRIENDLY_NUMBER_MIN,
  FRIENDLY_NUMBER_MAX,
  normalizeCardId,
  hexCardId,
  friendlyNumberRange,
  redrawFriendlyNumberInput,
  availability,
};
