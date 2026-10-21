import { LeaveType } from '@/models/features/lookups/LeaveType';
import { Injectable } from '@angular/core';
import { CastResponse, CastResponseContainer } from 'cast-response';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { LookupBaseService } from '@/abstracts/lookup-base.service';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { ListResponseData } from '@/models/shared/response/list-response-data';
import { Observable, of, switchMap } from 'rxjs';

@CastResponseContainer({
  $default: {
    model: () => LeaveType,
  },
  $pagination: {
    model: () => PaginatedList<LeaveType>,
    unwrap: 'data',
    shape: { 'list.*': () => LeaveType },
  },
})
@Injectable({
  providedIn: 'root',
})
export class LeaveTypeService extends LookupBaseService<LeaveType, number> {
  serviceName: string = 'LeaveTypeService';

  override getUrlSegment(): string {
    return this.urlService.URLS.LEAVE_TYPES;
  }

  // getLookup() returns active types only (for filing a new leave). This one includes
  // deactivated types too, so list filters can still find leaves filed under them.
  @CastResponse(undefined, { fallback: '$lookup' })
  getAllLookup(): Observable<BaseLookupModel[]> {
    return this.http
      .get<ListResponseData<BaseLookupModel>>(this.getUrlSegment() + '/lookup/all', {
        withCredentials: true,
      })
      .pipe(switchMap((response: ListResponseData<BaseLookupModel>) => of(response.data)));
  }
}
