import { FormControl } from '@angular/forms';
import { addOneYearClamped, shiftingPeriodMaxOneYearValidator } from './general-helper';

/** Shift assignment one-year limit; must match the server (QC bug W-16). */
describe('shift assignment one-year limit', () => {
  const date = (year: number, month: number, day: number) => new Date(year, month - 1, day);

  function check(start: Date, end: Date) {
    return shiftingPeriodMaxOneYearValidator(() => start)(new FormControl(end));
  }

  it('moves 29 February to 28 February of the next year, like the server', () => {
    expect(addOneYearClamped(date(2036, 2, 29))).toEqual(date(2037, 2, 28));
  });

  it('keeps the same day in other cases', () => {
    expect(addOneYearClamped(date(2026, 1, 15))).toEqual(date(2027, 1, 15));
    expect(addOneYearClamped(date(2035, 2, 28))).toEqual(date(2036, 2, 28));
    expect(addOneYearClamped(date(2026, 12, 31))).toEqual(date(2027, 12, 31));
  });

  it('flags 01/03/2037 for a 29/02/2036 start and allows 28/02/2037', () => {
    expect(check(date(2036, 2, 29), date(2037, 3, 1))).toEqual({ shiftingPeriodMaxOneYear: true });
    expect(check(date(2036, 2, 29), date(2037, 2, 28))).toBeNull();
  });

  it('allows exactly one year and flags one day more', () => {
    expect(check(date(2026, 1, 15), date(2027, 1, 15))).toBeNull();
    expect(check(date(2026, 1, 15), date(2027, 1, 16))).toEqual({ shiftingPeriodMaxOneYear: true });
  });

  it('does not change the start date it is given', () => {
    const start = date(2036, 2, 29);
    addOneYearClamped(start);
    expect(start).toEqual(date(2036, 2, 29));
  });
});
