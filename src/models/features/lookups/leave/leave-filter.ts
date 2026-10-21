import { LEAVE_STATUS_ENUM } from '@/enums/leave-status-enum';
import { LEAVE_APPROVAL_STAGE_ENUM } from '@/enums/leave-approval-stage-enum';

export class LeaveFilter {
  declare fkEmployeeId: number | null;
  declare fkLeaveTypeId: number | null;
  declare status: LEAVE_STATUS_ENUM | null;
  declare approvalStage: LEAVE_APPROVAL_STAGE_ENUM | null;
  declare dateFrom: Date | null;
  declare dateTo: Date | null;
  declare fkDepartmentId: number | null;
  declare nationalId: string | null;
}
