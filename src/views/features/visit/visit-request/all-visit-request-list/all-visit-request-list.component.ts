import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { Component, inject, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { MatDialogConfig } from '@angular/material/dialog';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { QrcodeVisitRequestPopupComponent } from '../qrcode-visit-request-popup/qrcode-visit-request-popup.component';
import { Select } from 'primeng/select';
import { AddEditVisitRequestPopupComponent } from '../add-edit-visit-request-popup/add-edit-visit-request-popup.component';
import { ViewActionVisitRequestPopupComponent } from '../view-action-visit-request-popup/view-action-visit-request-popup.component';
import { LinkVisitCardPopupComponent } from '../link-visit-card-popup/link-visit-card-popup.component';
import { TranslatePipe } from '@ngx-translate/core';
import { Visit } from '@/models/features/visit/visit';
import { VisitService } from '@/services/features/visit/visit.service';
import { VisitFilter } from '@/models/features/visit/visit-filter';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { VisitStatusEnum } from '@/enums/visit-status-enum';
import { didVisitTimePassed, formatTimeTo12Hour } from '@/utils/general-helper';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LanguageService } from '@/services/shared/language.service';
import { VisitStatusOption } from '@/models/features/visit/visit-status-option';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { UserService } from '@/services/features/user.service';
import { AuthService } from '@/services/auth/auth.service';
import { AccessLocationService } from '@/services/features/business/access-location.service';
import { map } from 'rxjs';
import { AccessLocationLookup } from '@/models/features/business/access-location-lookup';
import {
  VISIT_ATTENDANCE_STATUS_OPTIONS,
  VisitAttendanceStatusOption,
} from '@/enums/visit-attendance-status-enum';
import { getLocalizedName } from '@/utils/localized-name';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

@Component({
  selector: 'app-all-visit-request-list',
  imports: [
    InputTextModule,
    TableModule,
    CommonModule,
    RouterModule,
    PaginatorModule,
    DatePickerModule,
    FormsModule,
    TabsModule,
    Select,
    DatePicker,
    TranslatePipe,
    WithNameFallbackPipe,
  ],
  templateUrl: './all-visit-request-list.component.html',
  styleUrl: './all-visit-request-list.component.scss',
})
export class AllVisitRequestListComponent
  extends BaseListComponent<Visit, AddEditVisitRequestPopupComponent, VisitService, VisitFilter>
  implements OnInit, OnChanges
{
  @Input() isActive: boolean = false;
  @Input() departments: BaseLookupModel[] = [];
  @Input() nationalities: BaseLookupModel[] = [];
  @Input() visitStatusOptions: VisitStatusOption[] = [];

  override filterModel: VisitFilter = new VisitFilter();
  visitService = inject(VisitService);
  languageService = inject(LanguageService);
  userService = inject(UserService);
  authService = inject(AuthService);
  accessLocationService = inject(AccessLocationService);
  visitCreators: BaseLookupModel[] = [];
  accessLocations: BaseLookupModel[] = [];
  attendanceStatusOptions: VisitAttendanceStatusOption[] = VISIT_ATTENDANCE_STATUS_OPTIONS;

  private hasInitialized = false;

  // visitStatusOptions: { label: string; value: number }[] = [];
  // visitCreatorOptions: { label: string; value: number }[] = [];

  // Enum reference for template
  VisitStatusEnum = VisitStatusEnum;

  override get service(): VisitService {
    return this.visitService;
  }

  visitorSelectionDialogSize = {
    width: '100%',
    maxWidth: '600px',
  };
  override dialogSize = {
    width: '100%',
    maxWidth: '1024px',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isActive']) {
      const current = changes['isActive'].currentValue;
      const previous = changes['isActive'].previousValue;

      // Skip first trigger after component init
      if (!this.hasInitialized) {
        this.hasInitialized = true;
        return;
      }

      // Only load data if tab is active and this is not the initial change
      if (current && !previous) {
        this.loadDataIfNeeded();
      }
    }
  }

  isCurrentLanguageEnglish() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH;
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    const locale = this.isCurrentLanguageEnglish() ? 'en-US' : 'ar-EG';
    return formatTimeTo12Hour(timeString, locale);
  }

  get langOptionLabel(): string {
    const lang = this.languageService.getCurrentLanguage();
    return lang === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }

  private loadDataIfNeeded(): void {
    // Load data when tab becomes active
    this.loadList().subscribe({
      next: (response) => this.handleLoadListSuccess(response),
      error: this.handleLoadListError,
    });
  }

  /** Gate: security staff link an access card to an approved visit that has not ended. */
  showLinkCardButton(visit: Visit): boolean {
    if (!this.authService.isSecurityLeader && !this.authService.isSecurityMember) {
      return false;
    }
    if (visit?.visitStatus !== VisitStatusEnum.APPROVED || !visit.visitDate) {
      return false;
    }
    return !didVisitTimePassed(visit);
  }

  openLinkCardDialog(model: Visit) {
    this.setNationalityNames(model);
    const dialogConfig: MatDialogConfig = new MatDialogConfig();
    dialogConfig.data = { model };
    dialogConfig.width = this.dialogSize.width;
    dialogConfig.maxWidth = this.dialogSize.maxWidth;

    this.matDialog
      .open(LinkVisitCardPopupComponent as any, dialogConfig)
      .afterClosed()
      .subscribe((result: DIALOG_ENUM) => {
        if (result === DIALOG_ENUM.OK) {
          this.loadDataIfNeeded();
        }
      });
  }

  showActionsButton(visit: Visit): boolean {
    if (!this.authService.isSecurityLeader) {
      return false;
    }

    if (!visit?.visitDate) {
      return false;
    }

    return !didVisitTimePassed(visit);
  }

  // Status badge methods
  getStatusBadgeClass(status: number): string {
    switch (status) {
      case VisitStatusEnum.NEW:
        return 'text-[14px] text-[#1849a9] px-2 py-1 w-fit inline-flex justify-center items-center gap-2 px-2 rounded-full bg-[#eff8ff] font-medium';
      case VisitStatusEnum.APPROVED:
        return 'text-[14px] text-[#085d3a] min-w-[101px] min-h-[24px] inline-flex justify-center items-center gap-2 px-2 rounded-full bg-[#ecfdf3] font-medium';
      case VisitStatusEnum.REJECTED:
        return 'text-[14px] text-[#912018] min-w-[101px] min-h-[24px] inline-flex justify-center items-center gap-2 px-2 rounded-full bg-[#fef3f2] font-medium';
      case VisitStatusEnum.EXPIRED:
        return 'text-[14px] text-[#912018] min-w-[101px] min-h-[24px] inline-flex justify-center items-center gap-2 px-2 rounded-full bg-[#fef3f2] font-medium';
      default:
        return 'text-[14px] text-gray-600 px-2 py-1 rounded-full bg-gray-100 font-medium';
    }
  }

  getStatusBadgeDotClass(status: number): string {
    switch (status) {
      case VisitStatusEnum.NEW:
        return 'w-[10px] h-[10px] bg-[#1849a9] rounded-full';
      case VisitStatusEnum.APPROVED:
        return 'w-[10px] h-[10px] bg-[#085d3a] rounded-full';
      case VisitStatusEnum.REJECTED:
        return 'w-[10px] h-[10px] bg-[#912018] rounded-full';
      case VisitStatusEnum.EXPIRED:
        return 'w-[10px] h-[10px] bg-[#912018] rounded-full';
      default:
        return 'w-[10px] h-[10px] bg-gray-600 rounded-full';
    }
  }

  getStatusText(status: number): string {
    switch (status) {
      case VisitStatusEnum.NEW:
        return this.translateService.instant('VISIT_REQUEST_PAGE.NEW');
      case VisitStatusEnum.APPROVED:
        return this.translateService.instant('VISIT_REQUEST_PAGE.ACCEPTED');
      case VisitStatusEnum.REJECTED:
        return this.translateService.instant('VISIT_REQUEST_PAGE.REJECTED');
      case VisitStatusEnum.EXPIRED:
        return this.translateService.instant('VISIT_REQUEST_PAGE.EXPIRED');
      default:
        return '';
    }
  }

  // Department name display
  getDepartmentName(visit: Visit): string {
    return getLocalizedName(visit.targetDepartment, this.languageService.getCurrentLanguage());
  }

  getVisitCreatorName(visit: Visit): string {
    return getLocalizedName(visit.creationUser, this.languageService.getCurrentLanguage());
  }

  override initListComponent(): void {
    this.userService.getLookup().subscribe((response) => {
      this.visitCreators = response;
    });
  }

  protected override getBreadcrumbKeys(): {
    labelKey: string;
    icon?: string;
    routerLink?: string;
  }[] {
    return [{ labelKey: 'VISIT_REQUEST_PAGE.ALL_VISITS' }];
  }

  protected override mapModelToExcelRow(model: Visit): { [key: string]: any } {
    return {
      [this.translateService.instant('VISIT_REQUEST_PAGE.NATIONAL_ID')]: model.nationalId,
      [this.translateService.instant('VISIT_REQUEST_PAGE.VISITOR_NAME')]: model.fullName,
      [this.translateService.instant('VISIT_REQUEST_PAGE.MOBILE_NUMBER')]: model.phoneNumber,
      [this.translateService.instant('VISIT_REQUEST_PAGE.VISITOR_ORGANIZATION')]:
        model.visitorOrganization,
      [this.translateService.instant('VISIT_REQUEST_PAGE.TARGET_DEPARTMENT')]:
        this.getDepartmentName(model),
      [this.translateService.instant('VISIT_REQUEST_PAGE.VISIT_STATUS')]: this.getStatusText(
        model.visitStatus
      ),
      [this.translateService.instant('VISIT_REQUEST_PAGE.VISIT_CREATOR')]:
        this.getVisitCreatorName(model),
      [this.translateService.instant('VISIT_REQUEST_PAGE.ENTRY')]: this.formatTime(
        model.arrivalTime?.toString() || ''
      ),
      [this.translateService.instant('VISIT_REQUEST_PAGE.EXIT')]: this.formatTime(
        model.leaveTime?.toString() || ''
      ),
      [this.translateService.instant('VISIT_REQUEST_PAGE.ATTENDANCE_STATUS')]:
        this.getAttendanceStatusText(model.attendanceStatus),
    };
  }

  openDialog(model?: Visit) {}

  openViewDialog(model?: Visit) {
    this.setNationalityNames(model!);
    if (model?.visitStatus === VisitStatusEnum.APPROVED) {
      this.openQrcodeDialog(model);
    } else {
      this.getSuitableLocationsService(model).subscribe((locations) => {
        this.accessLocations = locations;
        let dialogConfig: MatDialogConfig = new MatDialogConfig();
        dialogConfig.data = {
          model: model,
          accessLocations: this.accessLocations,
        };
        dialogConfig.width = this.dialogSize.width;
        dialogConfig.maxWidth = this.dialogSize.maxWidth;
        const dialogRef = this.matDialog.open(
          ViewActionVisitRequestPopupComponent as any,
          dialogConfig
        );

        dialogRef.afterClosed().subscribe((result: DIALOG_ENUM) => {
          if (result === DIALOG_ENUM.OK) {
            this.loadDataIfNeeded();
          }
        });
      });
    }
  }

  openTakeActionDialog(model: Visit) {
    let dialogConfig: MatDialogConfig = new MatDialogConfig();
    this.setNationalityNames(model);

    this.getSuitableLocationsService(model).subscribe((locations) => {
      this.accessLocations = locations;
      dialogConfig.data = {
        model: model,
        viewMode: ViewModeEnum.TAKE_ACTION,
        accessLocations: this.accessLocations,
      };
      dialogConfig.width = this.dialogSize.width;
      dialogConfig.maxWidth = this.dialogSize.maxWidth;

      const dialogRef = this.matDialog.open(
        ViewActionVisitRequestPopupComponent as any,
        dialogConfig
      );

      return dialogRef.afterClosed().subscribe((result: DIALOG_ENUM) => {
        if (result === DIALOG_ENUM.OK) {
          this.loadDataIfNeeded();
        }
      });
    });
  }

  openQrcodeDialog(model?: Visit) {
    this.getSuitableLocationsService(model).subscribe((locations) => {
      this.accessLocations = locations;
      let dialogConfig: MatDialogConfig = new MatDialogConfig();
      dialogConfig.data = {
        model: model,
        accessLocations: this.accessLocations,
      };
      dialogConfig.width = this.visitorSelectionDialogSize.width;
      dialogConfig.maxWidth = this.visitorSelectionDialogSize.maxWidth;
      const dialogRef = this.matDialog.open(QrcodeVisitRequestPopupComponent as any, dialogConfig);

      return dialogRef.afterClosed().subscribe((result: DIALOG_ENUM) => {
        if (result === DIALOG_ENUM.OK) {
          this.loadDataIfNeeded();
        }
      });
    });
  }

  openEditDialog(model?: Visit) {
    const visit = model ?? new Visit();
    const viewMode = model ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.getSuitableLocationsService(model).subscribe((locations) => {
      this.accessLocations = locations;
      this.openBaseDialog(AddEditVisitRequestPopupComponent as any, visit, viewMode, {
        departments: this.departments,
        nationalities: this.nationalities,
        accessLocations: this.accessLocations,
      });
    });
  }

  getSuitableLocationsService(model?: Visit) {
    const visit = model?.id ? model : new Visit();
    const viewMode = model ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    return viewMode == ViewModeEnum.CREATE
      ? this.accessLocationService.getLocationsConnectedToDevice()
      : this.accessLocationService.getConnectedLocationsWithStatus().pipe(
          map((locations: AccessLocationLookup[]) => {
            return locations.filter((loc) => {
              return loc.status == true || visit.accessLocationIds.includes(loc.id);
            });
          })
        );
  }

  private setNationalityNames(model: Visit | null): void {
    if (!model) return;

    const nationality = this.nationalities.find((n) => n.id === model.fkNationalityId);

    model.nationalityNameAr = nationality?.nameAr ?? '';
    model.nationalityNameEn = nationality?.nameEn ?? '';
  }

  getPropertyName() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';
  }

  // Attendance status badge methods
  getAttendanceBadgeClass(status: number): string {
    const option = this.attendanceStatusOptions.find((o) => o.value === status);
    return (
      option?.badgeClass ||
      'text-[14px] text-gray-600 px-2 py-1 rounded-full bg-gray-100 font-medium'
    );
  }

  getAttendanceBadgeDotClass(status: number): string {
    const option = this.attendanceStatusOptions.find((o) => o.value === status);
    return option?.dotClass || 'w-[10px] h-[10px] bg-gray-600 rounded-full';
  }

  getAttendanceStatusText(status: number): string {
    const option = this.attendanceStatusOptions.find((o) => o.value === status);
    return option ? this.translateService.instant(option.translationKey) : '';
  }
}
