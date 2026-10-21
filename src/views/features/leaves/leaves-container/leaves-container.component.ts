import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Breadcrumb } from 'primeng/breadcrumb';
import { TabsModule } from 'primeng/tabs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@/services/auth/auth.service';
import { MyLeavesComponent } from '../my-leaves/my-leaves.component';
import { OtherLeavesComponent } from '../other-leaves/other-leaves.component';

enum TabIndex {
  MY_LEAVES = 0,
  OTHER_LEAVES = 1,
}

@Component({
  selector: 'app-leaves-container',
  imports: [Breadcrumb, TabsModule, TranslatePipe, MyLeavesComponent, OtherLeavesComponent],
  templateUrl: './leaves-container.component.html',
  styleUrl: './leaves-container.component.scss',
})
export default class LeavesContainerComponent implements OnInit, OnDestroy {
  activeTabIndex: number = TabIndex.MY_LEAVES;
  breadcrumbs: MenuItem[] = [];

  private readonly authService = inject(AuthService);
  private readonly translateService = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();

  home: MenuItem = {
    label: this.translateService.instant('COMMON.HOME'),
    icon: 'pi pi-home',
    routerLink: '/home',
  };

  ngOnInit(): void {
    this.setHomeItem();
    this.initBreadcrumbs();

    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.setHomeItem();
      this.initBreadcrumbs();
    });
  }

  onTabChange(index: number | string): void {
    this.activeTabIndex = Number(index);
  }

  // Managers and HR officers decide their following employees' leaves from this tab.
  showOtherLeavesTab(): boolean {
    return !!this.authService.isDepartmentManager || !!this.authService.isHROfficer;
  }

  private setHomeItem(): void {
    this.home = {
      label: this.translateService.instant('COMMON.HOME'),
      icon: 'pi pi-home',
      routerLink: '/home',
    };
  }

  private initBreadcrumbs(): void {
    this.breadcrumbs = [{ label: this.translateService.instant('LEAVES_PAGE.LEAVES') }];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
