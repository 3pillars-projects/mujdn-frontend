import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { WorkShiftType } from '@/enums/work-shift-type';
import UserWorkShift from '@/models/features/lookups/work-shifts/user-work-shifts';
import { AuthService } from '@/services/auth/auth.service';
import { UserWorkShiftService } from '@/services/features/lookups/user-workshift.service';
import { AlertService } from '@/services/shared/alert.service';
import { LanguageService } from '@/services/shared/language.service';
import { WorkShiftsAssignmentPopupComponent } from './work-shifts-assignment-popup.component';

/**
 * Shift / rest duration field of the assign shift popup, rendered with its real template.
 * QC bug W-06 in Bugs-Work-Rest-Cycle-Shift.md (retest 19/11/2026).
 */
describe('WorkShiftsAssignmentPopupComponent – shift / rest duration', () => {
  let fixture: ComponentFixture<WorkShiftsAssignmentPopupComponent>;
  let component: WorkShiftsAssignmentPopupComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WorkShiftsAssignmentPopupComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        {
          provide: MAT_DIALOG_DATA,
          useValue: { model: new UserWorkShift(), viewMode: ViewModeEnum.CREATE, lookups: {} },
        },
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        { provide: AlertService, useValue: jasmine.createSpyObj('AlertService', ['showErrorMessage', 'showSuccessMessage']) },
        { provide: UserWorkShiftService, useValue: jasmine.createSpyObj('UserWorkShiftService', ['assignUserShift', 'update']) },
        { provide: AuthService, useValue: { isHROfficer: true } },
        { provide: LanguageService, useValue: { getCurrentLanguage: () => LANGUAGE_ENUM.ENGLISH } },
      ],
    });
    fixture = TestBed.createComponent(WorkShiftsAssignmentPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.workShiftTypeControl.setValue(WorkShiftType.WeekOnWeekOff);
    fixture.detectChanges();
  });

  /** Puts raw text in the field as a browser or test tool would, without key events. */
  function enterDuration(text: string): void {
    const input = fixture.nativeElement.querySelector('#legacyDaysCount') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    tick(150); // validation messages are debounced
    fixture.detectChanges();
  }

  function shownMessages(): string[] {
    const field = (fixture.nativeElement as HTMLElement)
      .querySelector('#legacyDaysCount')!
      .closest('div.lg\\:col-span-2')!;
    return Array.from(field.querySelectorAll('.validation-message')).map((m) =>
      m.textContent!.trim()
    );
  }

  for (const value of ['0', '31']) {
    it(`shows only the days message for ${value} (W-06)`, fakeAsync(() => {
      enterDuration(value);

      expect(Object.keys(component.legacyDaysCountControl.errors ?? {})).toEqual([
        'shiftCycleDaysRange',
      ]);
      expect(shownMessages()).toEqual(['USER_WORK_SHIFT_ASSIGNMENT.SHIFT_PERIOD_DURATION_RANGE']);
    }));
  }

  for (const [text, days] of [
    ['1', 1],
    ['30', 30],
    ['07', 7],
  ] as const) {
    it(`accepts "${text}" as ${days} days`, fakeAsync(() => {
      enterDuration(text);

      expect(component.legacyDaysCountControl.valid).toBeTrue();
      expect(component.cycleDays).toBe(days);
      expect(shownMessages()).toEqual([]);
    }));
  }
});
