import { DepartmentPopupComponent } from '../department-popup/department-popup.component';
import { Component, inject, signal } from '@angular/core';
import { Breadcrumb } from 'primeng/breadcrumb';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { FluidModule } from 'primeng/fluid';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { DepartmentHeaderComponent } from '../department-header/department-header.component';
import { DepartmentTreeComponent } from '../department-tree/department-tree.component';
import { LanguageService } from '@/services/shared/language.service';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { DepartmentService } from '@/services/features/lookups/department.service';
import DepartmentFilter from '@/models/features/lookups/department/department-filter';
import { BaseListComponent } from '@/abstracts/base-components/base-list/base-list.component';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { ViewModeEnum } from '@/enums/view-mode-enum';
import { TranslatePipe } from '@ngx-translate/core';
import { City } from '@/models/features/lookups/city/city';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { DIALOG_ENUM } from '@/enums/dialog-enum';
import { ConfirmationService } from '@/services/shared/confirmation.service';
import { filter, of, switchMap, tap } from 'rxjs';
import { Department } from '@/models/features/lookups/department/department';
import { MatDialogConfig } from '@angular/material/dialog';
import { ImportLogPopupComponent } from '../import-log-popup/import-log-popup.component';

@Component({
  selector: 'app-department-list',
  imports: [
    Breadcrumb,
    FormsModule,
    DatePickerModule,
    FluidModule,
    TableModule,
    CommonModule,
    RouterModule,
    CommonModule,
    PaginatorModule,
    InputTextModule,
    Select,
    DepartmentHeaderComponent,
    DepartmentTreeComponent,
    TranslatePipe,
  ],
  templateUrl: './department-list.component.html',
  styleUrl: './department-list.component.scss',
})
export default class DepartmentListComponent extends BaseListComponent<
  Department,
  DepartmentPopupComponent,
  DepartmentService,
  DepartmentFilter
> {
  override dialogSize = {
    width: '100%',
    maxWidth: '800px',
  };
  private _filterModel: DepartmentFilter = new DepartmentFilter();
  private _selectedDepartment: Department | null = null;

  date2: Date | undefined;
  departmentsTree: Department[] = [];
  regions: BaseLookupModel[] = [];
  cities: City[] = [];
  usersProfiles: BaseLookupModel[] = [];
  filteredCities: City[] = [];
  childDepartments: PaginatedList<Department> = new PaginatedList<Department>();

  languageService = inject(LanguageService);
  departmentService = inject(DepartmentService);
  confirmationService = inject(ConfirmationService);
  selectedDepartmentSignal = signal<Department | null>(null);
  rootDepartment: Department | null = null;
  showTree = true;
  showDepartmentTree = true;
  initListComponent(): void {
    this.mapDataFromResolver();
    // Set the grandparent department in the signal
    this.rootDepartment =
      this.departmentsTree.find((dept: Department) => dept.fkParentDepartmentId == null) ?? null;
    this.selectedDepartmentSignal.set(this.rootDepartment);

    // Explicitly set the selectedDepartment property
    this.selectedDepartment = this.rootDepartment;
    this.initializeFilteredCities();
  }
  protected override getBreadcrumbKeys() {
    return [{ labelKey: 'DEPARTMENTS_LIST_PAGE.DEPARTMENTS_LIST' }];
  }

  private mapDataFromResolver() {
    this.departmentsTree = this.activatedRoute.snapshot.data['list'].departmentsTree.data;
    this.regions = this.activatedRoute.snapshot.data['list'].regions;
    this.cities = this.activatedRoute.snapshot.data['list'].cities;
    this.usersProfiles = this.activatedRoute.snapshot.data['list'].users;
    this.childDepartments = this.activatedRoute.snapshot.data['list'].childDepartments;
    this.paginationInfo = this.childDepartments.paginationInfo;
  }

  initializeFilteredCities(): void {
    const currentRegionId = this.filterModel.fkRegionId;
    if (currentRegionId) {
      this.filteredCities = this.cities.filter((city) => city.fkRegionId === currentRegionId);
    } else {
      this.filteredCities = [];
    }
  }

  openConfirmation(departmentId: number | undefined): void {
    if (!departmentId) return;

    // Find the department being deleted to get its parent
    const departmentToDelete = this.findDepartmentInTree(departmentId);

    this.confirmationService
      .open({
        icon: 'warning',
        messages: ['COMMON.CONFIRM_DELETE'],
        confirmText: 'COMMON.OK',
        cancelText: 'COMMON.CANCEL',
      })
      .afterClosed()
      .pipe(
        filter((result): result is typeof DIALOG_ENUM.OK => result === DIALOG_ENUM.OK),
        switchMap(() => this.departmentService.delete(departmentId)),
        switchMap(() =>
          this.alertService
            .showSuccessMessage({
              messages: ['COMMON.DELETED_SUCCESSFULLY'],
            })
            .afterClosed()
        ),
        tap(() => {
          // If we're deleting the currently selected department,
          // set the selected department to its parent
          if (this.selectedDepartment?.id === departmentId && departmentToDelete) {
            // Find the parent department in the tree
            const parentDepartment = this.findDepartmentInTree(
              departmentToDelete.fkParentDepartmentId as number
            );
            if (parentDepartment) {
              this.selectedDepartmentSignal.set(parentDepartment);
              this.selectedDepartment = parentDepartment;
            }
          }
          this.onDepartmentChange();
        })
      )
      .subscribe();
  }

  // Helper method to find a department in the tree by ID
  private findDepartmentInTree(departmentId: number | null): Department | null {
    if (!departmentId) return this.rootDepartment;

    const findRecursive = (departments: Department[]): Department | null => {
      for (const dept of departments) {
        if (dept.id === departmentId) {
          return dept;
        }
        if (dept.childDepartments && dept.childDepartments.length > 0) {
          const found = findRecursive(dept.childDepartments);
          if (found) return found;
        }
      }
      return null;
    };

    return findRecursive(this.departmentsTree);
  }

  protected override mapModelToExcelRow(model: Department): { [key: string]: any } {
    return {
      [this.translateService.instant('DEPARTMENT_POPUP.DEPARTMENT_NAME_ARABIC')]: model.nameAr,
      [this.translateService.instant('DEPARTMENT_POPUP.DEPARTMENT_NAME_ENGLISH')]: model.nameEn,
      [this.translateService.instant('DEPARTMENTS_LIST_PAGE.PERMISSION_REQUEST')]:
        model.isOneLevelApproval
          ? this.translateService.instant('DEPARTMENTS_LIST_PAGE.ONE_LEVEL_APPROVAL')
          : this.translateService.instant('DEPARTMENTS_LIST_PAGE.TWO_LEVEL_APPROVAL'),
      [this.translateService.instant('DEPARTMENTS_LIST_PAGE.MANAGER_NAME_ARABIC')]:
        model.manager?.fullNameAr,
      [this.translateService.instant('DEPARTMENTS_LIST_PAGE.MANAGER_NAME_ENGLISH')]:
        model.manager?.fullNameEn,
    };
  }

  override get filterModel(): DepartmentFilter {
    return this._filterModel;
  }

  override set filterModel(val: DepartmentFilter) {
    this._filterModel = val;
    this._filterModel.fkParentDepartmentId = this.selectedDepartment?.id;
  }

  get selectedDepartment(): Department | null {
    return this._selectedDepartment;
  }

  set selectedDepartment(val: Department | null) {
    this._selectedDepartment = val;
    this.filterModel.fkParentDepartmentId = val?.id;
  }
  onSelectedDepartmentChange(event: Department) {
    this.filterModel = new DepartmentFilter();
    this.appliedFilterModel = new DepartmentFilter();
    this.filterModel.fkParentDepartmentId = event.id;
    this.appliedFilterModel.fkParentDepartmentId = event.id;
    this.selectedDepartmentSignal.set(event);
    this.selectedDepartment = event;

    // Call and assign new child departments
    this.loadChildDepartmentsAfterSelect();
  }

  loadChildDepartmentsAfterSelect() {
    this.service.loadPaginated(this.paginationParams, { ...this.appliedFilterModel! }).subscribe({
      next: (response) => {
        this.childDepartments = response;
        this.paginationInfo = this.childDepartments.paginationInfo;
      },
      error: (_) => {
        this.childDepartments = new PaginatedList<Department>();
      },
    });
  }
  override onPageChange(event: PaginatorState): void {
    this.first = event.first!;
    this.rows = event.rows!;
    this.appliedFilterModel = { ...this.filterModel };
    this.paginationParams.pageNumber = Math.floor(this.first / this.rows) + 1;
    this.paginationParams.pageSize = this.rows;
    this.loadChildDepartmentsAfterSelect();
  }
  override get service(): DepartmentService {
    return this.departmentService;
  }

  override openDialog(department: Department) {
    const viewMode = department.id && department.id != 0 ? ViewModeEnum.EDIT : ViewModeEnum.CREATE;
    const parentDepartments$ =
      viewMode == ViewModeEnum.EDIT
        ? this.departmentService.getParentOptions(department.id!)
        : of([]);

    parentDepartments$.subscribe((parentDepartments) => {
      let dialogConfig: MatDialogConfig = new MatDialogConfig();
      let lookups = {
        cities: this.cities,
        regions: this.regions,
        usersProfiles: this.usersProfiles,
        parentDepartments,
      };
      dialogConfig.data = { model: department, lookups: lookups, viewMode: viewMode };
      dialogConfig.width = this.dialogSize.width;
      dialogConfig.maxWidth = this.dialogSize.maxWidth;
      const dialogRef = this.matDialog.open(DepartmentPopupComponent as any, dialogConfig);

      dialogRef.afterClosed().subscribe((result: { data: Department; action: DIALOG_ENUM }) => {
        if (result && result?.action == DIALOG_ENUM.OK) {
          this.onDepartmentChange();
        }
      });
    });
  }

  openImportModal() {
    const dialogRef = this.matDialog.open(ImportLogPopupComponent, {
      width: '100%',
      maxWidth: '1024px',
    });

    dialogRef.afterClosed().subscribe((result: DIALOG_ENUM) => {
      if (result && result == DIALOG_ENUM.OK) {
        this.loadChildDepartmentsAfterSelect();
        this.loadDepartmentsTree(() => {
          if (this.selectedDepartment?.id == this.rootDepartment?.id) {
            this.selectedDepartmentSignal.set(this.rootDepartment); // ✅ keep selected
          } else {
            this.selectedDepartmentSignal.set(this.selectedDepartment);
          }
        });
      }
    });
  }

  addOrEditModel(parentDepartmentId?: number, department?: Department): void {
    const departmentCopy = department ? new Department().clone(department) : new Department();
    // Only set fkParentDepartmentId if adding (not editing)
    if (!department) {
      departmentCopy.fkParentDepartmentId = parentDepartmentId;
    }
    this.openDialog(departmentCopy);
  }

  isCurrentLanguageEnglish() {
    return this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH;
  }
  onDepartmentChange(updatedDepartment?: Department) {
    if (updatedDepartment) {
      this.selectedDepartment = Object.assign({}, updatedDepartment);
    }
    this.filterModel.fkParentDepartmentId = this.selectedDepartment?.id ?? this.rootDepartment?.id;
    this.appliedFilterModel.fkParentDepartmentId =
      this.selectedDepartment?.id ?? this.rootDepartment?.id;
    this.loadChildDepartmentsAfterSelect();
    this.loadDepartmentsTree(() => {
      if (this.selectedDepartment?.id == this.rootDepartment?.id) {
        this.selectedDepartmentSignal.set(this.rootDepartment); // ✅ keep selected
      } else {
        this.selectedDepartmentSignal.set(this.selectedDepartment);
      }
    });
  }

  loadDepartmentsTree(callback?: () => void) {
    this.departmentService.getDepartmentTreeAsync().subscribe((tree) => {
      // Force change detection by creating a new array reference
      this.departmentsTree = [...tree.data];

      this.rootDepartment =
        this.departmentsTree.find((dept: Department) => dept.fkParentDepartmentId == null) ?? null;

      if (callback) callback();
    });
  }

  override search() {
    this.appliedFilterModel = { ...this.filterModel };
    this.paginationParams.pageNumber = 1;
    this.first = 0;
    this.loadChildDepartmentsAfterSelect();
  }
  override resetSearch() {
    this.filterModel = new DepartmentFilter();
    this.appliedFilterModel = {} as DepartmentFilter;
    this.paginationParams.pageNumber = 1;
    this.paginationParams.pageSize = 10;
    this.first = 0;
    this.loadChildDepartmentsAfterSelect();
  }
  getApprovalLevelText(isOneLevelVerification: boolean): string {
    return isOneLevelVerification
      ? 'DEPARTMENTS_LIST_PAGE.ONE_LEVEL_APPROVAL'
      : 'DEPARTMENTS_LIST_PAGE.TWO_LEVEL_APPROVAL';
  }

  getTranslatedDepartmentLabel(): string {
    return this.translateService.instant('MENU.DEPARTMENTS');
  }
  onTreeClosed() {
    this.showDepartmentTree = false;
  }

  getPropertyName(): string {
    return this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH
      ? 'nameEn'
      : 'nameAr';
  }
}
