import { MenuItem } from 'primeng/api';
import { Breadcrumb } from 'primeng/breadcrumb';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { AllVisitRequestListComponent } from '../all-visit-request-list/all-visit-request-list.component';
import { MyCreatedVisitRequestListComponent } from '../my-created-visit-request-list/my-created-visit-request-list.component';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { DepartmentService } from '@/services/features/lookups/department.service';
import { NationalityService } from '@/services/features/lookups/nationality.service';
import {
  VISIT_STATUS_OPTIONS,
  VisitStatusOption,
} from '@/models/features/visit/visit-status-option';
import { AuthService } from '@/services/auth/auth.service';
import { UserService } from '@/services/features/user.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { CardReaderPopupComponent } from '../card-reader-popup/card-reader-popup.component';

enum TabIndex {
  MY_VISITS = 0,
  ALL_VISITS = 1,
}

@Component({
  selector: 'app-visit-request-container',
  imports: [
    Breadcrumb,
    TabsModule,
    AllVisitRequestListComponent,
    MyCreatedVisitRequestListComponent,
    TranslatePipe,
  ],
  templateUrl: './visit-request-container.component.html',
  styleUrl: './visit-request-container.component.scss',
})
export default class VisitRequestContainerComponent implements OnInit, OnDestroy {
  items: MenuItem[] = [];
  home: MenuItem | undefined;
  departments: BaseLookupModel[] = [];
  nationalities: BaseLookupModel[] = [];
  visitStatusOptions: VisitStatusOption[] = VISIT_STATUS_OPTIONS;
  departmentService = inject(DepartmentService);
  nationalityService = inject(NationalityService);
  authService = inject(AuthService);
  userService = inject(UserService);
  matDialog = inject(MatDialog);

  private readonly translateService = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();

  activeTabIndex = TabIndex.MY_VISITS;

  // Tab initialization tracking
  private readonly tabsInitialized = new Set<TabIndex>();

  ngOnInit(): void {
    this.initializeComponent();
    this.setupLanguageChangeListener();
    this.markTabAsInitialized(TabIndex.MY_VISITS); // Mark first tab as initialized
  }

  clickMyVisitsTab(): void {
    this.switchToTab(TabIndex.MY_VISITS);
  }

  clickAllVisitsTab(): void {
    this.switchToTab(TabIndex.ALL_VISITS);
  }

  openCardReaderDialog(): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.width = '100%';
    dialogConfig.maxWidth = '520px';
    dialogConfig.ariaLabelledBy = 'card-reader-title';
    this.matDialog.open(CardReaderPopupComponent, dialogConfig);
  }

  showAllVisitsTab() {
    return this.authService.isSecurityLeader || this.authService.isSecurityMember;
  }

  private initializeComponent(): void {
    this.setHomeItem();
    this.initBreadcrumbs();
    this.loadLookups();
  }

  private loadLookups(): void {
    this.loadDepartments();
    this.loadNationalities();
  }

  private loadDepartments(): void {
    if (this.authService.isSecurityLeader || this.authService.isSecurityMember) {
      this.departmentService.getLookup().subscribe((res: BaseLookupModel[]) => {
        this.departments = res;
      });
    } else {
      this.userService.getMyDepartmentsLookup().subscribe((res: BaseLookupModel[]) => {
        this.departments = res;
      });
    }
  }

  private loadNationalities(): void {
    this.nationalityService.getLookup().subscribe((res: BaseLookupModel[]) => {
      this.nationalities = res;
    });
  }

  private setupLanguageChangeListener(): void {
    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.setHomeItem();
      this.initBreadcrumbs();
    });
  }

  private switchToTab(tabIndex: TabIndex): void {
    this.activeTabIndex = tabIndex;

    if (this.shouldLoadTabData(tabIndex)) {
      this.markTabAsInitialized(tabIndex);
    }
  }

  private shouldLoadTabData(tabIndex: TabIndex): boolean {
    // Always reload my visits tab data when switching back
    if (tabIndex === TabIndex.MY_VISITS) {
      return true;
    }

    // Only load all visits tab data if not already initialized
    return !this.tabsInitialized.has(tabIndex);
  }

  private markTabAsInitialized(tabIndex: TabIndex): void {
    this.tabsInitialized.add(tabIndex);
  }

  private setHomeItem(): void {
    this.home = {
      label: this.translateService.instant('COMMON.HOME'),
      icon: 'pi pi-home',
      routerLink: '../home',
    };
  }

  private initBreadcrumbs(): void {
    this.items = this.getBreadcrumbKeys().map((item) => ({
      label: this.translateService.instant(item.labelKey),
      icon: item.icon,
      routerLink: item.routerLink,
    }));
  }

  private getBreadcrumbKeys(): Array<{
    labelKey: string;
    icon?: string;
    routerLink?: string;
  }> {
    return [{ labelKey: 'MENU.VISIT_REQUEST' }];
  }

  // Helper methods for template
  isMyVisitsTabActive(): boolean {
    return this.activeTabIndex === TabIndex.MY_VISITS;
  }

  isAllVisitsTabActive(): boolean {
    return this.activeTabIndex === TabIndex.ALL_VISITS;
  }

  isAllVisitsTabInitialized(): boolean {
    return this.tabsInitialized.has(TabIndex.ALL_VISITS);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
