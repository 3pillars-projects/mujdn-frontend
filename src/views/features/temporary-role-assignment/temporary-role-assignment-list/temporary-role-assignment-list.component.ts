import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { TemporaryRoleAssignmentFilter } from '@/models/features/temporary-role-assignment/temporary-role-assignment-filter';
import { TemporaryRoleAssignment } from '@/models/features/temporary-role-assignment/temporary-role-assignment';
import { UserService } from '@/services/features/user.service';
import { TemporaryRoleAssignmentService } from '@/services/features/temporary-role-assignment.service';
import { AuthService } from '@/services/auth/auth.service';
import { formatDateTime } from '@/utils/general-helper';
import { getLocalizedName } from '@/utils/localized-name';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { DatePickerModule } from 'primeng/datepicker';
import { PaginatorModule } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Router, RouterModule } from '@angular/router';
import { TemporaryRoleAssignmentPopupComponent } from '../temporary-role-assignment-popup/temporary-role-assignment-popup.component';

@Component({
  selector: 'app-temporary-role-assignment-list',
  imports: [
    Breadcrumb,
    TableModule,
    PaginatorModule,
    Select,
    DatePickerModule,
    FormsModule,
    TranslatePipe,
    CommonModule,
    RouterModule,
    WithNameFallbackPipe,
  ],
  providers: [TemporaryRoleAssignmentService],
  templateUrl: './temporary-role-assignment-list.component.html',
  styleUrl: './temporary-role-assignment-list.component.scss',
})
export default class TemporaryRoleAssignmentListComponent extends BaseListComponent<
  TemporaryRoleAssignment,
  TemporaryRoleAssignmentPopupComponent,
  TemporaryRoleAssignmentService,
  TemporaryRoleAssignmentFilter
> {
  override dialogSize = {
    width: '100%',
    maxWidth: '600px',
  };

  temporaryRoleAssignmentService = inject(TemporaryRoleAssignmentService);
  userService = inject(UserService);
  authService = inject(AuthService);
  router = inject(Router);
  filterModel: TemporaryRoleAssignmentFilter = new TemporaryRoleAssignmentFilter();
  employees: UsersWithDepartmentLookup[] = [];

  override get service(): TemporaryRoleAssignmentService {
    return this.temporaryRoleAssignmentService;
  }

  get canManageTemporaryRoleAssignments(): boolean {
    return this.authService.hasRouteAccess({ actualDepartmentManagerOnly: true });
  }

  set dateFrom(value: Date | null) {
    this.filterModel.dateFrom = value;

    // If dateTo is before dateFrom, reset or adjust it
    if (this.filterModel.dateTo && value && this.filterModel.dateTo < value) {
      this.filterModel.dateTo = null; // or set it to value
    }
  }

  get dateFrom(): Date | null | undefined {
    return this.filterModel.dateFrom;
  }

  override initListComponent(): void {
    if (!this.canManageTemporaryRoleAssignments) {
      this.router.navigate(['/403']);
      return;
    }

    this.userService
      .getMyDepartmentEmployeesAndFirstLevelManagersLookup()
      .subscribe((employees) => {
        this.employees = employees;
      });
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'TEMPORARY_ROLE_ASSIGNMENT_PAGE.TEMPORARY_ROLE_ASSIGNMENTS' }];
  }

  override openDialog(model: TemporaryRoleAssignment): void {
    if (!this.canManageTemporaryRoleAssignments) {
      return;
    }

    const viewMode = model.id ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;

    this.openBaseDialog(TemporaryRoleAssignmentPopupComponent as any, model, viewMode, {
      employees: this.employees,
    });
  }

  addOrEditModel(model?: TemporaryRoleAssignment): void {
    this.openDialog(model ?? new TemporaryRoleAssignment());
  }

  getPropertyName(): string {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';
  }

  getEmployeeName(model: TemporaryRoleAssignment): string {
    return getLocalizedName(model, this.langService.getCurrentLanguage(), 'userFullName');
  }

  getDepartmentName(model: TemporaryRoleAssignment): string {
    return getLocalizedName(model, this.langService.getCurrentLanguage(), 'departmentName');
  }

  isCurrentLanguageEnglish(): boolean {
    return this.langService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH;
  }

  formatDate(value: Date | string | null | undefined): string {
    return this.formatDateTimeParts(value).date || '-';
  }

  formatTime(value: Date | string | null | undefined): string {
    return this.formatDateTimeParts(value).time || '-';
  }

  formatDateTime(value: Date | string | null | undefined): string {
    const { date, time } = this.formatDateTimeParts(value);

    if (!date && !time) {
      return '-';
    }

    return [date, time].filter(Boolean).join(' ');
  }

  private formatDateTimeParts(value: Date | string | null | undefined): {
    date: string;
    time: string;
  } {
    const locale = this.isCurrentLanguageEnglish() ? 'en-US' : 'ar-EG';
    return formatDateTime(value, locale);
  }

  getStatusKey(model: TemporaryRoleAssignment): string {
    if (model.hasEnded) {
      return 'TEMPORARY_ROLE_ASSIGNMENT_PAGE.ENDED';
    }

    if (model.isActiveNow) {
      return 'TEMPORARY_ROLE_ASSIGNMENT_PAGE.ACTIVE_NOW';
    }

    return 'TEMPORARY_ROLE_ASSIGNMENT_PAGE.SCHEDULED';
  }

  getStatusClass(model: TemporaryRoleAssignment): string {
    if (model.hasEnded) {
      return 'text-[#912018] bg-[#fef3f2]';
    }

    if (model.isActiveNow) {
      return 'text-[#085d3a] bg-[#ecfdf3]';
    }

    return 'text-[#1849a9] bg-[#eff8ff]';
  }

  protected override mapModelToExcelRow(
    model: TemporaryRoleAssignment
  ): Record<string, string | number | boolean | null | undefined> {
    return {
      [this.translateService.instant('TEMPORARY_ROLE_ASSIGNMENT_PAGE.EMPLOYEE_NAME')]:
        this.getEmployeeName(model),
      [this.translateService.instant('TEMPORARY_ROLE_ASSIGNMENT_PAGE.DEPARTMENT')]:
        this.getDepartmentName(model),
      [this.translateService.instant('TEMPORARY_ROLE_ASSIGNMENT_PAGE.TEMPORARY_ROLE')]:
        model.roleName || '',
      [this.translateService.instant('TEMPORARY_ROLE_ASSIGNMENT_PAGE.DATE_FROM')]:
        this.formatDateTime(model.dateFrom),
      [this.translateService.instant('TEMPORARY_ROLE_ASSIGNMENT_PAGE.DATE_TO')]:
        this.formatDateTime(model.dateTo),
      [this.translateService.instant('TEMPORARY_ROLE_ASSIGNMENT_PAGE.CURRENT_STATUS')]:
        this.translateService.instant(this.getStatusKey(model)),
    };
  }
  getTranslatedTemporaryRoleAssignmentLabel(): string {
    return this.translateService.instant(
      'TEMPORARY_ROLE_ASSIGNMENT_PAGE.TEMPORARY_ROLE_ASSIGNMENTS'
    );
  }
}
