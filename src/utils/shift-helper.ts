import { TranslateService } from '@ngx-translate/core';
import { WorkShiftType } from '@/enums/work-shift-type';
import { ShiftBufferValues } from '@/models/features/business/shift-buffer-values';
import { BufferedShiftWindow } from '@/models/features/business/buffered-shift-window';

/**
 * Calculates the complete time window covered by the attendance and leave grace periods.
 */
export function calculateBufferedShiftWindow(
  timeFrom: Date,
  timeTo: Date,
  isCrossDayShift: boolean,
  buffers: ShiftBufferValues
): BufferedShiftWindow {
  const scheduledAttendance = new Date(timeFrom);
  const scheduledLeave = new Date(timeTo);
  scheduledAttendance.setSeconds(0, 0);
  scheduledLeave.setSeconds(0, 0);

  if (isCrossDayShift) {
    scheduledLeave.setDate(scheduledLeave.getDate() + 1);
  }

  const bufferMinutes = (value?: number | null): number => {
    const numericValue = Number(value ?? 0);
    return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
  };

  const attendanceWindowStart = new Date(scheduledAttendance);
  attendanceWindowStart.setMinutes(
    attendanceWindowStart.getMinutes() - bufferMinutes(buffers.beforeAttendanceBuffer)
  );

  const attendanceWindowEnd = new Date(scheduledAttendance);
  attendanceWindowEnd.setMinutes(
    attendanceWindowEnd.getMinutes() + bufferMinutes(buffers.afterAttendanceBuffer)
  );

  const leaveWindowStart = new Date(scheduledLeave);
  leaveWindowStart.setMinutes(
    leaveWindowStart.getMinutes() - bufferMinutes(buffers.beforeLeaveBuffer)
  );

  const leaveWindowEnd = new Date(scheduledLeave);
  leaveWindowEnd.setMinutes(leaveWindowEnd.getMinutes() + bufferMinutes(buffers.afterLeaveBuffer));

  const start = new Date(Math.min(attendanceWindowStart.getTime(), leaveWindowStart.getTime()));
  const end = new Date(Math.max(attendanceWindowEnd.getTime(), leaveWindowEnd.getTime()));

  return {
    start,
    end,
    totalMinutes: Math.floor((end.getTime() - start.getTime()) / 60000),
  };
}

/**
 * Determines if a given date is a working day based on the WorkShiftType.
 * Supports:
 * 1. Standard (1): Checks against employee specific working days or organization default settings.
 * 2. WeekOnWeekOff (2) & WeekOnWeekOff24 (3): Approximates the cycle as 14 days work / 14 days off.
 *    The real cycle length is configurable per assignment; prefer the backend `isRestDay` flag.
 *
 * @param workShiftType The type of work shift
 * @param startDate The start date of the shift cycle (required for cycle-based shifts)
 * @param checkDate The date to check (defaults to today)
 * @param employeeWorkingDays Comma-separated list of working day indices (0=Sun, 1=Mon, etc.)
 * @param workDaysSetting Default working days settings (fallback for Standard shifts)
 * @returns true if it is a working day, false otherwise
 */
export function isShiftWorkingDay(
  workShiftType: number,
  startDate: Date | string,
  checkDate: Date | string = new Date(),
  employeeWorkingDays?: string,
  workDaysSetting?: { [key: string]: any }
): boolean {
  const check = new Date(checkDate);
  check.setHours(0, 0, 0, 0);

  if (isNaN(check.getTime())) {
    console.warn('Invalid checkDate provided to isShiftWorkingDay');
    return false;
  }

  // Handle Standard Shift (Fixed Days)
  if (workShiftType === WorkShiftType.Standard) {
    const dayOfWeek = check.getDay(); // 0 (Sunday) to 6 (Saturday)

    // Option A: Specific working days assigned to the employee (e.g., "0,1,2,3,4")
    if (employeeWorkingDays) {
      const workingDayValues = employeeWorkingDays
        .split(',')
        .map((day) => parseInt(day.trim(), 10))
        .filter((day) => !isNaN(day));
      return workingDayValues.includes(dayOfWeek);
    }

    // Option B: Fallback to organization default settings (object with sunday: true, etc.)
    if (workDaysSetting) {
      const dayNames = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      const dayName = dayNames[dayOfWeek];
      // Explicitly check for true to handle both boolean and potential null/undefined
      return workDaysSetting[dayName] === true;
    }

    // Default for Standard: If no settings, assume standard work week (Sun-Thu) or just return true
    return true;
  }

  // Handle Cycle-based Shifts (14-on / 14-off)
  if (
    workShiftType === WorkShiftType.WeekOnWeekOff ||
    workShiftType === WorkShiftType.WeekOnWeekOff24
  ) {
    if (!startDate) return false;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime())) {
      console.warn('Invalid startDate provided to isShiftWorkingDay');
      return false;
    }

    const diffTime = check.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const workDaysInCycle = 14;
    const cycleLength = workDaysInCycle * 2;
    // Normalize cycle index to be positive 0 to (cycleLength - 1)
    const cycleIndex = ((diffDays % cycleLength) + cycleLength) % cycleLength;

    // Days 0-13 are Work (14 days), Days 14-27 are Off (14 days)
    return cycleIndex < workDaysInCycle;
  }

  return false;
}

/**
 * Gets the translated name of the work shift type.
 * @param type The work shift type ID
 * @param translate The translate service instance
 * @returns The translated name of the shift type
 */
export function getShiftTypeTranslation(
  type: number | undefined,
  translate: TranslateService
): string {
  if (type === undefined) return '';

  switch (type) {
    case WorkShiftType.Standard:
      return translate.instant('USER_WORK_SHIFT_ASSIGNMENT.STANDARD_SHIFT');
    case WorkShiftType.WeekOnWeekOff:
      return translate.instant('USER_WORK_SHIFT_ASSIGNMENT.WORK_WEEK_REST_WEEK');
    case WorkShiftType.WeekOnWeekOff24:
      return translate.instant('USER_WORK_SHIFT_ASSIGNMENT.SHIFT_24_HOURS');
    case WorkShiftType.Rotating:
      return translate.instant('USER_WORK_SHIFT_ASSIGNMENT.ROTATING_SHIFT');
    default:
      return '';
  }
}
