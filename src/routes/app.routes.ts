import { Routes } from '@angular/router';
import { authGuard } from '@/guards/auth-guard';
import { ROLES_ENUM } from '@/enums/roles-enum';
import { nationalitiesResolver } from '@/resolvers/lookups/nationalities.resolver';
import { permissionReasonResolver } from '@/resolvers/lookups/permission-reason.resolver';
import { cityResolver } from '@/resolvers/lookups/city.resolver';
import { userResolver } from '@/resolvers/user.resolver';
import { regionResolver } from '@/resolvers/lookups/region.resolver';
import { RouteIdsEnum } from '@/enums/route-ids-enum';
import { departmentResolver } from '@/resolvers/lookups/department.resolver';
import { holidayResolver } from '@/resolvers/lookups/holiday.resolver';
import { leaveTypesResolver } from '@/resolvers/lookups/leave-types.resolver';
import { myLeavesResolver } from '@/resolvers/lookups/my-leaves.resolver';
import { departmentLeavesResolver } from '@/resolvers/lookups/department-leaves.resolver';
import { permissionResolver } from '@/resolvers/lookups/permission.resolver';
import { workShiftResolver } from '@/resolvers/lookups/work-shift.resolver';
import { attendanceResolver } from '@/resolvers/features/attendance-log.resolver';
import { loginResolver } from '@/resolvers/login.resolver';
import { notificationResolver } from '@/resolvers/setting/notification.resolver';
import { userProfileResolver } from '@/resolvers/features/user-profile.resolver';
import { myShiftsContainerResolver } from '@/resolvers/lookups/my-shifts-container.resolver';
import { presenceInquiryResolver } from '@/resolvers/presence-inquiry.resolver';
import { blacklistedNationalIdResolver } from '@/resolvers/features/visit/blacklisted-national-id.resolver';
import { blacklistResolver } from '@/resolvers/features/blacklist.resolver';
import { WorkMissionResolver } from '@/resolvers/business/work-missions.resolver';
import { temporaryRoleAssignmentsResolver } from '@/resolvers/features/temporary-role-assignments.resolver';
import { visitResolver } from '@/resolvers/features/visit/visit.resolver';
import { accessLocationResolver } from '@/resolvers/business/access-location.resolver';
import { devicesConfigurationResolver } from '@/resolvers/business/devices-configuration.resolver';
import { attendanceReportResolver } from '@/resolvers/business/attendance-report.resolver';
import { employeeShiftDaysResolver } from '@/resolvers/lookups/employee-shift-days.resolver';
import { workShiftsAssignmentContainerResolver } from '@/resolvers/lookups/work-shifts-assignment-container.resolver';
import { myShiftsResolver } from '@/resolvers/lookups/my-shifts.resolver';
import { chooseSystemResolver } from '@/resolvers/choose-system.resolver';
import { generalSettingsResolver } from '@/resolvers/setting/general-settings.resolver';

export const routes: Routes = [
  // ✅ Protected routes

  // ✅ Redirect root "/" to /auth/login — public
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },

  // ✅ Optional legacy redirect
  {
    path: 'login',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },

  // ✅ Auth layout and login
  {
    path: 'auth',
    loadComponent: () => import('@/views/layout/auth/auth-layout/auth-layout.component'),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
      {
        path: 'login',
        resolve: { notUsed: loginResolver },
        loadComponent: () => import('@/views/auth/login/login.component'),
      },
      {
        path: 'choose-system',
        resolve: { notUsed: chooseSystemResolver },
        canActivate: [authGuard],
        loadComponent: () => import('@/views/auth/choose-system/choose-system.component'),
        data: { roles: [ROLES_ENUM.EMPLOYEE], routeId: RouteIdsEnum.HOME },
      },
      {
        path: 'forget-password',
        loadComponent: () => import('../views/auth/forget-password/forget-password.component'),
      },
      {
        path: 'new-password',
        loadComponent: () => import('../views/auth/new-password/new-password.component'),
      },
      {
        path: 'sent-link',
        loadComponent: () => import('../views/auth/sent-link/sent-link.component'),
      },
    ],
  },

  // ✅ Attendance system
  {
    path: 'attendance',
    canActivate: [authGuard],

    loadComponent: () => import('@/views/layout/main/main-layout/main-layout.component'),
    children: [
      {
        path: 'home',
        canActivate: [authGuard],
        loadComponent: () => import('@/views/home/home.component'),
        data: { roles: [ROLES_ENUM.EMPLOYEE], routeId: RouteIdsEnum.HOME },
      },
      {
        path: 'employees',
        resolve: { list: userResolver },
        canActivate: [authGuard],
        loadComponent: () =>
          import('@/views/features/employee/employee-list/employee-list.component'),
        data: { roles: [ROLES_ENUM.HR_OFFICER, ROLES_ENUM.ADMIN], routeId: RouteIdsEnum.EMPLOYEES },
      },
      {
        path: 'attendance-logs',
        canActivate: [authGuard],
        resolve: { list: attendanceResolver },
        data: {
          roles: [ROLES_ENUM.ADMIN],
          routeId: RouteIdsEnum.ATTENDANCE_LOGS,
        },
        loadComponent: () =>
          import(
            '@/views/features/attendance-log/attendance-log-list/attendance-log-list.component'
          ),
      },
      {
        path: 'reports-processing',
        canActivate: [authGuard],
        data: {
          roles: [ROLES_ENUM.HR_OFFICER, ROLES_ENUM.ADMIN],
          routeId: RouteIdsEnum.ATTENDANCE_REPORT_PROCESSING,
        },
        loadComponent: () =>
          import('@/views/features/reports/reports-processing/reports-processing.component'),
      },
      {
        path: 'attendance-report',
        canActivate: [authGuard],
        resolve: { list: attendanceReportResolver },
        data: {
          roles: [ROLES_ENUM.EMPLOYEE],
          routeId: RouteIdsEnum.ATTENDANCE_REPORT,
        },
        loadComponent: () =>
          import(
            '@/views/features/reports/attendance-report/attendance-report-container/attendance-report-container.component'
          ),
      },
      {
        path: 'nationalities',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.ADMIN], routeId: RouteIdsEnum.NATIONALITIES },
        resolve: { list: nationalitiesResolver },
        loadComponent: () =>
          import(
            '@/views/features/lookups/nationality/nationality-list/nationality-list.component'
          ),
      },
      {
        path: 'cities',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.ADMIN], routeId: RouteIdsEnum.CITIES },
        resolve: { list: cityResolver },
        loadComponent: () => import('@/views/features/lookups/city/city-list/city-list.component'),
      },
      {
        path: 'regions',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.ADMIN], routeId: RouteIdsEnum.REGIONS },
        resolve: { list: regionResolver },
        loadComponent: () =>
          import('@/views/features/lookups/region/region-list/region-list.component').then(
            (m) => m.RegionListComponent
          ),
      },
      {
        path: 'permission-reasons',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.ADMIN], routeId: RouteIdsEnum.PERMISSION_REASONS },
        resolve: { list: permissionReasonResolver },
        loadComponent: () =>
          import(
            '@/views/features/lookups/permission/permission-reason-list/permission-reason-list.component'
          ),
      },
      {
        path: 'general-settings',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.ADMIN], routeId: RouteIdsEnum.GENERAL_SETTINGS },
        resolve: { settings: generalSettingsResolver },
        loadComponent: () =>
          import('@/views/features/settings/notification-settings/notification-settings.component'),
      },
      {
        path: 'devices-configuration',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.ADMIN], routeId: RouteIdsEnum.DEVICES_CONFIGURATION },
        resolve: { list: devicesConfigurationResolver },
        loadComponent: () =>
          import('@/views/features/settings/devices-configuration/devices-configuration.component'),
      },
      {
        path: 'devices-location',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.ADMIN], routeId: RouteIdsEnum.ACCESS_LOCATIONS },
        resolve: { list: accessLocationResolver },
        loadComponent: () =>
          import('@/views/features/settings/devices-location/devices-location.component'),
      },
      {
        path: 'permissions',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.EMPLOYEE], routeId: RouteIdsEnum.PERMISSIONS },
        resolve: { list: permissionResolver },
        loadComponent: () =>
          import('@/views/features/permissions/permissions-list/permissions-list.component'),
      },
      {
        path: 'holidays',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.EMPLOYEE], routeId: RouteIdsEnum.HOLIDAYS },
        resolve: { list: holidayResolver },
        loadComponent: () =>
          import('@/views/features/lookups/holidays/holidays-list/holidays-list.component'),
      },
      {
        path: 'employee-holidays',
        loadComponent: () =>
          import('@/views/features/lookups/holidays/employee-holidays/employee-holidays.component'),
      },
      {
        path: 'departments',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.ADMIN], routeId: RouteIdsEnum.DEPARTMENTS },
        resolve: { list: departmentResolver },
        loadComponent: () =>
          import('@/views/features/department/department-list/department-list.component'),
      },
      {
        path: 'leaves-settings',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.ADMIN], routeId: RouteIdsEnum.LEAVES_SETTINGS },
        resolve: { list: leaveTypesResolver },
        loadComponent: () =>
          import('@/views/features/lookups/leaves-settings/leaves-settings.component'),
      },
      {
        path: 'leaves',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.EMPLOYEE], routeId: RouteIdsEnum.LEAVES },
        resolve: { list: myLeavesResolver },
        loadComponent: () =>
          import('@/views/features/leaves/leaves-container/leaves-container.component'),
      },
      {
        path: 'leaves-confirmations',
        canActivate: [authGuard],
        // HR decides any stage; department managers decide their approval level.
        data: {
          roles: [ROLES_ENUM.HR_OFFICER, ROLES_ENUM.DEPARTMENT_MANAGER],
          routeId: RouteIdsEnum.LEAVES_CONFIRMATIONS,
        },
        resolve: { list: departmentLeavesResolver },
        loadComponent: () =>
          import('@/views/features/leaves-confirmations/leaves-confirmations.component'),
      },
      {
        path: 'work-shifts',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.HR_OFFICER], routeId: RouteIdsEnum.WORK_SHIFTS },
        resolve: { list: workShiftResolver },
        loadComponent: () =>
          import(
            '@/views/features/lookups/work-shifts/work-shifts-list/work-shifts-list.component'
          ),
      },
      {
        path: 'work-shifts-assignment',
        canActivate: [authGuard],
        data: {
          roles: [ROLES_ENUM.EMPLOYEE],
          routeId: RouteIdsEnum.WORK_SHIFT_ASSIGNMENT,
        },
        resolve: { list: workShiftsAssignmentContainerResolver },
        loadComponent: () =>
          import(
            '@/views/features/lookups/work-shifts/work-shifts-assignment-container/work-shifts-assignment-container.component'
          ),
      },
      {
        path: 'shifts-view',
        canActivate: [authGuard],
        data: {
          roles: [ROLES_ENUM.EMPLOYEE],
          routeId: RouteIdsEnum.EMPLOYEE_SHIFTS,
        },
        resolve: { list: myShiftsContainerResolver },
        loadComponent: () =>
          import(
            '@/views/features/lookups/work-shifts/my-shifts-container/my-shifts-container.component'
          ),
      },
      {
        path: 'work-missions',
        canActivate: [authGuard],
        data: {
          roles: [ROLES_ENUM.EMPLOYEE],
          routeId: RouteIdsEnum.WORK_MISSION,
        },
        resolve: { list: WorkMissionResolver },
        loadComponent: () =>
          import(
            '@/views/features/outside-mission/work-mission-container/work-mission-container.component'
          ),
      },
      {
        path: 'notifications',
        data: { routeId: RouteIdsEnum.NOTIFICATIONS },
        resolve: { list: notificationResolver },
        loadComponent: () =>
          import('@/views/features/lookups/notifiactions/notifiactions.component'),
      },
      {
        path: 'temporary-role-assignments',
        canActivate: [authGuard],
        data: {
          roles: [ROLES_ENUM.DEPARTMENT_MANAGER],
          actualDepartmentManagerOnly: true,
          routeId: RouteIdsEnum.TEMPORARY_ROLE_ASSIGNMENTS,
        },
        resolve: { list: temporaryRoleAssignmentsResolver },
        loadComponent: () =>
          import(
            '@/views/features/temporary-role-assignment/temporary-role-assignment-list/temporary-role-assignment-list.component'
          ),
      },
      {
        path: 'presence-inquiries',
        data: { routeId: RouteIdsEnum.PRESENCE_INQUIRIES },
        resolve: { list: presenceInquiryResolver },
        loadComponent: () =>
          import(
            '@/views/features/presence-inquiries/presence-inquiries-list/presence-inquiries-list.component'
          ),
      },
      {
        path: 'tasks-list',
        loadComponent: () => import('@/views/features/tasks/tasks-list/tasks-list.component'),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        data: { roles: [ROLES_ENUM.EMPLOYEE] },
        resolve: { list: userProfileResolver },
        loadComponent: () => import('@/views/features/employee/profile/profile/profile.component'),
      },
    ],
  },

  // ✅ Visits system
  {
    path: 'visits',
    canActivate: [authGuard],
    data: {
      roles: [
        ROLES_ENUM.SECURITY_LEADER,
        ROLES_ENUM.DEPARTMENT_MANAGER,
        ROLES_ENUM.SECURITY_MEMBER,
      ], // all roles can view the page
      routeId: RouteIdsEnum.VISIT_REQUEST,
    },
    loadComponent: () => import('@/views/layout/main/main-layout/main-layout.component'),
    children: [
      {
        path: 'home',
        canActivate: [authGuard],
        loadComponent: () => import('@/views/home/home.component'),
        data: { roles: [ROLES_ENUM.EMPLOYEE], routeId: RouteIdsEnum.HOME },
      },
      {
        path: 'visit-request',
        canActivate: [authGuard],
        resolve: { list: visitResolver },
        data: {
          roles: [
            ROLES_ENUM.SECURITY_LEADER,
            ROLES_ENUM.DEPARTMENT_MANAGER,
            ROLES_ENUM.SECURITY_MEMBER,
          ], // all roles can view the page
          routeId: RouteIdsEnum.VISIT_REQUEST,
        },
        loadComponent: () =>
          import(
            '@/views/features/visit/visit-request/visit-request-container/visit-request-container.component'
          ),
      },
      {
        path: 'blacklist',
        canActivate: [authGuard],
        resolve: { list: blacklistResolver },
        data: {
          roles: [ROLES_ENUM.SECURITY_LEADER], // all roles can view the page
          routeId: RouteIdsEnum.BLACKLIST,
        },
        loadComponent: () =>
          import(
            '@/views/features/visit/blacklist/blacklisted-container/blacklisted-container.component'
          ),
      },
    ],
  },

  // ✅ Legacy absolute-path redirects — keep existing links (breadcrumbs, guards, header) working
  {
    path: 'home',
    redirectTo: 'attendance/home',
    pathMatch: 'full',
  },
  {
    path: 'profile',
    redirectTo: 'attendance/profile',
    pathMatch: 'full',
  },

  // 403 handler
  {
    path: '403',
    canActivate: [authGuard],
    loadComponent: () => import('@/views/shared/not-authorized/not-authorized.component'),
  },

  // 404 handler
  {
    path: '404',
    loadComponent: () => import('@/views/shared/not-found/not-found.component'),
  },
  {
    path: '**',
    redirectTo: '404',
  },
];
