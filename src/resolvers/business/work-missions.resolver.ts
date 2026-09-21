import { UserProfileDataWithNationalId } from '@/models/features/business/user-profile-data-with-national-id';
import { WorkMission } from '@/models/features/business/work-mission';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { PaginationParams } from '@/models/shared/pagination-params';
import { ListResponseData } from '@/models/shared/response/list-response-data';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { PaginatedListResponseData } from '@/models/shared/response/paginated-list-response-data';
import { AuthService } from '@/services/auth/auth.service';
import { WorkMissionService } from '@/services/features/business/work-mission.service';
import { DepartmentService } from '@/services/features/lookups/department.service';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';

export const WorkMissionResolver: ResolveFn<
  {
    departments: BaseLookupModel[] | null;
    myMissions: PaginatedList<WorkMission> | null;
    creators: BaseLookupModel[] | null;
    isWorkMissionEnabled: boolean;
  } | null
> = () => {
  const workMissionService = inject(WorkMissionService);
  const departmentService = inject(DepartmentService);
  const authService = inject(AuthService);

  const user = authService.getUser().value;

  const canLoadDepartments = !!(authService.isDepartmentManager || authService.isHROfficer);

  // The management tab is hidden when the call fails (the global interceptor reports the error).
  const isWorkMissionEnabled$ = canLoadDepartments
    ? workMissionService.isWorkMissionEnabled().pipe(
        catchError(() => of(false)),
        shareReplay(1)
      )
    : of(false);

  return forkJoin({
    // Remove missions from resolver - will be loaded on tab change instead
    departments: isWorkMissionEnabled$.pipe(
      switchMap((isEnabled) =>
        isEnabled
          ? departmentService.getMyDepartmentsForMissionsAsync().pipe(
              map((resp: ListResponseData<BaseLookupModel>) => resp?.data ?? null),
              catchError(() => of(null))
            )
          : of(null)
      )
    ),

    myMissions: workMissionService.getMyWorkMissionsAsync(new PaginationParams(), {}).pipe(
      map((response: PaginatedListResponseData<WorkMission>) => response?.data || null),
      catchError(() => of(null))
    ),

    creators: workMissionService.getMyMissionCreatorsLookup().pipe(catchError(() => of([]))),

    isWorkMissionEnabled: isWorkMissionEnabled$,
  }).pipe(catchError(() => of(null)));
};
