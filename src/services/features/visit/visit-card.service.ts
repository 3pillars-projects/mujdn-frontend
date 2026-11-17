import { BaseCrudService } from '@/abstracts/base-crud-service';
import { SKIP_ERROR_ALERT } from '@/http-interceptors/http-error-interceptor';
import { SKIP_LOADING } from '@/http-interceptors/loading.interceptor';
import { VisitCard } from '@/models/features/visit/visit-card';
import { VisitCardAvailability } from '@/models/features/visit/visit-card-assignment';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { ResponseData } from '@/models/shared/response/response-data';
import { HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CastResponseContainer } from 'cast-response';
import { map, Observable } from 'rxjs';

/** Background checks: no global spinner and no error dialog; callers handle failures. */
const SILENT_CONTEXT = () => new HttpContext().set(SKIP_LOADING, true).set(SKIP_ERROR_ALERT, true);

@CastResponseContainer({
  $default: {
    model: () => VisitCard,
  },
  $pagination: {
    model: () => PaginatedList<VisitCard>,
    unwrap: 'data',
    shape: { 'list.*': () => VisitCard },
  },
})
@Injectable({
  providedIn: 'root',
})
export class VisitCardService extends BaseCrudService<VisitCard> {
  override serviceName: string = 'VisitCardService';

  override getUrlSegment(): string {
    return this.urlService.URLS.VISIT_CARDS;
  }

  /** Suggested friendly number for a new card (highest + 1, or the lowest free one). */
  getNextFriendlyNumber(): Observable<number> {
    return this.http
      .get<ResponseData<number>>(this.getUrlSegment() + '/next-friendly-number', {
        withCredentials: true,
        context: SILENT_CONTEXT(),
      })
      .pipe(map((response) => response.data));
  }

  /** Whether a card ID and/or friendly number is used by another card (`excludeId` = card being edited). */
  checkAvailability(params: {
    cardId?: string | null;
    friendlyNumber?: number | null;
    excludeId?: number | null;
  }): Observable<VisitCardAvailability> {
    let httpParams = new HttpParams();
    if (params.cardId) httpParams = httpParams.set('cardId', params.cardId);
    if (params.friendlyNumber != null) {
      httpParams = httpParams.set('friendlyNumber', params.friendlyNumber.toString());
    }
    if (params.excludeId != null)
      httpParams = httpParams.set('excludeId', params.excludeId.toString());

    return this.http
      .get<ResponseData<VisitCardAvailability>>(this.getUrlSegment() + '/availability', {
        params: httpParams,
        withCredentials: true,
        context: SILENT_CONTEXT(),
      })
      .pipe(map((response) => response.data));
  }
}
