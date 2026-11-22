import { WeekDaysEnum } from '@/enums/week-days-enum';
import { Visit } from '@/models/features/visit/visit';
import {
  AbstractControl,
  FormArray,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

// used in base-crud service for date filtering
export const genericDateOnlyConvertor = function (model: any) {
  if (!model) return model;

  Object.keys(model).forEach((key) => {
    const value = model[key];

    // Only transform if it's specifically a Date
    if (value instanceof Date) {
      const year = model[key].getFullYear();
      const month = `${model[key].getMonth() + 1}`.padStart(2, '0');
      const day = `${model[key].getDate()}`.padStart(2, '0');
      model[key] = `${year}-${month}-${day}`;
    }
  });

  return model;
};

// used for sending data to backend (interceptor)
export const toDateOnly = function (date: any) {
  date = new Date(date);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toDateTimeString = function (date: any) {
  if (date == null) return null;
  date = convertUtcToSystemTimeZone(date);

  date = new Date(date);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const toDateTime = function (date: any) {
  if (date == null) return null;
  date = date.toString();
  date = new Date(date);
  return date;
};

// used to convert time string to date object (Receiving from backend)
export function timeStringToDate(value: string): Date {
  const [hours, minutes, seconds] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, seconds || 0, 0);
  return date;
}

// used to convert date object to time string (Sending to backend)
export function dateToTimeString(date: Date): string | null {
  if (!date) return null;
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

// create a function that takes a UTC date and returns the date in local time
export const toLocalTime = function (date: any) {
  date = new Date(date);
  return date.toLocaleString();
};

// used to convert UTC time to KSA time (Interceptor function)
export function convertUtcToSystemTimeZone(utcDateTime: Date | string): Date {
  // Now is KSA time
  // based on time zone change the offset
  const utcDate = new Date(utcDateTime);

  // add 0 hours to convert to KSA time
  const ksaTime = new Date(utcDate.getTime() + 0 * 60 * 60 * 1000);

  return ksaTime;
}

export function convertKsaToUtc(ksaDateTime: Date | string): Date {
  // Convert the input (string or Date) into a Date object
  const ksaDate = new Date(ksaDateTime);

  // Subtract 0 hours to convert KSA → UTC
  const utcDate = new Date(ksaDate.getTime() - 0 * 60 * 60 * 1000);

  return utcDate;
}
// --Formating date for view only--
// Format time string (HH:MM:SS) to 12-hour format (No time zone conversion)
export function formatTimeTo12Hour(
  timeString: string,
  locale: 'en-US' | 'ar-EG' = 'en-US'
): string {
  if (!timeString) return '';

  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  // Always use 'en-US' to ensure numbers are Latin digits
  const formatted = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (locale === 'ar-EG') {
    return formatted.replace('AM', 'ص').replace('PM', 'م');
  }

  return formatted;
}
export function formatTimeRange(
  timeFrom: string,
  timeTo: string,
  locale: 'en-US' | 'ar-EG' = 'en-US'
): string {
  if (!timeFrom || !timeTo) return '';
  return `${formatTimeTo12Hour(timeFrom, locale)} - ${formatTimeTo12Hour(timeTo, locale)}`;
}

// The table lays this value out right-to-left, so "3:20 ص - 5:21 م" reaches the reader as
// "م 5:21 - ص 3:20" on screen. An Excel cell holding the same text is laid out left-to-right
// instead, and the bidi algorithm then reorders it into "3:20 م 5:21 - ص", detaching each
// marker from its own time. Declaring the cell right-to-left restores the table's layout, and
// measuring the rendered glyph positions confirms the result is identical whether the cell
// ends up left-to-right or right-to-left, so it does not matter which one Excel settles on.
export function toRtlExcelCell(text: string, locale: 'en-US' | 'ar-EG' = 'en-US'): string {
  // Latin AM/PM carries no direction of its own, so English needs no declaration.
  if (locale !== 'ar-EG' || !text) return text;

  const RIGHT_TO_LEFT_EMBEDDING = String.fromCharCode(0x202b);
  const POP_DIRECTIONAL_FORMATTING = String.fromCharCode(0x202c);

  return `${RIGHT_TO_LEFT_EMBEDDING}${text}${POP_DIRECTIONAL_FORMATTING}`;
}

// The shift screens put the date and the time in one cell, where the table gives each its own
// element. Declaring the cell keeps both halves laid out the way the table shows them.
export function formatDateTimeForExcel(
  dateText: string,
  timeText: string,
  locale: 'en-US' | 'ar-EG' = 'en-US'
): string {
  return toRtlExcelCell(`${dateText} ${timeText}`.trim(), locale);
}

export function changeTimeSuffix<T>(
  isCurrentLanguageEnglish: () => boolean,
  item: T,
  timeKey: keyof T,
  formattedKey: keyof T
): void {
  if (!item) return;

  const locale: 'en-US' | 'ar-EG' = isCurrentLanguageEnglish() ? 'en-US' : 'ar-EG';
  const timeValue = item[timeKey] as unknown as string | null | undefined;

  if (timeValue) {
    (item as any)[formattedKey] = formatTimeTo12Hour(timeValue, locale);
  }
}

// Format Date object to 12-hour format (No time zone conversion)
export function formatDateTo12Hour(date: Date, locale: 'en-US' | 'ar-EG' = 'en-US'): string {
  if (!date) return '';

  // Always use 'en-US' to ensure numbers are Latin digits
  const formatted = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (locale === 'ar-EG') {
    return formatted.replace('AM', 'ص').replace('PM', 'م');
  }

  return formatted;
}

export function formatDateOnly(date: any): string {
  if (!date) return '';

  const dt = new Date(date);

  // Force DD/MM/YYYY (stable across environments) while keeping Latin digits
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dt);

  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';

  return `${day}/${month}/${year}`;
}

export function formatDateTime(
  value: Date | string | null | undefined,
  locale: 'en-US' | 'ar-EG' = 'en-US'
): { date: string; time: string } {
  if (!value) return { date: '', time: '' };

  const dateTime = new Date(value);

  return {
    date: formatDateOnly(dateTime),
    time: formatDateTo12Hour(dateTime, locale),
  };
}

export function formatSwipeTime(
  swipeTime: string | undefined,
  locale: 'en-US' | 'ar-EG' = 'en-US'
): { date: string; time: string } {
  if (!swipeTime) return { date: '', time: '' };

  const dateTime = new Date(swipeTime);

  // Force DD/MM/YYYY using formatToParts (stable across environments)
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(dateTime);

  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';

  const date = `${day}/${month}/${year}`;

  // Keep time formatting in English, then replace AM/PM for ar-EG
  let time = dateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (locale === 'ar-EG') {
    time = time.replace('AM', 'ص').replace('PM', 'م');
  }

  return { date, time };
}

export function extractTime(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const src = new Date(value);
  const result = new Date();
  result.setHours(src.getHours(), src.getMinutes(), src.getSeconds(), 0);
  return result;
}

/** Default timeFrom for new records: 00:00:00. */
export function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Default timeTo for new records: 23:59:59. */
export function endOfDay(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d;
}

export function didVisitTimePassed(visit: Visit): boolean {
  const givenDate = new Date(visit.visitDate as string);
  const givenTimeTo = timeStringToDate(visit.visitTimeTo as string);

  // align year, month, and day from givenDate
  givenTimeTo.setFullYear(givenDate.getFullYear(), givenDate.getMonth(), givenDate.getDate());

  const today = new Date();

  return givenTimeTo < today;
}

export function markFormGroupTouched(form: FormGroup | FormArray) {
  Object.values(form.controls).forEach((control) => {
    if (control instanceof FormGroup || control instanceof FormArray) {
      markFormGroupTouched(control); // Recursive call
    } else {
      control.markAsTouched();
    }
  });
}

// Helper function to build translation parameters dynamically
export function buildTranslationParams(details: any, translateService: any): any {
  const translationParams: any = {};
  const currentLang = translateService.currentLang || 'en';

  Object.keys(details).forEach((key) => {
    // Extract the first value from the array, as Details is IDictionary<string, string[]>
    const value =
      Array.isArray(details[key]) && details[key].length > 0 ? details[key][0] : details[key];
    if (key.endsWith('En') && currentLang === 'en') {
      const baseKey = key.replace('En', '');
      translationParams[baseKey] = value;
    } else if (key.endsWith('Ar') && currentLang === 'ar') {
      const baseKey = key.replace('Ar', '');
      translationParams[baseKey] = value;
    } else if (!key.endsWith('En') && !key.endsWith('Ar')) {
      // For non-language-specific parameters
      translationParams[key] = value;
    }
  });

  return translationParams;
}

/**
 * The same day one year later, or the last day of that month when the day does not exist
 * (29 Feb -> 28 Feb). Matches .NET DateOnly.AddYears(1), which the server uses for the shift
 * assignment one-year limit; Date.setFullYear would roll 29 Feb over to 1 Mar instead.
 */
export function addOneYearClamped(date: Date): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setFullYear(result.getFullYear() + 1);
  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfMonth));
  return result;
}

export function shiftingPeriodMaxOneYearValidator(getStartDate: () => string | Date): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const startDate = getStartDate();
    const endDate = control.value as Date | null;
    if (!startDate || !endDate) return null;
    const maxEndDate = addOneYearClamped(new Date(startDate));
    return endDate > maxEndDate ? { shiftingPeriodMaxOneYear: true } : null;
  };
}

export const weekDays = [
  { labelKey: 'USER_WORK_SHIFT_ASSIGNMENT.SATURDAY', value: WeekDaysEnum.SATURDAY },
  { labelKey: 'USER_WORK_SHIFT_ASSIGNMENT.SUNDAY', value: WeekDaysEnum.SUNDAY },
  { labelKey: 'USER_WORK_SHIFT_ASSIGNMENT.MONDAY', value: WeekDaysEnum.MONDAY },
  { labelKey: 'USER_WORK_SHIFT_ASSIGNMENT.TUESDAY', value: WeekDaysEnum.TUESDAY },
  { labelKey: 'USER_WORK_SHIFT_ASSIGNMENT.WEDNESDAY', value: WeekDaysEnum.WEDNESDAY },
  { labelKey: 'USER_WORK_SHIFT_ASSIGNMENT.THURSDAY', value: WeekDaysEnum.THURSDAY },
  { labelKey: 'USER_WORK_SHIFT_ASSIGNMENT.FRIDAY', value: WeekDaysEnum.FRIDAY },
];
