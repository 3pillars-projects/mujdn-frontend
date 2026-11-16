import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { PresenceInquiry } from '@/models/features/presence-inquiry/presence-inquiry';
import { AlertService } from '@/services/shared/alert.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { UserProfilePresenceInquiry } from '@/models/features/presence-inquiry/user-profile-presence-inquiry';
import { DepartmentService } from '@/services/features/lookups/department.service';
import { UserProfileService } from '@/services/features/user-profile.service';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { UserFilter } from '@/models/auth/user-filter';
import { PaginationParams } from '@/models/shared/pagination-params';
import { PaginationInfo } from '@/models/shared/response/pagination-info';
import { TranslatePipe } from '@ngx-translate/core';
import { PresenceInquiryService } from '@/services/features/presence-inquiry.service';
import { LanguageService } from '@/services/shared/language.service';
import { LAYOUT_DIRECTION_ENUM } from '@/enums/layout-direction-enum';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { getLocalizedName } from '@/utils/localized-name';
import { EnglishNamePipe } from '@/pipes/english-name.pipe';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

@Component({
  selector: 'app-assign-employee-responsibility-popup',
  imports: [
    FormsModule,
    Select,
    DatePickerModule,
    InputTextModule,
    ReactiveFormsModule,
    CommonModule,
    TableModule,
    PaginatorModule,
    TranslatePipe,
    EnglishNamePipe,
    WithNameFallbackPipe,
  ],
  templateUrl: './assign-employee-responsibility-popup.component.html',
  styleUrl: './assign-employee-responsibility-popup.component.scss',
})
export class AssignEmployeeResponsibilityPopupComponent implements OnInit {
  declare model: PresenceInquiry;
  declare form: FormGroup;
  first: number = 0;
  rows: number = 10;
  declare direction: LAYOUT_DIRECTION_ENUM;

  paginationInfo: PaginationInfo = new PaginationInfo();
  paginationParams: PaginationParams = new PaginationParams();
  alertService = inject(AlertService);
  fb = inject(FormBuilder);
  data = inject(MAT_DIALOG_DATA);
  departments: BaseLookupModel[] = [];
  departmentService = inject(DepartmentService);
  userProfileService = inject(UserProfileService);
  availableUsers: UserProfilePresenceInquiry[] = [];
  users: BaseLookupModel[] = [];
  filterModel: UserFilter = new UserFilter();
  selectedUsers: UserProfilePresenceInquiry[] = [];
  presenceInquiryService = inject(PresenceInquiryService);
  dialogRef = inject(MatDialogRef);
  languageService = inject(LanguageService);
  ngOnInit(): void {
    this.direction =
      this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
        ? LAYOUT_DIRECTION_ENUM.LTR
        : LAYOUT_DIRECTION_ENUM.RTL;
    this.departmentService.getLookup().subscribe((res: BaseLookupModel[]) => {
      this.departments = res;
    });
    this.loadUsersAvailableForPresenceInquiriesPaginated();
    this.userProfileService.getLookup().subscribe((res: BaseLookupModel[]) => {
      this.users = res;
    });

    this.model = new PresenceInquiry();
    this.model.id = this.data.id;
  }

  loadUsersAvailableForPresenceInquiriesPaginated() {
    this.userProfileService
      .loadUsersAvailableForPresenceInquiriesPaginated(this.paginationParams, {
        ...this.filterModel!,
      })
      .subscribe((res: PaginatedList<UserProfilePresenceInquiry>) => {
        this.availableUsers = res.list; // or res depending on what you want
        this.paginationInfo = res.paginationInfo;
      });
  }

  toggleUserSelection(userId: number, event?: Event) {
    const checked = (event?.target as HTMLInputElement)?.checked;

    if (checked) {
      const user = this.availableUsers.find((u) => u.id === userId);
      if (user && !this.selectedUsers.some((u) => u.id === userId)) {
        this.selectedUsers.push(user);
      }
    } else {
      this.selectedUsers = this.selectedUsers.filter((u) => u.id !== userId);
    }
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUsers.some((u) => u.id === userId);
  }

  saveAssignments(): void {
    const successObject = { messages: ['COMMON.SAVED_SUCCESSFULLY'] };
    const inquiryId = this.model?.id;

    if (!inquiryId) return;

    this.presenceInquiryService
      .assignInquiryToUsers(
        inquiryId,
        this.selectedUsers.map((u) => u.id)
      )
      .subscribe({
        next: (res) => {
          this.dialogRef.close(DIALOG_ENUM.OK);
          this.alertService.showSuccessMessage(successObject);
        },
      });
  }

  toggleAll(checked: boolean): void {
    const currentPageUsers = this.availableUsers.filter((u) => u.id !== undefined);

    if (checked) {
      // Add all users from current page that aren't already selected
      const newUsers = currentPageUsers.filter(
        (u) => !this.selectedUsers.some((su) => su.id === u.id)
      );

      this.selectedUsers = [...this.selectedUsers, ...newUsers];
    } else {
      // Remove only users from the current page
      const currentIds = new Set(currentPageUsers.map((u) => u.id));
      this.selectedUsers = this.selectedUsers.filter((u) => !currentIds.has(u.id));
    }
  }

  onPageChange(event: PaginatorState) {
    this.first = event.first!;
    this.rows = event.rows!;
    this.paginationParams.pageNumber = Math.floor(this.first / this.rows) + 1;
    this.paginationParams.pageSize = this.rows;
    this.loadUsersAvailableForPresenceInquiriesPaginated();
  }

  getDepartmentName(id: number): string {
    const department = this.departments.find((d) => d.id === id);
    return getLocalizedName(department, this.languageService.getCurrentLanguage());
  }

  search() {
    this.paginationParams.pageNumber = 1;
    this.first = 0;
    this.loadUsersAvailableForPresenceInquiriesPaginated();
  }

  close() {
    this.dialogRef.close();
  }

  resetSearch() {
    this.filterModel = new UserFilter();
    this.paginationParams.pageNumber = 1;
    this.paginationParams.pageSize = 10;
    this.first = 0;
    this.loadUsersAvailableForPresenceInquiriesPaginated();
  }

  getPropertyName() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH ? 'nameEn' : 'nameAr';
  }

  returnCheckAllStatus() {
    return this.availableUsers.every((availableUser) =>
      this.selectedUsers.map((selectedUser) => selectedUser.id).includes(availableUser.id)
    );
  }

  getUserName(user: UserProfilePresenceInquiry) {
    return getLocalizedName(user, this.languageService.getCurrentLanguage(), 'fullName');
  }
}
