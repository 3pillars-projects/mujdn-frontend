import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { AuthService } from '@/services/auth/auth.service';
import { RouteIdsEnum } from '@/enums/route-ids-enum';
import { MenuItem } from '@/models/shared/menu-item';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';
import { SystemTypeEnum } from '@/enums/system-type-enum';

type MenuItemConfig = Omit<MenuItem, 'label' | 'children'> & {
  labelKey: string;
  children?: MenuItemConfig[];
};

@Injectable({
  providedIn: 'root',
})
export class SideBarLinksService {
  translateService = inject(TranslateService);
  router = inject(Router);
  authService = inject(AuthService);
  route = inject(ActivatedRoute);

  private rawMenuConfig: MenuItemConfig[] = [
    // hidden for release 1
    // {
    //   labelKey: 'MENU.DASHBOARD',
    //   iconUrl: 'assets/icons/menu-icons/home.svg',
    //   routerLink: ['/dashboard'],
    // },
    {
      labelKey: 'MENU.ATTENDANCE_REPORT',
      iconUrl: 'assets/icons/menu-icons/icon-stroke-rounded.svg',
      routerLink: ['/attendance/attendance-report'],
      routeId: RouteIdsEnum.ATTENDANCE_REPORT,
      system: SystemTypeEnum.ATTENDANCE,
    },
    {
      labelKey: 'MENU.ATTENDANCE_REPORT_PROCESSING',
      iconUrl: 'assets/icons/menu-icons/icon-stroke-rounded.svg',
      routerLink: ['/attendance/reports-processing'],
      routeId: RouteIdsEnum.ATTENDANCE_REPORT_PROCESSING,
      system: SystemTypeEnum.ATTENDANCE,
    },
    {
      labelKey: 'MENU.ATTENDANCE_LOGS',
      iconUrl: 'assets/icons/menu-icons/icon.svg',
      routerLink: ['/attendance/attendance-logs'],
      routeId: RouteIdsEnum.ATTENDANCE_LOGS,
      system: SystemTypeEnum.ATTENDANCE,
    },
    {
      labelKey: 'MENU.DEPARTMENTS',
      iconUrl: 'assets/icons/menu-icons/tools.svg',
      routerLink: ['/attendance/departments'],
      routeId: RouteIdsEnum.DEPARTMENTS,
      system: SystemTypeEnum.ATTENDANCE,
    },
    {
      labelKey: 'MENU.EMPLOYEES',
      iconUrl: 'assets/icons/menu-icons/employees.svg',
      routerLink: ['/attendance/employees'],
      routeId: RouteIdsEnum.EMPLOYEES,
      system: SystemTypeEnum.ATTENDANCE,
    },
    // {
    //   labelKey: 'MENU.PRESENCE_INQUIRIES',
    //   iconUrl: 'assets/icons/menu-icons/icon2.svg',
    //   routerLink: ['/dashboard'],
    // },
    {
      labelKey: 'MENU.PERMISSIONS',
      iconUrl: 'assets/icons/menu-icons/permissions.svg',
      routerLink: ['/attendance/permissions'],
      routeId: RouteIdsEnum.PERMISSIONS,
      system: SystemTypeEnum.ATTENDANCE,
    },
    {
      labelKey: 'MENU.PRESENCE_INQUIRIES',
      iconUrl: 'assets/icons/menu-icons/tools.svg',
      routerLink: ['/attendance/presence-inquiries'],
      routeId: RouteIdsEnum.PRESENCE_INQUIRIES,
      system: SystemTypeEnum.ATTENDANCE,
    },
    // {
    //   labelKey: 'MENU.ASSIGNED_EMPLOYEES',
    //   iconUrl: 'assets/icons/menu-icons/icon3.svg',
    //   routerLink: ['/dashboard'],
    // },
    // {
    //   labelKey: 'MENU.WORK_SHIFT_TEMP',
    //   iconUrl: 'assets/icons/menu-icons/sifts-add-icon.svg',
    //   routerLink: ['/dashboard'],
    //   routeId: RouteIdsEnum.WORK_SHIFT_TEMP,
    // },
    // {
    //   labelKey: 'MENU.WORK_SHIFT_ASSIGNMENT',
    //   iconUrl: 'assets/icons/menu-icons/sifts-add-icon.svg',
    //   routerLink: ['/dashboard'],
    //   routeId: RouteIdsEnum.WORK_SHIFT_ASSIGNMENT,
    // },
    {
      labelKey: 'MENU.HOLIDAYS',
      iconUrl: 'assets/icons/menu-icons/vacations.svg',
      routerLink: ['/attendance/holidays'],
      routeId: RouteIdsEnum.HOLIDAYS,
      system: SystemTypeEnum.ATTENDANCE,
    },
    {
      labelKey: 'MENU.LEAVES_REQUESTS',
      iconUrl: 'assets/icons/menu-icons/vacations.svg',
      routerLink: ['/attendance/leaves'],
      routeId: RouteIdsEnum.LEAVES,
      system: SystemTypeEnum.ATTENDANCE,
    },
    {
      labelKey: 'MENU.VISITS',
      iconUrl: 'assets/icons/menu-icons/visits.svg',
      system: SystemTypeEnum.VISITS,
      children: [
        {
          labelKey: 'MENU.VISIT_REQUEST',
          routerLink: ['/visits/visit-request'],
          routeId: RouteIdsEnum.VISIT_REQUEST,
          system: SystemTypeEnum.VISITS,
        },
        {
          labelKey: 'MENU.BLACKLIST',
          routerLink: ['/visits/blacklist'],
          routeId: RouteIdsEnum.BLACKLIST,
          system: SystemTypeEnum.VISITS,
        },
      ],
    },
    {
      labelKey: 'MENU.WORK_MISSIONS',
      iconUrl: 'assets/icons/menu-icons/permissions.svg',
      routerLink: ['/attendance/work-missions'],
      routeId: RouteIdsEnum.WORK_MISSION,
      system: SystemTypeEnum.ATTENDANCE,
    },
    {
      labelKey: 'MENU.TEMPORARY_ROLE_ASSIGNMENTS',
      iconUrl: 'assets/icons/menu-icons/tools.svg',
      routerLink: ['/attendance/temporary-role-assignments'],
      routeId: RouteIdsEnum.TEMPORARY_ROLE_ASSIGNMENTS,
      system: SystemTypeEnum.ATTENDANCE,
    },
    {
      labelKey: 'MENU.WORK_SHIFT',
      iconUrl: 'assets/icons/time-icon.svg',
      system: SystemTypeEnum.ATTENDANCE,
      children: [
        {
          labelKey: 'MENU.WORK_SHIFT_SETTINGS',
          routerLink: ['/attendance/work-shifts'],
          routeId: RouteIdsEnum.WORK_SHIFTS,
          system: SystemTypeEnum.ATTENDANCE,
        },
        {
          labelKey: 'MENU.WORK_SHIFT_ASSIGNMENT',
          routerLink: ['/attendance/work-shifts-assignment'],
          routeId: RouteIdsEnum.WORK_SHIFT_ASSIGNMENT,
          system: SystemTypeEnum.ATTENDANCE,
        },
        {
          labelKey: 'MENU.EMPLOYEE_SHIFTS',
          routerLink: ['/attendance/shifts-view'],
          routeId: RouteIdsEnum.EMPLOYEE_SHIFTS,
          system: SystemTypeEnum.ATTENDANCE,
        },
      ],
    },
    {
      labelKey: 'MENU.SETTINGS',
      iconUrl: 'assets/icons/menu-icons/settings.svg',
      system: SystemTypeEnum.ATTENDANCE,
      children: [
        {
          labelKey: 'MENU.PERMISSIONS_SETTINGS',
          routerLink: ['/attendance/permission-reasons'],
          routeId: RouteIdsEnum.PERMISSION_REASONS,
          system: SystemTypeEnum.ATTENDANCE,
        },
        {
          labelKey: 'MENU.LEAVES_SETTINGS',
          routerLink: ['/attendance/leaves-settings'],
          routeId: RouteIdsEnum.LEAVES_SETTINGS,
          system: SystemTypeEnum.ATTENDANCE,
        },
        {
          labelKey: 'MENU.NOTIFICATIONS',
          routerLink: ['/attendance/notifications'],
          routeId: RouteIdsEnum.NOTIFICATIONS,
          system: SystemTypeEnum.ATTENDANCE,
        },
        {
          labelKey: 'MENU.GENERAL_SETTINGS',
          routerLink: ['/attendance/general-settings'],
          routeId: RouteIdsEnum.GENERAL_SETTINGS,
          system: SystemTypeEnum.ATTENDANCE,
        },
        {
          labelKey: 'MENU.NATIONALITIES',
          routerLink: ['/attendance/nationalities'],
          routeId: RouteIdsEnum.NATIONALITIES,
          system: SystemTypeEnum.ATTENDANCE,
        },
        {
          labelKey: 'MENU.CITIES',
          routerLink: ['/attendance/cities'],
          routeId: RouteIdsEnum.CITIES,
          system: SystemTypeEnum.ATTENDANCE,
        },
        {
          labelKey: 'MENU.REGIONS',
          routerLink: ['/attendance/regions'],
          routeId: RouteIdsEnum.REGIONS,
          system: SystemTypeEnum.ATTENDANCE,
        },
        {
          labelKey: 'MENU.ACCESS_LOCATIONS',
          routerLink: ['/attendance/devices-location'],
          routeId: RouteIdsEnum.ACCESS_LOCATIONS,
          system: SystemTypeEnum.ATTENDANCE,
        },
        {
          labelKey: 'MENU.DEVICES_CONFIGURATION',
          routerLink: ['/attendance/devices-configuration'],
          routeId: RouteIdsEnum.DEVICES_CONFIGURATION,
          system: SystemTypeEnum.ATTENDANCE,
        },
      ],
    },
  ];

  getSidebarLinks(): Observable<MenuItem[]> {
    const userRoles = this.authService.getUser().value?.roles;
    const allRoutes = this.flattenRouterConfig(this.router.config);
    const labelKeys = this.extractLabelKeys(this.rawMenuConfig);

    return this.translateService.get(labelKeys).pipe(
      map((translations) => {
        const translatedMenuItems = this.buildMenuItemsWithTranslations(
          this.rawMenuConfig,
          translations
        );
        return this.filterMenuItems(translatedMenuItems, allRoutes, userRoles);
      })
    );
  }

  private flattenRouterConfig(routes: Route[]): Route[] {
    let flatRoutes: Route[] = [];

    for (const route of routes) {
      flatRoutes.push(route);
      if (route.children) {
        flatRoutes = flatRoutes.concat(this.flattenRouterConfig(route.children));
      }
    }

    return flatRoutes;
  }

  private extractLabelKeys(items: MenuItemConfig[] = []): string[] {
    const keys: string[] = [];

    for (const item of items) {
      keys.push(item.labelKey);
      if (item.children) {
        keys.push(...this.extractLabelKeys(item.children));
      }
    }

    return keys;
  }

  private buildMenuItemsWithTranslations(
    items: MenuItemConfig[],
    translations: Record<string, string>
  ): MenuItem[] {
    return items.map((item): MenuItem => {
      const menuItem: MenuItem = {
        label: translations[item.labelKey] || item.labelKey,
        routeId: item.routeId,
        routerLink: item.routerLink,
        iconUrl: item.iconUrl,
        system: item.system,
      };

      if (item.children) {
        menuItem.children = this.buildMenuItemsWithTranslations(item.children, translations);
      }

      return menuItem;
    });
  }

  private filterMenuItems(
    menuItems: MenuItem[],
    allRoutes: Route[],
    userRoles?: string[]
  ): MenuItem[] {
    const filtered: MenuItem[] = [];

    for (const item of menuItems) {
      if (item.routeId && !item.children) {
        const matchedRoute = allRoutes.find((r) => r.data?.['routeId'] === item.routeId);
        const allowedRoles = matchedRoute?.data?.['roles'] as string[] | undefined;
        const actualDepartmentManagerOnly =
          matchedRoute?.data?.['actualDepartmentManagerOnly'] === true;
        const hasRoleAccess =
          !allowedRoles || allowedRoles.some((role) => userRoles?.includes(role));
        const hasRouteAccess = this.authService.hasRouteAccess({ actualDepartmentManagerOnly });
        const isBelongToSystem = this.isBelongToActiveSystem(item);
        const isAllowed = hasRoleAccess && hasRouteAccess && isBelongToSystem;

        if (isAllowed) {
          filtered.push(item);
        }
      } else if (!item.routeId && !item.children) {
        filtered.push(item); // public
      }

      if (item.children) {
        const allowedChildren = this.filterMenuItems(item.children, allRoutes, userRoles);
        if (allowedChildren.length > 0) {
          filtered.push({ ...item, children: allowedChildren });
        }
      }
    }
    return filtered;
  }

  isBelongToActiveSystem(menuItem: MenuItem) {
    const firstSegment = this.router.url.split('?')[0].split('/')[1];
    return (
      (menuItem.system == SystemTypeEnum.ATTENDANCE &&
        firstSegment == SystemTypeEnum.ATTENDANCE.toLowerCase()) ||
      (menuItem.system == SystemTypeEnum.VISITS &&
        firstSegment == SystemTypeEnum.VISITS.toLowerCase())
    );
  }
}
