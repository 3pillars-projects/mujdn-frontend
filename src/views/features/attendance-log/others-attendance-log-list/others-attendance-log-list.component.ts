import { Component, inject, Input, OnInit, SimpleChanges } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { SplitButtonModule } from 'primeng/splitbutton';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { ConfirmationService } from '@/services/shared/confirmation.service';
import { AttendanceLogPopupComponent } from '../attendance-log-popup/attendance-log-popup.component';
import { AttendanceService } from '@/services/features/attendance-log.service';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { InputTextModule } from 'primeng/inputtext';
import { LanguageService } from '@/services/shared/language.service';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { DepartmentService } from '@/services/features/lookups/department.service';
import { UserService } from '@/services/features/user.service';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { AttendanceLog } from '@/models/features/attendance/attendance-log/attendance-log';
import { AttendanceLogFilter } from '@/models/features/attendance/attendance-log/attendance-log-filter';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { BooleanOptionModel } from '@/models/shared/boolean-option';
import { PROCESSING_STATUS_OPTIONS } from '@/models/shared/processing-status-option';
import { formatSwipeTime } from '@/utils/general-helper';
import { CustomValidators } from '@/validators/custom-validators';
import { AuthService } from '@/services/auth/auth.service';
import { ImportLogPopupComponent } from '../import-log-popup/import-log-popup.component';
import { AttendanceLogExcelImportPopupComponent } from '../attendance-log-excel-import-popup/attendance-log-excel-import-popup.component';

@Component({
  selector: 'app-others-attendance-log-list',
  imports: [
    FormsModule,
    Select,
    DatePickerModule,
    FluidModule,
    TableModule,
    CommonModule,
    RouterModule,
    SplitButtonModule,
    PaginatorModule,
    TranslatePipe,
    InputTextModule,
  ],
  templateUrl: './others-attendance-log-list.component.html',
  styleUrl: './others-attendance-log-list.component.scss',
  providers: [MessageService],
})
export default class OthersAttendanceLogListComponent
  extends BaseListComponent<
    AttendanceLog,
    AttendanceLogPopupComponent,
    AttendanceService,
    AttendanceLogFilter
  >
  implements OnInit
{
  protected override mapModelToPdfRow(model: AttendanceLog): { [key: string]: any } {
    return {
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.CREATOR_EN_PDF')]:
        model.creatorNameEn ?? 'System',
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.CREATOR_AR_PDF')]:
        model.creatorNameAr ?? 'النظام',
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.CHANNEL_NAME')]:
        model.channelName ?? (this.isCurrentLanguageEnglish() ? 'Manual' : 'يدوي'),
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.SWIPE_TIME')]: this.swipeTimeArEn(
        model.swipeTime
      ),
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.EMPLOYEE_NAME_EN_PDF')]:
        model.employeeNameEn,
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.EMPLOYEE_NAME_AR_PDF')]:
        model.employeeNameAr,
    };
  }

  protected override getPdfTitle(): { ar: string; en: string } {
    return {
      ar: 'قائمة سجل الحضور والانصراف',
      en: 'Attendance Log List',
    };
  }
  @Input() isActive: boolean = false;
  @Input() creators: BaseLookupModel[] = [];
  @Input() employees: UsersWithDepartmentLookup[] = [];
  @Input() departments: BaseLookupModel[] = [];
  filteredEmployees: UsersWithDepartmentLookup[] = [];

  languageService = inject(LanguageService);
  departmentService = inject(DepartmentService);
  userService = inject(UserService);
  attendanceService = inject(AttendanceService);
  authService = inject(AuthService);

  actionList: MenuItem[] = [];
  channels: BaseLookupModel[] = [];

  filterModel: AttendanceLogFilter = new AttendanceLogFilter();
  processingStatusOptions: BooleanOptionModel[] = PROCESSING_STATUS_OPTIONS;

  confirmationService = inject(ConfirmationService);

  override dialogSize = {
    width: '100%',
    maxWidth: '1024px',
  };
  dialogSize2 = {
    width: '100%',
    maxWidth: '600px',
  };

  override get service() {
    return this.attendanceService;
  }

  get optionLabel(): string {
    const lang = this.languageService.getCurrentLanguage();
    return lang === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }

  isCurrentLanguageEnglish() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH;
  }

  override initListComponent(): void {
    // Initialize filtered employees with all employees
    this.filteredEmployees = [...this.employees];
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Watch for changes in isActive input
    if (changes['isActive'] && changes['isActive'].currentValue === true) {
      this.filterModel = {} as AttendanceLogFilter;
      this.appliedFilterModel = {} as AttendanceLogFilter;
      this.loadDataIfNeeded();
    }

    // Watch for changes in employees input
    if (changes['employees'] && changes['employees'].currentValue) {
      this.filteredEmployees = [...this.employees];
    }
  }

  private loadDataIfNeeded(): void {
    // Load data when tab becomes active
    this.loadListSP().subscribe({
      next: (response) => this.handleLoadListSuccess(response),
      error: this.handleLoadListError,
    });
  }

  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'MENU.ATTENDANCE_LOGS' }];
  }

  override openDialog(attendanceLog?: AttendanceLog): void {
    const model = attendanceLog ?? new AttendanceLog();
    const viewMode = attendanceLog ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    this.openBaseDialogSP(AttendanceLogPopupComponent as any, model, viewMode, {
      departments: this.departments,
      employees: this.employees,
    });
  }

  // Public method to get filtered employees for template
  getFilteredEmployees(): UsersWithDepartmentLookup[] {
    return this.filteredEmployees;
  }

  private filterEmployeesByDepartment(departmentId: number | undefined) {
    if (departmentId) {
      this.filteredEmployees = this.employees.filter((emp) => emp.departmentId === departmentId);
    } else {
      // If no department is selected, show all employees
      this.filteredEmployees = [...this.employees];
    }
  }

  onDepartmentChange(deptId: number | undefined) {
    this.filterModel.departmentId = deptId ?? undefined;

    // Filter employees when department changes
    this.filterEmployeesByDepartment(deptId);

    // Clear selected employee if it doesn't belong to the new department
    if (this.filterModel.employeeId && deptId) {
      const selectedEmployee = this.employees.find((emp) => emp.id === this.filterModel.employeeId);
      if (selectedEmployee && selectedEmployee.departmentId !== deptId) {
        this.filterModel.employeeId = undefined;
      }
    }
  }

  onEmployeeChange(empId: number | undefined) {
    this.filterModel.employeeId = empId ?? undefined;
  }

  onCreatorChange(creatorId: number | undefined) {
    this.filterModel.creatorId = creatorId ?? undefined;
  }

  onChannelChange(channelName: string | undefined) {
    this.filterModel.channelName = channelName ?? undefined;
  }

  openConfirmation() {
    const dialogRef = this.confirmationService.open({
      icon: 'warning',
      messages: ['COMMON.CONFIRM_DELETE'],
      confirmText: 'COMMON.OK',
      cancelText: 'COMMON.CANCEL',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result == DIALOG_ENUM.OK) {
        // User confirmed
        this.alertService.showSuccessMessage({ messages: ['COMMON.DELETED_SUCCESSFULLY'] });
      } else {
        // User canceled
        this.alertService.showErrorMessage({ messages: ['COMMON.DELETION_FAILED'] });
      }
    });
  }

  formatSwipeTimeArEn(swipeTime: string | Date | undefined): { date: string; time: string } {
    if (!swipeTime) return { date: '', time: '' };
    const locale = this.isCurrentLanguageEnglish() ? 'en-US' : 'ar-EG';
    const { date, time } = formatSwipeTime(swipeTime.toString(), locale);
    return { date, time };
  }

  swipeTimeArEn(swipeTime: string | Date | undefined): string {
    const { date, time } = this.formatSwipeTimeArEn(swipeTime);
    return `${date} ${time}`;
  }

  getProcessingStatusClass(isProcessed: boolean): string {
    return isProcessed ? 'bg-[#ecfdf3] text-[#085d3a]' : 'bg-[#fffaeb] text-[#93370d]';
  }

  getProcessingStatusDotClass(isProcessed: boolean): string {
    return isProcessed ? 'bg-[#085d3a]' : 'bg-[#93370d]';
  }

  set swipeDateFrom(value: Date | undefined) {
    this.filterModel.swipeDateFrom = value;

    // If dateTo is before dateFrom, reset or adjust it
    if (this.filterModel.swipeDateFrom && value && this.filterModel.swipeDateFrom < value) {
      this.filterModel.swipeDateFrom = value; // or set it to value
    }
  }
  get swipeDateFrom(): Date | undefined {
    return this.filterModel.swipeDateFrom;
  }

  protected override mapModelToExcelRow(model: AttendanceLog): { [key: string]: any } {
    return {
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.EMPLOYEE_NAME_AR')]: model.employeeNameAr,
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.EMPLOYEE_NAME_EN')]: model.employeeNameEn,
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.SWIPE_TIME')]: this.swipeTimeArEn(
        model.swipeTime
      ),
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.CHANNEL_NAME')]:
        model.channelName ?? (this.isCurrentLanguageEnglish() ? 'Manual' : 'يدوي'),
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.CREATOR_EN')]:
        model.creatorNameEn ?? 'System',
      [this.translateService.instant('ATTENDANCE_LOG_PAGE.CREATOR_AR')]:
        model.creatorNameAr ?? 'النظام',
      // hidden for release 1
      // [this.translateService.instant('ATTENDANCE_LOG_PAGE.PROCESSING_STATUS')]:
      //   this.translateService.instant('ATTENDANCE_LOG_PAGE.PROCESSING'),
    };
  }

  openImportDialog() {
    const dialogRef = this.matDialog.open(ImportLogPopupComponent, {
      width: '100%',
      maxWidth: '1024px',
    });

    dialogRef.afterClosed().subscribe((result: DIALOG_ENUM) => {
      if (result && result == DIALOG_ENUM.OK) {
        this.loadDataIfNeeded();
      }
    });
  }

  openExcelImportDialog() {
    const dialogRef = this.matDialog.open(AttendanceLogExcelImportPopupComponent, {
      width: '100%',
      maxWidth: '1024px',
    });

    dialogRef.afterClosed().subscribe((result: DIALOG_ENUM) => {
      if (result && result == DIALOG_ENUM.OK) {
        this.loadDataIfNeeded();
      }
    });
  }

  getDeviceName(attendanceLog: AttendanceLog) {
    if (attendanceLog.channelName) {
      return attendanceLog.channelName;
    } else {
      return attendanceLog.isRawData
        ? ''
        : this.translateService.instant('ATTENDANCE_LOG_PAGE.MANUAL');
    }
  }
}
