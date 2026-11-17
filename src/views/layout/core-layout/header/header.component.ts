import { OverlayPanelModule } from 'primeng/overlaypanel';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LANGUAGE_BUTTON_LABEL_ENUM } from '@/enums/language-button-label-enum';
import { LocalStorageService } from '@/services/shared/local-storage.service';
import { LanguageService } from '@/services/shared/language.service';
import { AuthService } from '@/services/auth/auth.service';
import { LoggedInUser } from '@/models/auth/logged-in-user';
import { SharedService } from '@/services/shared/shared.service';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentShiftService } from '@/services/features/lookups/current-shift.service';
import EmployeeShift from '@/models/features/lookups/work-shifts/employee-shift';
import { WorkDaysSetting } from '@/models/features/setting/work-days-setting';
import { WorkShiftType } from '@/enums/work-shift-type';
import { getShiftTypeTranslation } from '@/utils/shift-helper';
import { PopoverModule } from 'primeng/popover';
import { formatTimeTo12Hour } from '@/utils/general-helper';
import { getLocalizedName } from '@/utils/localized-name';
import { SystemTypeEnum } from '@/enums/system-type-enum';

@Component({
  selector: 'app-header',
  imports: [MenuModule, ButtonModule, PopoverModule, CommonModule, TranslatePipe],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  // ─── Injected services ────────────────────────────────────────────────────────
  readonly languageService = inject(LanguageService);
  readonly translateService = inject(TranslateService);
  readonly authService = inject(AuthService);
  readonly currentShiftService = inject(CurrentShiftService);
  private readonly localStorageService = inject(LocalStorageService);
  private readonly sharedService = inject(SharedService);
  private readonly router = inject(Router);

  // ─── UI state ─────────────────────────────────────────────────────────────────
  declare currentLanguage: string;
  languageEnum = LANGUAGE_ENUM;
  WorkShiftType = WorkShiftType;
  declare loggedInUser?: LoggedInUser;
  menuItems: MenuItem[] = [];
  shiftPanelVisible = false;

  // ─── Current shift local state ────────────────────────────────────────────────
  currentShift: EmployeeShift | null = null;
  defaultWorkDays: WorkDaysSetting = new WorkDaysSetting();

  private readonly destroy$ = new Subject<void>();

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.authService.getUser().subscribe((user) => {
      this.loggedInUser = user;
    });

    this.initializeProfileMenu();

    // Re-initialize profile menu when language changes
    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.initializeProfileMenu();
    });

    // Sync current shift state from the service into local properties for template binding.
    // The service populates these silently (no global spinner); the panel always shows
    // whatever is cached and reflects updates automatically once the refresh completes.
    this.currentShiftService.currentShift$
      .pipe(takeUntil(this.destroy$))
      .subscribe((shift) => (this.currentShift = shift));

    this.currentShiftService.defaultWorkDays$
      .pipe(takeUntil(this.destroy$))
      .subscribe((days) => (this.defaultWorkDays = days));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Overlay panel events ─────────────────────────────────────────────────────

  onShiftPanelShow(): void {
    this.shiftPanelVisible = true;
    // Silently re-fetch the latest shift data every time the user opens the panel
    this.currentShiftService.refresh();
  }

  onShiftPanelHide(): void {
    this.shiftPanelVisible = false;
  }

  // ─── Derived display helpers ──────────────────────────────────────────────────

  /** Returns the shift name based on the current UI language.
   *
   * Name source priority (mirrors the backend response shape):
   *   1. `shiftDetails.nameAr/nameEn`  — non-rotating shifts
   *   2. Active rotation group's name   — rotating shifts (resolved by `resolvedPeriodOrder`)
   *   3. Top-level `nameAr/nameEn`      — legacy fallback
   */
  getCurrentShiftName(): string {
    if (!this.currentShift) return '';
    const language = this.uiLanguage();

    // Non-rotating: name is inside shiftDetails
    if (this.currentShift.shiftDetails) {
      return getLocalizedName(this.currentShift.shiftDetails, language);
    }

    // Rotating: use the currently-active rotation group
    if (this.currentShift.rotationGroups?.length) {
      const periodOrder = this.currentShift.resolvedPeriodOrder;
      const group =
        periodOrder != null
          ? (this.currentShift.rotationGroups.find((g) => g.periodOrder === periodOrder) ??
            this.currentShift.rotationGroups[0])
          : this.currentShift.rotationGroups[0];
      return getLocalizedName(group.shiftDetails, language);
    }

    // Fallback to top-level names
    return getLocalizedName(this.currentShift, language);
  }

  /** Returns whether today is a working day for the current shift.
   *
   * Prefers the backend-authoritative `isRestDay` flag when present.
   * Falls back to client-side calculation only when the flag is absent.
   */
  get isTodayWorkingDay(): boolean {
    if (!this.currentShift) return true;
    if (this.currentShift.isRestDay !== undefined && this.currentShift.isRestDay !== null) {
      return !this.currentShift.isRestDay;
    }
    return this.currentShiftService.isTodayWorkingDay(this.currentShift);
  }

  /** Returns the translated work-day status label. */
  getShiftStatusLabel(): string {
    if (!this.currentShift) return '';
    return this.isTodayWorkingDay
      ? this.translateService.instant('MY_SHIFTS.WORK_DAY_MESSAGE')
      : this.translateService.instant('MY_SHIFTS.REST_DAY_MESSAGE');
  }

  /** Returns the translated working-day names for the current shift.
   *
   * - If `employeeWorkingDays` is set (comma-separated day indices), those are used.
   * - Otherwise falls back to the organisation's default work days from `defaultWorkDays`.
   */
  getWorkDayNames(): string[] {
    const DAY_KEYS = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ] as const;

    // Shift has explicit working days — parse the comma-separated index list
    if (this.currentShift?.employeeWorkingDays) {
      return this.currentShift.employeeWorkingDays
        .split(',')
        .map((d) => parseInt(d.trim(), 10))
        .filter((d) => !isNaN(d) && d >= 0 && d <= 6)
        .map((d) => this.translateService.instant(`USER_WORK_SHIFT_ASSIGNMENT.${DAY_KEYS[d]}`));
    }

    // No shift-level override — derive from the organisation's default work-days setting
    const wd = this.defaultWorkDays;
    const dayFlags: boolean[] = [
      wd.sunday,
      wd.monday,
      wd.tuesday,
      wd.wednesday,
      wd.thursday,
      wd.friday,
      wd.saturday,
    ];

    return dayFlags
      .map((active, i) => ({ active, key: DAY_KEYS[i] }))
      .filter(({ active }) => active)
      .map(({ key }) => this.translateService.instant(`USER_WORK_SHIFT_ASSIGNMENT.${key}`));
  }

  /** Returns the translated shift type name (e.g. "Standard Work Hours Shift"). */
  getShiftTypeName(): string {
    return getShiftTypeTranslation(this.currentShift?.workShiftType, this.translateService);
  }

  /** Returns the formatted presence inquiry time (24-hour rest system). */
  getFormattedPresenceTime(): string {
    if (!this.currentShift) return '';
    return this.currentShiftService.getFormattedPresenceTime(
      this.currentShift,
      this.languageService.getCurrentLanguage()
    );
  }

  /** Returns the current text direction based on the active language. */
  get dir(): 'rtl' | 'ltr' {
    return this.isArabic() ? 'rtl' : 'ltr';
  }

  constructor() {
    console.log(this.dir);
  }

  // ─── Auth / language helpers ──────────────────────────────────────────────────

  getLanguageButtonText(): string {
    return this.translateService.currentLang === LANGUAGE_ENUM.ARABIC
      ? LANGUAGE_BUTTON_LABEL_ENUM.ENGLISH
      : LANGUAGE_BUTTON_LABEL_ENUM.ARABIC;
  }

  changeLanguage(): void {
    const targetLanguage =
      this.translateService.currentLang === LANGUAGE_ENUM.ENGLISH
        ? LANGUAGE_ENUM.ARABIC
        : LANGUAGE_ENUM.ENGLISH;
    this.languageService.setLanguage(targetLanguage);
  }

  getLoggedInUserName(): string {
    return getLocalizedName(this.loggedInUser, this.uiLanguage(), 'fullName');
  }

  getLoggedInUserDepartment(): string {
    return getLocalizedName(this.loggedInUser, this.uiLanguage(), 'departName');
  }

  toggleSideMenu(): void {
    this.sharedService.toggleSideMenu();
  }

  logout(): void {
    this.authService.logout().subscribe();
  }

  openProfile(): void {
    this.router.navigate(['/profile']);
  }

  // ─── Private ──────────────────────────────────────────────────────────────────

  private isArabic(): boolean {
    return this.translateService.currentLang === LANGUAGE_ENUM.ARABIC;
  }

  private uiLanguage(): LANGUAGE_ENUM {
    return this.isArabic() ? LANGUAGE_ENUM.ARABIC : LANGUAGE_ENUM.ENGLISH;
  }

  private initializeProfileMenu(): void {
    this.menuItems = [
      {
        label: this.translateService.instant('PROFILE_PAGE.PROFILE'),
        icon: '/assets/icons/profile.svg',
        command: () => this.openProfile(),
      },
      {
        label: this.translateService.instant('COMMON.LOG_OUT'),
        icon: '/assets/icons/logout.svg',
        command: () => this.logout(),
      },
    ];
  }
  formatTime(timestamp?: string) {
    if (!timestamp) return '-';
    const locale = this.isArabic() ? 'ar-EG' : 'en-US';
    return formatTimeTo12Hour(timestamp, locale);
  }

  showToggleSystem(): boolean {
    const url = new URL(this.router.url, window.location.origin);

    const firstSegment = url.pathname
      .split('/')
      .filter((segment) => segment !== '')[0]
      ?.toLowerCase();

    return (
      firstSegment === SystemTypeEnum.ATTENDANCE.toLowerCase() ||
      firstSegment === SystemTypeEnum.VISITS.toLowerCase()
    );
  }
  hasVisitsAccess() {
    return this.authService.hasVisitsAccess;
  }

  showTodayShiftButton() {
    const firstSegment = this.router.url.split('?')[0].split('/')[1];
    return firstSegment == SystemTypeEnum.ATTENDANCE.toLowerCase();
  }

  toggleSystem() {
    const firstSegment = this.router.url.split('?')[0].split('/')[1];
    if (firstSegment == SystemTypeEnum.ATTENDANCE.toLowerCase()) {
      this.router.navigate(['/visits/home']);
    } else {
      this.router.navigate(['/attendance/home']);
    }
  }

  toggleSystemButtonTitle() {
    const firstSegment = this.router.url.split('?')[0].split('/')[1];
    if (firstSegment == SystemTypeEnum.ATTENDANCE.toLowerCase()) {
      return this.translateService.instant('COMMON.SWITCH_TO_VISITS_SYSTEM');
    } else {
      return this.translateService.instant('COMMON.SWITCH_TO_ATTENDANCE_SYSTEM');
    }
  }
}
