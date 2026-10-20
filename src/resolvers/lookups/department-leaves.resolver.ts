import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { LeaveService } from '@/services/features/lookups/leave.service';
import { AuthService } from '@/services/auth/auth.service';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { Leave } from '@/models/features/lookups/leave/leave';
import { PaginationParams } from '@/models/shared/pagination-params';
import { catchError, of } from 'rxjs';

/**
 * Leave confirmations: HR officers start on the HR list, department managers (without HR) on
 * the leaves awaiting their approval. Must match LeavesConfirmationsComponent's initial mode.
 */
export const departmentLeavesResolver: ResolveFn<PaginatedList<Leave> | null> = () => {
  const leaveService = inject(LeaveService);
  const authService = inject(AuthService);
  const request = authService.isHROfficer
    ? leaveService.loadPaginated(new PaginationParams())
    : leaveService.loadApprovalsPaginated(new PaginationParams());
  return request.pipe(
    catchError(() => {
      return of(null); // Prevent throwing to allow route activation
    })
  );
};
