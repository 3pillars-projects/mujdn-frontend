import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { isValidValue } from '@/utils/utils';
import { calculateBufferedShiftWindow } from '@/utils/shift-helper';

const defaultLengths = {
  MIN_LENGTH: 3,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 50,
  SHORT_NAME_MAX: 30,
  ARABIC_NAME_MAX: 250,
  REGION_NAME_MAX: 100,
  ARABIC_INPUT_NAME_MAX: 100,
  ENGLISH_NAME_MAX: 250,
  ENGLISH_INPUT_NAME_MAX: 100,
  NOTES: 2000,
  EMAIL_MAX: 200,
  PHONE_NUMBER_MAX: 10,
  FAX_MAX: 15,
  ADDRESS_MAX: 1000,
  QID_MIN: 11,
  QID_MAX: 11,
  SWIFT_CODE_MIN: 8,
  SWIFT_CODE_MAX: 11,
  NUMBERS_MAXLENGTH: 4,
  INQUIRY_MAX_BUFFER: 60,
  INQUIRY_MIN_BUFFER: 10,
  DECIMAL_PLACES: 2,
  EXPLANATIONS: 1333,
  _500: 500,
  INT_MAX: 2_147_483_647,
  maxShiftBuffer: 60,
};

export function pattern(patternName: customValidationTypes): ValidatorFn {
  if (!patternName || !validationPatterns.hasOwnProperty(patternName)) {
    return Validators.nullValidator;
  }

  return (control: AbstractControl): ValidationErrors | null => {
    if (!isValidValue(control.value)) {
      return null;
    }
    const response: object = {};
    // @ts-ignore
    response[patternName] = true;
    return !validationPatterns[patternName].test(control.value) ? response : null;
  };
}

// Custom validator for number max length (works with number inputs)
export function numberMaxLength(maxLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!isValidValue(control.value)) {
      return null;
    }

    const value = control.value;
    const stringValue = value.toString();

    if (stringValue.length > maxLength) {
      return {
        numberRange: {
          requiredLength: maxLength,
          actualLength: stringValue.length,
        },
      };
    }

    return null;
  };
}

// Custom validator for number min length (works with number inputs)
export function numberMinLength(minLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!isValidValue(control.value)) {
      return null;
    }

    const value = control.value;
    const stringValue = value.toString();

    if (stringValue.length < minLength) {
      return {
        numberRange: {
          requiredLength: minLength,
          actualLength: stringValue.length,
        },
      };
    }

    return null;
  };
}

// Custom validator for positive numbers only
export function positiveNumber(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!isValidValue(control.value)) {
      return null;
    }

    const value = Number(control.value);

    if (isNaN(value) || value < 0) {
      return { positiveNumber: true };
    }

    return null;
  };
}

// Custom validator for whole numbers only
export function integerNumber(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!isValidValue(control.value)) {
      return null;
    }

    const value = Number(control.value);

    return Number.isInteger(value) ? null : { integerNumber: true };
  };
}

/**
 * Whole number of days from `min` to `max` for a shift / rest cycle. Reports one error,
 * `shiftCycleDaysRange`, so the field can say "days" instead of the shared min / max texts,
 * which talk about time.
 */
export function shiftCycleDaysRange(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!isValidValue(control.value)) {
      return null;
    }

    const value = Number(control.value);
    return value >= min && value <= max ? null : { shiftCycleDaysRange: { min, max } };
  };
}

// Custom validator for number range
export function numberRange(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!isValidValue(control.value)) {
      return null;
    }

    const value = Number(control.value);

    if (isNaN(value)) {
      return { invalidNumber: true };
    }

    if (value < min || value > max) {
      return {
        numberRange: {
          min,
          max,
          actual: value,
        },
      };
    }

    return null;
  };
}

function startBeforeEnd(startField: string, endField: string): ValidatorFn {
  return (form: AbstractControl): ValidationErrors | null => {
    const start = form.get(startField)?.value;
    const end = form.get(endField)?.value;

    if (!start || !end) return null;

    const startDate = new Date(start);
    const endDate = new Date(end);

    return startDate > endDate ? { startAfterEnd: true } : null;
  };
}

export function timeFromBeforeTimeTo(fromKey: string, toKey: string): ValidatorFn {
  return (form: AbstractControl): ValidationErrors | null => {
    const fromControl = form.get(fromKey);
    const toControl = form.get(toKey);

    if (!fromControl?.value || !toControl?.value) return null;

    const from = new Date(fromControl.value);
    const to = new Date(toControl.value);

    from.setSeconds(0, 0);
    to.setSeconds(0, 0);

    return from >= to ? { timeFromAfterTimeTo: true } : null;
  };
}

export function crossDateTimeValidator(
  fromKey: string,
  toKey: string,
  crossDayKey: string,
  { strictEqualInvalid = true } = {}
): ValidatorFn {
  return (form: AbstractControl): ValidationErrors | null => {
    const fromCtrl = form.get(fromKey);
    const toCtrl = form.get(toKey);
    const crossCtrl = form.get(crossDayKey);

    if (!fromCtrl || !toCtrl || !crossCtrl) return null;
    if (!fromCtrl.value || !toCtrl.value) return null;

    const from = new Date(fromCtrl.value);
    const to = new Date(toCtrl.value);

    // Compare by HH:mm only (avoid date parts)
    const fromMin = from.getHours() * 60 + from.getMinutes();
    const toMin = to.getHours() * 60 + to.getMinutes();

    // 1) Always disallow equal times
    if (fromMin === toMin) {
      return { timeFromAndToAreEqual: true };
    }

    const isCrossDay = !!crossCtrl.value;

    // 2) Normal shift: from must be before to (same day)
    if (!isCrossDay && fromMin > toMin) {
      return { timeFromAfterTimeTo: true };
    }

    // 3) Cross-day shift: from must be after to (wraps past midnight)
    if (isCrossDay && fromMin < toMin) {
      return { timeRangeShouldCrossDay: true };
    }

    return null;
  };
}
export function crossDateShiftEndNotPassNextDayStart(): ValidatorFn {
  return (form: AbstractControl): ValidationErrors | null => {
    const isCrossDayShift = !!form.get('isCrossDayShift')?.value;

    const from = form.get('timeFrom')?.value ? new Date(form.get('timeFrom')?.value) : null;
    const to = form.get('timeTo')?.value ? new Date(form.get('timeTo')?.value) : null;

    if (!from || !to) {
      return null;
    }

    const bufferedWindow = calculateBufferedShiftWindow(from, to, isCrossDayShift, {
      beforeAttendanceBuffer: form.get('beforeAttendanceBuffer')?.value,
      afterAttendanceBuffer: form.get('afterAttendanceBuffer')?.value,
      beforeLeaveBuffer: form.get('beforeLeaveBuffer')?.value,
      afterLeaveBuffer: form.get('afterLeaveBuffer')?.value,
    });

    if (bufferedWindow.totalMinutes > 24 * 60) {
      return { invalidShiftConfiguration: true };
    }

    return null;
  };
}

/**
 * Date range validator for ensuring dates are within allowed business rules
 * @param minDate - Minimum allowed date
 * @param maxDate - Maximum allowed date
 * @param maxRangeMonths - Maximum allowed range in months between start and end dates
 */
export function dateRangeValidator(
  minDate: Date,
  maxDate: Date,
  maxRangeMonths: number = 3
): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const dateFromControl = formGroup.get('startDate');
    const dateToControl = formGroup.get('endDate');

    if (!dateFromControl || !dateToControl) return null;

    const dateFrom = dateFromControl.value;
    const dateTo = dateToControl.value;

    if (!dateFrom || !dateTo) return null;

    const normalizedFrom = normalizeDate(dateFrom);
    const normalizedTo = normalizeDate(dateTo);
    const normalizedMin = normalizeDate(minDate);
    const normalizedMax = normalizeDate(maxDate);

    const errors: ValidationErrors = {};

    // Check if dateFrom is within allowed range
    if (normalizedFrom < normalizedMin || normalizedFrom > normalizedMax) {
      errors['dateFromOutOfRange'] = {
        min: minDate,
        max: maxDate,
        actual: normalizedFrom,
      };
    }

    // Check if dateTo is within allowed range
    if (normalizedTo < normalizedMin || normalizedTo > normalizedMax) {
      errors['dateToOutOfRange'] = {
        min: minDate,
        max: maxDate,
        actual: normalizedTo,
      };
    }

    // Check if dateTo is after dateFrom
    if (normalizedTo < normalizedFrom) {
      errors['startAfterEnd'] = {
        message: 'Date To must be greater than Date From',
      };
    }

    // Check if the range exceeds maximum allowed months
    if (normalizedTo > normalizedFrom) {
      const monthsDiff = getMonthsDifference(normalizedFrom, normalizedTo);
      if (monthsDiff >= maxRangeMonths) {
        const maxAllowedTo = addMonths(normalizedFrom, maxRangeMonths);
        maxAllowedTo.setDate(maxAllowedTo.getDate() - 1);

        errors['maxRangeExceeded'] = {
          maxMonths: maxRangeMonths,
          actualMonths: monthsDiff,
          maxAllowedTo: maxAllowedTo,
        };
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };
}

/**
 * Utility function to normalize date (set time to 00:00:00)
 */
function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Utility function to add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Utility function to calculate months difference between two dates
 */
function getMonthsDifference(startDate: Date, endDate: Date): number {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  const yearsDiff = end.getFullYear() - start.getFullYear();
  const monthsDiff = end.getMonth() - start.getMonth();
  const daysDiff = end.getDate() - start.getDate();

  let totalMonths = yearsDiff * 12 + monthsDiff;

  // If the end date's day is before the start date's day, subtract a month
  if (daysDiff < 0) {
    totalMonths--;
  }

  return totalMonths;
}

export type customValidationTypes =
  | 'ENG_NUM'
  | 'AR_NUM'
  | 'ENG_ONLY'
  | 'AR_ONLY'
  | 'ENG_NUM_ONLY'
  | 'AR_NUM_ONLY'
  | 'ENG_NUM_ONE_ENG'
  | 'AR_NUM_ONE_AR'
  | 'ENG_AR_ONLY'
  | 'ENG_AR_NUM_ONLY'
  | 'ENG_NO_SPACES_ONLY'
  | 'PASSPORT'
  | 'EMAIL'
  | 'NUM_HYPHEN_COMMA'
  | 'PHONE_NUMBER'
  | 'FAX'
  | 'WEBSITE'
  | 'URL'
  | 'HAS_LETTERS'
  | 'START_BEFORE_END'
  | 'TIME_FROM_BEFORE_TIME_TO'
  | 'NATIONAL_ID';

export const validationPatterns: any = {
  ENG_NUM: new RegExp(/^[a-zA-Z0-9\- ]+$/),
  AR_NUM: new RegExp(/^[\u0621-\u064A0-9\u0660-\u0669\- ]+$/),
  ENG_ONLY: new RegExp(/^[a-zA-Z ]+$/),
  AR_ONLY: new RegExp(/^[\u0621-\u064A ]+$/),
  ENG_NUM_ONLY: new RegExp(/^[a-zA-Z0-9]+$/),
  AR_NUM_ONLY: new RegExp(/^[\u0621-\u064A0-9\u0660-\u0669]+$/),
  ENG_NUM_ONE_ENG: new RegExp(/^(?=.*[a-zA-Z])([a-zA-Z0-9\- ]+)$/),
  AR_NUM_ONE_AR: new RegExp(/^(?=.*[\u0621-\u064A])([\u0621-\u064A0-9\u0660-\u0669\- ]+)$/),
  ENG_AR_ONLY: new RegExp(/^[a-zA-Z\u0621-\u064A ]+$/),
  ENG_AR_NUM_ONLY: new RegExp(/^[a-zA-Z\u0621-\u064A0-9\u0660-\u0669 ]+$/),
  ENG_NO_SPACES_ONLY: new RegExp(/^[a-zA-Z]+$/),
  PASSPORT: new RegExp('^[A-Z][0-9]{8,}$'),
  EMAIL: new RegExp(
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])/
  ),
  NUM_HYPHEN_COMMA: new RegExp('^(?=.*?[1-9])[0-9-,._]+$'),
  PHONE_NUMBER: new RegExp(/^(0)\d{9}$/),
  FAX: new RegExp(/^[+]?[0-9]+$/),
  WEBSITE: new RegExp(
    /^((https?|ftp|smtp):\/\/)?(www.)?[a-z0-9-]+(\.[a-z]{2,}){1,3}(#?\/?[a-zA-Z0-9#]+)*\/?(\?[a-zA-Z0-9-_=]+=[a-zA-Z0-9-%]+&?)?$/
  ),
  URL: new RegExp(
    'https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,}'
  ),
  HAS_LETTERS: new RegExp(
    /^[\u0621-\u064A0-9\u0660-\u0669\u0621-\u064Aa-zA-Z0-9]*[\u0621-\u064Aa-zA-Z ]/
  ),
  NATIONAL_ID: new RegExp(/^(1|2|3|4)\d{9}$/),
};

export function strongPassword(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*()_\-+=<>?.,:;{}[\]~]/.test(value);
    const isLongEnough = value.length >= defaultLengths.PASSWORD_MIN;
    const isShortEnough = value.length <= defaultLengths.PASSWORD_MAX;

    const valid =
      hasUpperCase && hasLowerCase && hasDigit && hasSpecial && isLongEnough && isShortEnough;

    return valid
      ? null
      : {
          strongPassword: {
            hasUpperCase,
            hasLowerCase,
            hasDigit,
            hasSpecial,
            isLongEnough,
            isShortEnough,
          },
        };
  };
}

export const CustomValidators = {
  defaultLengths,
  pattern,
  startBeforeEnd,
  dateRangeValidator,
  strongPassword,
  numberMaxLength,
  numberMinLength,
  positiveNumber,
  integerNumber,
  numberRange,
  shiftCycleDaysRange,
  timeFromBeforeTimeTo,
  crossDateTimeValidator,
};
