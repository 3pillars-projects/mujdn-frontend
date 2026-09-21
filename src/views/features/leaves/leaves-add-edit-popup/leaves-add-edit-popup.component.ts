import { BasePopupComponent } from '@/abstracts/base-components/base-popup/base-popup.component';
import { Component, Inject, inject, OnInit, ViewChild } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { Leave } from '@/models/features/lookups/leave/leave';
import { LeaveService } from '@/services/features/lookups/leave.service';
import { AlertService } from '@/services/shared/alert.service';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { RequiredMarkerDirective } from '../../../../directives/required-marker.directive';
import { ValidationMessagesComponent } from '@/views/shared/validation-messages/validation-messages.component';
import { markFormGroupTouched } from '@/utils/general-helper';
import { LeavesRejectPopupComponent } from '../leaves-reject-popup/leaves-reject-popup.component';
import { AttachmentUploadComponent } from '@/views/shared/attachment-upload/attachment-upload.component';
import { AttachmentListComponent } from '@/views/shared/attachment-list/attachment-list.component';
import { Attachment } from '@/models/shared/attachment/attachment';

@Component({
  selector: 'app-leaves-add-edit-popup',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
    TranslatePipe,
    RequiredMarkerDirective,
    ValidationMessagesComponent,
    AttachmentUploadComponent,
    AttachmentListComponent,
  ],
  templateUrl: './leaves-add-edit-popup.component.html',
  styleUrl: './leaves-add-edit-popup.component.scss',
})
export class LeavesAddEditPopupComponent extends BasePopupComponent<Leave> implements OnInit {
  // Rendered while creating and editing; take-action mode builds its own form without it.
  @ViewChild(AttachmentUploadComponent) attachmentUpload?: AttachmentUploadComponent;
  declare model: Leave;
  declare form: FormGroup;
  alertService = inject(AlertService);
  service = inject(LeaveService);
  fb = inject(FormBuilder);
  matDialog = inject(MatDialog);
  declare viewMode: ViewModeEnum;
  isCreateMode = false;
  isEditMode = false;
  isTakeActionMode = false;
  employees: UsersWithDepartmentLookup[] = [];
  departments: BaseLookupModel[] = [];
  leaveTypes: BaseLookupModel[] = [];
  selectedDepartmentId: number | null = null;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    super();
  }

  override initPopup() {
    this.model = this.data.model;
    this.viewMode = this.data.viewMode;
    this.isCreateMode = this.viewMode == ViewModeEnum.CREATE;
    this.isEditMode = this.viewMode == ViewModeEnum.EDIT;
    this.isTakeActionMode = this.viewMode == ViewModeEnum.TAKE_ACTION;
    this.employees = this.data.lookups?.['employees'] ?? [];
    this.departments = this.data.lookups?.['departments'] ?? [];
    this.leaveTypes = this.data.lookups?.['leaveTypes'] ?? [];

    if (!this.isCreateMode) {
      // The record's related entities may fall outside the loaded lookups' scope —
      // append them so the disabled selects can still render their labels.
      if (this.model.employee && !this.employees.some((e) => e.id === this.model.fkEmployeeId)) {
        this.employees = [...this.employees, this.model.employee];
      }
      const department = this.model.employee?.department;
      if (department && !this.departments.some((d) => d.id === department.id)) {
        this.departments = [...this.departments, department];
      }
      if (this.model.leaveType && !this.leaveTypes.some((t) => t.id === this.model.fkLeaveTypeId)) {
        this.leaveTypes = [...this.leaveTypes, this.model.leaveType];
      }
      this.selectedDepartmentId = this.model.employee?.departmentId ?? null;
    }
  }

  override buildForm() {
    if (this.isTakeActionMode) {
      const datesDisabled = this.isAcceptedLeave;
      this.form = this.fb.group({
        fkEmployeeId: [{ value: this.model.fkEmployeeId, disabled: true }],
        fkLeaveTypeId: [{ value: this.model.fkLeaveTypeId, disabled: true }],
        decisionNumber: [{ value: this.model.decisionNumber, disabled: true }],
        dateFrom: [{ value: this.model.dateFrom, disabled: datesDisabled }, [Validators.required]],
        dateTo: [{ value: this.model.dateTo, disabled: datesDisabled }, [Validators.required]],
      });
    } else {
      // The control is seeded from the leave's stored attachments, so editing starts from
      // what the leave already has and stays valid while the user keeps at least one file.
      this.form = this.fb.group(this.model.buildForm());
    }
  }

  beforeSave(model: Leave, form: FormGroup) {
    // Submitting mid-upload would send the leave without the file the user just picked.
    if (this.attachmentSelectionControl?.hasError('attachmentsUploading')) {
      this.alertService.showErrorMessage({ messages: ['ATTACHMENTS.WAIT_FOR_UPLOAD'] });
      return false;
    }
    if (!form.valid) {
      return false;
    }
    if (!this.isDateRangeValid()) {
      this.alertService.showErrorMessage({ messages: ['COMMON.LEAVE_INVALID_DATE_RANGE'] });
      return false;
    }
    return true;
  }

  override prepareModel(model: Leave, form: FormGroup): Leave | Observable<Leave> {
    this.model = Object.assign(model, { ...form.value });
    return this.model;
  }

  afterSave() {
    // The leave now owns the staged files, so closing this popup must not cancel them.
    // Any attachment the user removed was deleted by the same request.
    this.attachmentUpload?.markAsConsumed();
    const successObject = { messages: ['COMMON.SAVED_SUCCESSFULLY'] };
    this.alertService.showSuccessMessage(successObject);
  }

  override saveFail(error: Error): void {
    // logic after error if there
  }

  accept(): void {
    if (!this.canAcceptLeave) {
      this.showAlreadyDecidedError();
      return;
    }
    if (!this.validateActionDates()) {
      return;
    }
    const { dateFrom, dateTo } = this.form.value;
    this.service.acceptLeave(this.model.id, dateFrom, dateTo).subscribe({
      next: () => {
        this.alertService.showSuccessMessage({ messages: ['COMMON.SAVED_SUCCESSFULLY'] });
        this.dialogRef.close(DIALOG_ENUM.OK);
      },
    });
  }

  reject(): void {
    if (!this.canRejectLeave) {
      this.showAlreadyDecidedError();
      return;
    }
    const dialogConfig: MatDialogConfig = new MatDialogConfig();
    dialogConfig.width = '100%';
    dialogConfig.maxWidth = '600px';
    const rejectDialogRef = this.matDialog.open(LeavesRejectPopupComponent, dialogConfig);

    rejectDialogRef.afterClosed().subscribe((rejectionNotes?: string) => {
      if (!rejectionNotes) {
        return;
      }
      this.service.rejectLeave(this.model.id, rejectionNotes).subscribe({
        next: () => {
          this.alertService.showSuccessMessage({ messages: ['COMMON.SAVED_SUCCESSFULLY'] });
          this.dialogRef.close(DIALOG_ENUM.OK);
        },
      });
    });
  }

  get isAcceptedLeave(): boolean {
    return this.model?.isAccepted() ?? false;
  }

  get canAcceptLeave(): boolean {
    return this.isTakeActionMode && (this.model?.isNew() ?? false);
  }

  get canRejectLeave(): boolean {
    return this.isTakeActionMode && (this.model?.isNew() || this.model?.isAccepted());
  }

  private showAlreadyDecidedError(): void {
    this.alertService.showErrorMessage({ messages: ['COMMON.LEAVE_ALREADY_DECIDED'] });
  }

  private validateActionDates(): boolean {
    const dateFromControl = this.dateFromControl;
    const dateToControl = this.dateToControl;
    if (dateFromControl?.invalid || dateToControl?.invalid) {
      markFormGroupTouched(this.form);
      return false;
    }
    if (!this.isDateRangeValid()) {
      this.alertService.showErrorMessage({ messages: ['COMMON.LEAVE_INVALID_DATE_RANGE'] });
      return false;
    }
    return true;
  }

  private isDateRangeValid(): boolean {
    const { dateFrom, dateTo } = this.form.value;
    if (!dateFrom || !dateTo) {
      return true;
    }
    return new Date(dateFrom) <= new Date(dateTo);
  }

  get filteredEmployees(): UsersWithDepartmentLookup[] {
    return this.selectedDepartmentId
      ? this.employees.filter((emp) => emp.departmentId === this.selectedDepartmentId)
      : this.employees;
  }

  onDepartmentChange(departmentId: number | null): void {
    this.selectedDepartmentId = departmentId;
    const selectedEmployeeId = this.fkEmployeeIdControl?.value;
    if (
      selectedEmployeeId &&
      !this.filteredEmployees.some((emp) => emp.id === selectedEmployeeId)
    ) {
      this.fkEmployeeIdControl?.setValue(null);
    }
  }

  get optionLabel(): string {
    return this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ARABIC ? 'nameAr' : 'nameEn';
  }

  get fkEmployeeIdControl() {
    return this.form.get('fkEmployeeId') as FormControl;
  }

  get fkLeaveTypeIdControl() {
    return this.form.get('fkLeaveTypeId') as FormControl;
  }

  get dateFromControl() {
    return this.form.get('dateFrom') as FormControl;
  }

  get dateToControl() {
    return this.form.get('dateTo') as FormControl;
  }

  get decisionNumberControl() {
    return this.form.get('decisionNumber') as FormControl;
  }

  /** Absent in take-action mode, which builds a form of its own. */
  get attachmentSelectionControl() {
    return this.form.get('attachmentSelection') as FormControl | null;
  }

  get isUploadingAttachment(): boolean {
    return !!this.attachmentSelectionControl?.hasError('attachmentsUploading');
  }

  /** Bound as a value, so it has to stay an arrow to keep `this`. */
  downloadAttachment = (attachment: Attachment): Observable<Blob> =>
    this.service.downloadAttachment(this.model.id, attachment.id);
}
