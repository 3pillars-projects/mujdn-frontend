import { Component, inject, OnInit } from '@angular/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { EditInfoPopupComponent } from '../edit-info-popup/edit-info-popup.component';
import { ChangePasswordPopupComponent } from '../change-password-popup/change-password-popup.component';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { UserProfileFilter } from '@/models/features/user-profile/user-profile-filter';
import { UserProfileService } from '@/services/features/user-profile.service';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { UserProfile } from '@/models/features/user-profile/user-profile';
import { CommonModule } from '@angular/common';
import { LanguageService } from '@/services/shared/language.service';
import { Subject, takeUntil } from 'rxjs';
import { AlertService } from '@/services/shared/alert.service';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { getLocalizedName as localizedNameOf } from '@/utils/localized-name';

@Component({
  selector: 'app-profile',
  imports: [Breadcrumb, TranslatePipe, RouterModule, CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export default class ProfileComponent implements OnInit {
  userProfileService = inject(UserProfileService);
  dialog = inject(MatDialog);
  langService = inject(LanguageService);
  alertsService = inject(AlertService);
  translateService = inject(TranslateService);
  activatedRoute = inject(ActivatedRoute);
  destroy$: Subject<void> = new Subject<void>();

  // Add property to hold the user profile data
  userProfile: UserProfile | null = null;
  breadcrumbs: MenuItem[] = [];
  home = {
    label: this.translateService.instant('COMMON.HOME'),
    icon: 'pi pi-home',
    routerLink: '/home',
  };

  // Current language
  currentLang = 'ar'; // Default to Arabic

  ngOnInit() {
    this.setHomeItem();
    this.initBreadcrumbs();
    this.userProfile = this.activatedRoute.snapshot.data['list'];

    // Get current language
    this.currentLang =
      this.langService.getCurrentLanguage() || this.translateService.currentLang || 'ar';

    // Listen to language changes
    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((langChangeEvent) => {
        this.currentLang = langChangeEvent.lang;
        this.setHomeItem();
        this.initBreadcrumbs();
      });

    // Listen to language service changes if available
    this.langService.languageChanged$.pipe(takeUntil(this.destroy$)).subscribe((lang: string) => {
      this.currentLang = lang;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setHomeItem(): void {
    this.home = {
      label: this.translateService.instant('COMMON.HOME'),
      icon: 'pi pi-home',
      routerLink: '/home',
    };
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = this.getBreadcrumbKeys().map((item) => ({
      label: this.translateService.instant(item.labelKey),
      icon: item.icon,
      routerLink: item.routerLink,
    }));
  }

  getBreadcrumbKeys(): {
    labelKey: string;
    icon?: string;
    routerLink?: string;
  }[] {
    return [{ labelKey: 'PROFILE_PAGE.PROFILE' }];
  }

  // Method to load user profile data
  loadUserProfile(): void {
    this.userProfileService.getMyProfile().subscribe({
      next: (profile: UserProfile) => {
        this.userProfile = profile;
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
      },
    });
  }

  // Helper method to get localized name from BaseLookupModel
  getLocalizedName(lookupModel: BaseLookupModel | undefined): string {
    return localizedNameOf(lookupModel, this.currentLang) || '-';
  }

  // Method to get user initials for avatar
  getUserInitials(): string {
    if (!this.userProfile?.fullName) return 'AA';

    const name = this.getLocalizedName(this.userProfile.fullName);
    const words = name.split(' ');

    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Method to get status display
  getAccountStatus(): { text: string; class: string } {
    if (this.userProfile?.isActive) {
      return {
        text: this.translateService.instant('COMMON.ACTIVE'),
        class: 'bg-[#fef3f2] text-[#085d3a]',
      };
    } else {
      return {
        text: this.translateService.instant('COMMON.INACTIVE'),
        class: 'bg-[#fef2f2] text-[#dc2626]',
      };
    }
  }

  // Method to format roles display
  getRolesDisplay(): string {
    if (!this.userProfile?.roleKeys || this.userProfile.roleKeys.length === 0) {
      return this.translateService.instant('COMMON.NO_ROLES');
    }

    const translatedRoles = this.userProfile.roleKeys.map((roleKey) => {
      const translationKey = `ROLES.${roleKey}`;
      const translatedRole = this.translateService.instant(translationKey);

      // If translation key is not found, return the key itself or a fallback
      return translatedRole !== translationKey ? translatedRole : roleKey;
    });

    // Move EMPLOYEE to the beginning of the list
    const employeeIndex = translatedRoles.indexOf(this.translateService.instant('ROLES.EMPLOYEE'));
    if (employeeIndex > 0) {
      const employee = translatedRoles.splice(employeeIndex, 1)[0];
      translatedRoles.unshift(employee);
    }

    return translatedRoles.join(' - ');
  }

  // Getter methods for localized field values
  get fullName(): string {
    return this.getLocalizedName(this.userProfile?.fullName);
  }

  get department(): string {
    return this.getLocalizedName(this.userProfile?.department);
  }

  get region(): string {
    return this.getLocalizedName(this.userProfile?.region);
  }

  get city(): string {
    return this.getLocalizedName(this.userProfile?.city);
  }

  get jobTitle(): string {
    return this.getLocalizedName(this.userProfile?.jobTitle);
  }

  dialogSize = {
    width: '100%',
    maxWidth: '504px',
  };

  openEditInfoDialog(): void {
    const clonedModel = Object.assign(
      Object.create(Object.getPrototypeOf(this.userProfile)),
      this.userProfile
    );
    this.dialog
      .open(EditInfoPopupComponent, {
        ...this.dialogSize,
        data: clonedModel, // Pass current profile data to dialog
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          // Reload profile data if dialog returned success
          this.loadUserProfile();
        }
      });
  }

  openChangePasswordDialog(): void {
    this.dialog.open(ChangePasswordPopupComponent, this.dialogSize).afterClosed().subscribe();
  }
}
