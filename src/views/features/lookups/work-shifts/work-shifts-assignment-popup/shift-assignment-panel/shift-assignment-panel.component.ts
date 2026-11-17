import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelect, MultiSelectSelectAllChangeEvent } from 'primeng/multiselect';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { UsersWithDepartmentLookup } from '@/models/auth/users-department-lookup';
import { DepartmentEmployees } from '@/models/features/lookups/work-shifts/department-employees';
import Shift from '@/models/features/lookups/work-shifts/shift';
import { LanguageService } from '@/services/shared/language.service';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import EmployeeShift from '@/models/features/lookups/work-shifts/employee-shift';
import { formatTimeTo12Hour } from '@/utils/general-helper';
import { getLocalizedName } from '@/utils/localized-name';
import { LocalizedNamePipe } from '@/pipes/localized-name.pipe';
import { WithNameFallbackPipe } from '@/pipes/with-name-fallback.pipe';

@Component({
  selector: 'app-shift-assignment-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelect,
    Accordion,
    AccordionPanel,
    AccordionHeader,
    AccordionContent,
    TranslatePipe,
    LocalizedNamePipe,
    WithNameFallbackPipe,
  ],
  templateUrl: './shift-assignment-panel.component.html',
  styleUrl: './shift-assignment-panel.component.scss',
})
export class ShiftAssignmentPanelComponent implements OnInit {
  @Input() shift?: Shift;
  @Input() shiftTimeRange?: string;
  @Input() showInfoBox: boolean = false;
  @Input() departments: BaseLookupModel[] = [];
  @Input() allEmployees: UsersWithDepartmentLookup[] = [];
  @Input() initialMemberIds: number[] = [];
  @Input() optionLabel: string = 'nameAr';
  @Input() occupiedMemberIds: number[] = [];
  @Input() initialDeptIds: number[] = [];
  @Input() sortedNames?: string;
  @Input() viewMode: boolean = false;

  @Output() memberIdsChange = new EventEmitter<number[]>();
  @Output() deptIdsChange = new EventEmitter<number[]>();

  selectedDeptIds: number[] = [];
  selectedMemberIds: number[] = [];
  filteredEmployees: UsersWithDepartmentLookup[] = [];
  departmentGroups: DepartmentEmployees[] = [];

  languageService = inject(LanguageService);

  // Tracks previous dept state independently of [(ngModel)] — ngModel updates
  // the bound property before (onChange) fires, making "previous" detection unreliable.
  private previousDeptIds: number[] = [];

  ngOnInit(): void {
    this.initialize();
  }

  private initialize(): void {
    this.selectedMemberIds = [...this.initialMemberIds];

    // Prefer explicitly persisted dept selection; fall back to deriving from member depts
    if (this.initialDeptIds.length > 0) {
      this.selectedDeptIds = [...this.initialDeptIds];
    } else {
      const deptIds = new Set<number>();
      this.selectedMemberIds.forEach((id) => {
        const emp = this.allEmployees.find((e) => e.id === id);
        if (emp?.departmentId) deptIds.add(emp.departmentId);
      });
      this.selectedDeptIds = Array.from(deptIds);
    }

    this.previousDeptIds = [...this.selectedDeptIds];
    this.filteredEmployees =
      this.selectedDeptIds.length > 0
        ? this.allEmployees.filter((e) => this.selectedDeptIds.includes(e.departmentId!))
        : [];

    this.updateDepartmentGroups();
  }

  onDepartmentChange(selectedIds: number[]): void {
    // Use previousDeptIds — NOT selectedDeptIds — because [(ngModel)] already
    // mutated selectedDeptIds before this handler runs.
    const deselected = this.previousDeptIds.filter((id) => !selectedIds.includes(id));

    if (deselected.length > 0 && selectedIds.length > 0) {
      const toRemove = this.allEmployees
        .filter((e) => deselected.includes(e.departmentId!))
        .map((e) => e.id!);
      this.selectedMemberIds = this.selectedMemberIds.filter((id) => !toRemove.includes(id));
    }

    this.previousDeptIds = [...selectedIds];
    this.selectedDeptIds = selectedIds;
    this.filteredEmployees =
      selectedIds.length > 0
        ? this.allEmployees.filter((e) => selectedIds.includes(e.departmentId!))
        : [];

    this.updateDepartmentGroups();
    this.deptIdsChange.emit([...this.selectedDeptIds]);
  }

  onDepartmentSelectAll(event: MultiSelectSelectAllChangeEvent): void {
    const allIds = event.checked ? this.departments.map((d) => d.id!) : [];
    this.onDepartmentChange(allIds);
    this.selectedDeptIds = [...allIds];
  }

  onEmployeeChange(selectedIds: number[]): void {
    this.selectedMemberIds = selectedIds;
    this.updateDepartmentGroups();
    this.memberIdsChange.emit([...this.selectedMemberIds]);
  }

  removeEmployee(userId: number): void {
    this.selectedMemberIds = this.selectedMemberIds.filter((id) => id !== userId);
    this.updateDepartmentGroups();
    this.memberIdsChange.emit([...this.selectedMemberIds]);
  }

  removeAllFromDepartment(deptId: number): void {
    const toRemove = this.allEmployees.filter((e) => e.departmentId === deptId).map((e) => e.id!);
    this.selectedMemberIds = this.selectedMemberIds.filter((id) => !toRemove.includes(id));
    this.selectedDeptIds = this.selectedDeptIds.filter((id) => id !== deptId);
    this.previousDeptIds = [...this.selectedDeptIds];
    this.filteredEmployees = this.filteredEmployees.filter((e) => e.departmentId !== deptId);
    this.updateDepartmentGroups();
    this.memberIdsChange.emit([...this.selectedMemberIds]);
    this.deptIdsChange.emit([...this.selectedDeptIds]);
  }

  get selectedDeptLabel(): string {
    const count = this.selectedDeptIds.length;
    if (count === 0) return '';
    return this.optionLabel === 'nameAr'
      ? `${count} قسم محدد`
      : `${count} department${count > 1 ? 's' : ''} selected`;
  }

  get filteredEmployeesWithDisabled() {
    return this.filteredEmployees.map(emp => ({
      ...emp,
      disabled: this.occupiedMemberIds.includes(emp.id!),
    }));
  }

  get selectedEmpLabel(): string {
    const count = this.selectedMemberIds.length;
    if (count === 0) return '';
    return this.optionLabel === 'nameAr'
      ? `${count} موظف محدد`
      : `${count} employee${count > 1 ? 's' : ''} selected`;
  }

  private updateDepartmentGroups(): void {
    const groupsMap = new Map<number, DepartmentEmployees>();
    const selectedUsers = this.allEmployees.filter((e) => this.selectedMemberIds.includes(e.id!));

    selectedUsers.forEach((user) => {
      const deptId = user.departmentId;
      if (!deptId) return;
      const dept = this.departments.find((d) => d.id === deptId);
      if (!dept) return;
      if (!groupsMap.has(deptId)) groupsMap.set(deptId, { department: dept, employees: [] });
      groupsMap.get(deptId)!.employees.push(user);
    });

    this.departmentGroups = Array.from(groupsMap.values());
  }

  getShiftName() {
    return getLocalizedName(this.shift, this.languageService.getCurrentLanguage());
  }

  getShiftDuration() {
      const locale = this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH ? 'en-US' : 'ar-EG';
      let timeFrom = formatTimeTo12Hour(this.shift?.timeFrom || '', locale);
      let timeTo = formatTimeTo12Hour(this.shift?.timeTo || '', locale);

      return `${timeFrom} - ${timeTo}`;
  }
}
