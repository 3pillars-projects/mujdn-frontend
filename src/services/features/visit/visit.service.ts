import { BaseCrudService } from '@/abstracts/base-crud-service';
import { MyCreatedVisitFilter } from '@/models/features/visit/my-created-visit-filter';
import { Visit } from '@/models/features/visit/visit';
import { PaginationParams } from '@/models/shared/pagination-params';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { PaginatedListResponseData } from '@/models/shared/response/paginated-list-response-data';
import { genericDateOnlyConvertor } from '@/utils/general-helper';
import { Injectable } from '@angular/core';
import { CastResponse, CastResponseContainer } from 'cast-response';
import { map, Observable } from 'rxjs';
import { HttpContext, HttpParams } from '@angular/common/http';
import { ResponseData } from '@/models/shared/response/response-data';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { OptionsContract } from '@/contracts/options-contract';
import { SKIP_ERROR_ALERT } from '@/http-interceptors/http-error-interceptor';
import { SKIP_LOADING } from '@/http-interceptors/loading.interceptor';
import {
  AssignedVisitCard,
  LinkVisitCardRequest,
  VisitCardLookup,
} from '@/models/features/visit/visit-card-assignment';

@CastResponseContainer({
  $default: {
    model: () => Visit,
  },
  $pagination: {
    model: () => PaginatedList<Visit>,
    unwrap: 'data',
    shape: { 'list.*': () => Visit },
  },
  $visitor: {
    model: () => Visit,
    unwrap: 'data',
  },
  $action: {
    model: () => String,
    unwrap: 'data',
  },
  $isVisitorExists: {
    model: () => Boolean,
    unwrap: 'data',
  },
})
@Injectable({
  providedIn: 'root',
})
export class VisitService extends BaseCrudService<Visit> {
  override serviceName: string = 'VisitService';
  override getUrlSegment(): string {
    return this.urlService.URLS.VISITS;
  }

  @CastResponse(undefined, { fallback: '$visitor' })
  loadVisitorByNationalId(nationalId: string): Observable<Visit> {
    return this.http
      .get<ResponseData<Visit>>(this.getUrlSegment() + '/visitor', {
        params: {
          nationalId,
        },
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          return response.data;
        })
      );
  }
  @CastResponse(undefined, { fallback: '$isVisitorExists' })
  isVisitorExists(nationalId: string): Observable<boolean> {
    return this.http
      .get<ResponseData<boolean>>(this.getUrlSegment() + '/is-visitor-exists', {
        params: {
          nationalId,
        },
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          return response.data;
        })
      );
  }

  @CastResponse(undefined, { fallback: '$pagination' })
  loadMyCreatedVisitsPaginated(
    paginationParams?: PaginationParams,
    filterOptions?: MyCreatedVisitFilter
  ): Observable<PaginatedList<Visit>> {
    const httpParams = new HttpParams({
      fromObject: paginationParams as unknown as never,
    });
    filterOptions = genericDateOnlyConvertor(filterOptions);
    return this.http
      .post<PaginatedListResponseData<Visit>>(
        this.getUrlSegment() + '/GetMyCreatedVisitsWithPaging',
        filterOptions || {},
        {
          params: httpParams, // <-- query string
          withCredentials: true,
        }
      )
      .pipe(
        map((response) => {
          return {
            list: response.data.list as Visit[],
            paginationInfo: response.data.paginationInfo,
          };
        })
      );
  }

  @CastResponse(undefined, { fallback: '$action' })
  approveVisit(visitLogId: number): Observable<string> {
    return this.http
      .post<
        ResponseData<string>
      >(this.getUrlSegment() + '/approve-visit?visitLogId=' + visitLogId, {}, { withCredentials: true })
      .pipe(
        map((response: ResponseData<string>) => {
          return response.data;
        })
      );
  }
  @CastResponse(undefined, { fallback: '$action' })
  rejectVisit(visitLogId: number): Observable<string> {
    return this.http
      .post<
        ResponseData<string>
      >(this.getUrlSegment() + '/reject-visit?visitLogId=' + visitLogId, {}, { withCredentials: true })
      .pipe(
        map((response: ResponseData<string>) => {
          return response.data;
        })
      );
  }

  /**
   * Gate: finds a card by friendly number and the visit that currently holds it.
   * Silent (no spinner, no error dialog): the caller shows not-found and failure inline.
   */
  lookupCardByFriendlyNumber(friendlyNumber: number): Observable<VisitCardLookup> {
    return this.http
      .get<ResponseData<VisitCardLookup>>(
        `${this.getUrlSegment()}/cards/by-friendly-number/${friendlyNumber}`,
        {
          withCredentials: true,
          context: new HttpContext().set(SKIP_LOADING, true).set(SKIP_ERROR_ALERT, true),
        }
      )
      .pipe(map((response) => response.data));
  }

  /**
   * Gate: links a card to an approved visit. No global error dialog: the caller handles
   * VISIT_CARD_ASSIGNED_TO_ANOTHER_VISIT (offer a move) and shows other errors itself.
   */
  linkCard(visitLogId: number, request: LinkVisitCardRequest): Observable<AssignedVisitCard> {
    return this.http
      .post<ResponseData<AssignedVisitCard>>(
        `${this.getUrlSegment()}/${visitLogId}/card`,
        request,
        {
          withCredentials: true,
          context: new HttpContext().set(SKIP_ERROR_ALERT, true),
        }
      )
      .pipe(map((response) => response.data));
  }

  /** Gate: unlinks the visit's card so it can be handed to another visitor. */
  unlinkCard(visitLogId: number): Observable<string> {
    return this.http
      .delete<ResponseData<string>>(`${this.getUrlSegment()}/${visitLogId}/card`, {
        withCredentials: true,
      })
      .pipe(map((response) => response.data));
  }

  exportMyCreatedVisitsPdf(
    language: LANGUAGE_ENUM | string,
    filterOptions?: OptionsContract
  ): Observable<Blob> {
    return this.exportPdfByEndpoint('ExportMyCreatedVisitsPdf', language, filterOptions);
  }
}
