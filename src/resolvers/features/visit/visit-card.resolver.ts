import { VisitCard } from '@/models/features/visit/visit-card';
import { PaginationParams } from '@/models/shared/pagination-params';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { VisitCardService } from '@/services/features/visit/visit-card.service';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, of } from 'rxjs';

export const visitCardResolver: ResolveFn<PaginatedList<VisitCard> | null> = () => {
  const visitCardService = inject(VisitCardService);
  return visitCardService.loadPaginated(new PaginationParams()).pipe(
    catchError(() => of(null)) // Prevent throwing to allow route activation
  );
};
