import { LEAVE_STATUS_ENUM } from '@/enums/leave-status-enum';
import { LEAVE_APPROVAL_STAGE_ENUM } from '@/enums/leave-approval-stage-enum';
import { LeaveFilter } from '@/models/features/lookups/leave/leave-filter';

interface LeaveRequestStatusOption {
  id: string;
  status: LEAVE_STATUS_ENUM;
  approvalStage: LEAVE_APPROVAL_STAGE_ENUM | null;
}

export const leaveRequestStatusOptions: LeaveRequestStatusOption[] = [
  {
    id: 'PENDING_DIRECT_MANAGER',
    status: LEAVE_STATUS_ENUM.New,
    approvalStage: LEAVE_APPROVAL_STAGE_ENUM.ManagerLevel1,
  },
  {
    id: 'PENDING_HIGHER_MANAGER',
    status: LEAVE_STATUS_ENUM.New,
    approvalStage: LEAVE_APPROVAL_STAGE_ENUM.ManagerLevel2,
  },
  {
    id: 'PENDING_HR',
    status: LEAVE_STATUS_ENUM.New,
    approvalStage: LEAVE_APPROVAL_STAGE_ENUM.Hr,
  },
  { id: 'ACCEPTED', status: LEAVE_STATUS_ENUM.Accepted, approvalStage: null },
  { id: 'REJECTED', status: LEAVE_STATUS_ENUM.Rejected, approvalStage: null },
];

export function getLeaveRequestStatus(filter: LeaveFilter): string | null {
  return (
    leaveRequestStatusOptions.find(
      (option) =>
        option.status === filter.status && option.approvalStage === (filter.approvalStage ?? null)
    )?.id ?? null
  );
}

export function setLeaveRequestStatus(filter: LeaveFilter, id: string | null): void {
  const option = leaveRequestStatusOptions.find((option) => option.id === id);
  filter.status = option?.status ?? null;
  filter.approvalStage = option?.approvalStage ?? null;
}
