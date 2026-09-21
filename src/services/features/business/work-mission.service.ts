import { LookupBaseService } from '@/abstracts/lookup-base.service';
import { OptionsContract } from '@/contracts/options-contract';
import { MissionEmployeesAssignement } from '@/models/features/business/mission-employees-assignment';
import { UserProfileDataWithNationalId } from '@/models/features/business/user-profile-data-with-national-id';
import { WorkMission } from '@/models/features/business/work-mission';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { Department } from '@/models/features/lookups/department/department';
import { PaginationParams } from '@/models/shared/pagination-params';
import { ListResponseData } from '@/models/shared/response/list-response-data';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { PaginatedListResponseData } from '@/models/shared/response/paginated-list-response-data';
import { toDateOnly } from '@/utils/general-helper';
import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AttachmentService } from '@/services/shared/attachment.service';
import { CastResponse, CastResponseContainer } from 'cast-response';
import { map, Observable } from 'rxjs';
import { LANGUAGE_ENUM } from '@/enums/language-enum';

@Injectable({
  providedIn: 'root',
})
@CastResponseContainer({
  $default: {
    model: () => WorkMission,
  },
  $pagination: {
    model: () => PaginatedList<Department>,
    unwrap: 'data',
    shape: { 'list.*': () => WorkMission },
  },
  $lookup: {
    model: () => PaginatedList<UserProfileDataWithNationalId>,
    unwrap: 'data',
    shape: { 'list.*': () => UserProfileDataWithNationalId },
  },
})
export class WorkMissionService extends LookupBaseService<WorkMission, number> {
  override serviceName: string = 'WorkMissionService';
  private attachmentService = inject(AttachmentService);

  override getUrlSegment(): string {
    return this.urlService.URLS.WORK_MISSION;
  }

  /**
   * Streams a stored attachment's bytes. A caller without visibility into the mission gets a
   * 404 rather than a 403 — that is "not accessible", not "missing", and is not worth a retry.
   */
  downloadAttachment(workMissionId: number, attachmentId: number): Observable<Blob> {
    return this.attachmentService.downloadContent(
      `${this.getUrlSegment()}/${workMissionId}/attachments/${attachmentId}/content`
    );
  }

  @CastResponse(undefined, { fallback: '$lookup' })
  getEmployeesToBeAssigned(
    paginationParams?: PaginationParams,
    filterOptions?: OptionsContract,
    missionId?: number
  ): Observable<PaginatedListResponseData<UserProfileDataWithNationalId>> {
    // Build HttpParams safely
    let httpParams = new HttpParams();
    if (paginationParams) {
      Object.entries(paginationParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    // Add missionId if provided
    if (missionId) {
      httpParams = httpParams.set('missionId', String(missionId));
    }

    // Make the request and rely on @CastResponse for runtime mapping
    return this.http.post(
      this.getUrlSegment() + '/' + 'GetEmployeesToBeAssigned',
      filterOptions || {},
      {
        params: httpParams,
        withCredentials: true,
      }
    ) as unknown as Observable<PaginatedListResponseData<UserProfileDataWithNationalId>>;
  }

  addUsersToMission(
    model: MissionEmployeesAssignement
  ): Observable<{ conflictingUserIds?: number[] }> {
    return this.http
      .post<{
        data: { conflictingUserIds?: number[] };
        error: null;
      }>(this.getUrlSegment() + '/' + 'AddUsersToMission', model, { withCredentials: true })
      .pipe(map((res) => res.data ?? {}));
  }

  /**
   * Whether the current user's department (and every ancestor) allows the work-missions
   * management module. UI visibility only; the mission endpoints do not enforce it.
   */
  isWorkMissionEnabled(): Observable<boolean> {
    return this.http
      .get<{
        data: boolean;
        error: null;
      }>(this.getUrlSegment() + '/is-enabled', { withCredentials: true })
      .pipe(map((res) => res.data === true));
  }

  @CastResponse(undefined, { fallback: '$pagination' })
  getMyWorkMissionsAsync(
    paginationParams?: PaginationParams,
    filterOptions?: OptionsContract
  ): Observable<PaginatedListResponseData<WorkMission>> {
    let httpParams = new HttpParams();

    // Handle pagination
    if (paginationParams) {
      Object.entries(paginationParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    // Clone filterOptions so we don't mutate the original object
    const processedFilterOptions: OptionsContract = { ...(filterOptions || {}) };

    // Convert dates if present
    if (processedFilterOptions['startDate']) {
      processedFilterOptions['startDate'] = toDateOnly(
        processedFilterOptions['startDate'] as string
      );
    }
    if (processedFilterOptions['endDate']) {
      processedFilterOptions['endDate'] = toDateOnly(processedFilterOptions['endDate'] as string);
    }

    // Call API
    return this.http.post(
      this.getUrlSegment() + '/GetMyWorkMissionsAsync',
      processedFilterOptions,
      {
        params: httpParams,
        withCredentials: true,
      }
    ) as unknown as Observable<PaginatedListResponseData<WorkMission>>;
  }

  getMyMissionCreatorsLookup(): Observable<BaseLookupModel[]> {
    return this.http
      .get<ListResponseData<BaseLookupModel>>(
        this.getUrlSegment() + '/my-mission-creators-lookup',
        { withCredentials: true }
      )
      .pipe(map((response) => response.data ?? []));
  }

  exportMyWorkMissionsPdf(
    language: LANGUAGE_ENUM | string,
    filterOptions?: OptionsContract
  ): Observable<Blob> {
    const processedFilterOptions: OptionsContract = { ...(filterOptions || {}) };

    if (processedFilterOptions['startDate']) {
      processedFilterOptions['startDate'] = toDateOnly(
        processedFilterOptions['startDate'] as string
      );
    }
    if (processedFilterOptions['endDate']) {
      processedFilterOptions['endDate'] = toDateOnly(processedFilterOptions['endDate'] as string);
    }

    return this.exportPdfByEndpoint('ExportMyMissionsPdf', language, processedFilterOptions);
  }

  exportMissionPdf(
    language: LANGUAGE_ENUM | string,
    filterOptions?: OptionsContract
  ): Observable<Blob> {
    return this.exportPdfByEndpoint('ExportMissionPdf', language, filterOptions);
  }
}
