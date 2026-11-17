import { FormControl } from '@angular/forms';
import { fakeAsync, tick } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { VisitCardAvailability } from '@/models/features/visit/visit-card-assignment';
import { VISIT_CARD_CHECK_DEBOUNCE_MS, VisitCardValidators } from './visit-card-validators';

describe('VisitCardValidators', () => {
  describe('normalizeCardId', () => {
    it('removes separators and upper-cases', () => {
      expect(VisitCardValidators.normalizeCardId(' a1:b2-c3 d4 ')).toBe('A1B2C3D4');
    });

    it('returns an empty string for empty input', () => {
      expect(VisitCardValidators.normalizeCardId(null)).toBe('');
    });
  });

  describe('hexCardId', () => {
    const validate = (value: string | null) =>
      VisitCardValidators.hexCardId()(new FormControl(value));

    it('accepts hexadecimal values in any case and with separators', () => {
      expect(validate('0a:1B-ff')).toBeNull();
    });

    it('rejects non-hexadecimal characters', () => {
      expect(validate('XYZ123')).toEqual({ hexCardId: true });
    });

    it('leaves empty values to the required validator', () => {
      expect(validate('')).toBeNull();
    });
  });

  describe('availability', () => {
    function setup(response: () => Observable<VisitCardAvailability>) {
      const calls: unknown[] = [];
      const validator = VisitCardValidators.availability(
        (value) => {
          calls.push(value);
          return response();
        },
        (result) => result.cardIdTaken,
        'cardIdTaken'
      );
      const control = new FormControl<string | null>(null, { asyncValidators: validator });
      return { control, calls };
    }

    it('sends one request after typing stops and flags a taken value', fakeAsync(() => {
      const { control, calls } = setup(() => of({ cardIdTaken: true, friendlyNumberTaken: false }));

      control.setValue('A');
      tick(100);
      control.setValue('AB');
      tick(100);
      control.setValue('ABC');
      tick(VISIT_CARD_CHECK_DEBOUNCE_MS);

      expect(calls).toEqual(['ABC']);
      expect(control.errors).toEqual({ cardIdTaken: true });
      expect(control.touched).toBeTrue();
    }));

    it('passes when the value is free', fakeAsync(() => {
      const { control } = setup(() => of({ cardIdTaken: false, friendlyNumberTaken: false }));

      control.setValue('ABC');
      tick(VISIT_CARD_CHECK_DEBOUNCE_MS);

      expect(control.valid).toBeTrue();
    }));

    it('does not block the form when the check fails', fakeAsync(() => {
      const { control } = setup(() => throwError(() => new Error('offline')));

      control.setValue('ABC');
      tick(VISIT_CARD_CHECK_DEBOUNCE_MS);

      expect(control.valid).toBeTrue();
    }));

    it('skips the request for an empty value', fakeAsync(() => {
      const { control, calls } = setup(() => of({ cardIdTaken: true, friendlyNumberTaken: false }));

      control.setValue('');
      tick(VISIT_CARD_CHECK_DEBOUNCE_MS);

      expect(calls).toEqual([]);
      expect(control.valid).toBeTrue();
    }));
  });
});
