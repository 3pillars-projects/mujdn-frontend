import { LEAVE_STATUS_ENUM } from '@/enums/leave-status-enum';
import { LEAVE_APPROVAL_STAGE_ENUM } from '@/enums/leave-approval-stage-enum';
import { LEAVE_SUBMISSION_TYPE_ENUM } from '@/enums/leave-submission-type-enum';

/** The leave fields the status display needs. */
export interface LeaveStatusSource {
  status: LEAVE_STATUS_ENUM;
  approvalStage?: LEAVE_APPROVAL_STAGE_ENUM | null;
  submissionType?: LEAVE_SUBMISSION_TYPE_ENUM | null;
}

/**
 * Translation key for a leave's status. An in-progress leave names the stage it waits at; for a
 * manager's own leave the first level is his supervisor rather than his "direct manager".
 */
export function leaveStatusTextKey(leave: LeaveStatusSource): string {
  switch (leave.status) {
    case LEAVE_STATUS_ENUM.Accepted:
      return 'LEAVES_PAGE.ACCEPTED';
    case LEAVE_STATUS_ENUM.Rejected:
      return 'LEAVES_PAGE.REJECTED';
    case LEAVE_STATUS_ENUM.New:
      return leaveStageTextKey(leave.approvalStage, leave.submissionType) ?? 'LEAVES_PAGE.NEW';
    default:
      return '';
  }
}

/** Translation key for an approval stage ("Pending direct manager", ...), if any. */
export function leaveStageTextKey(
  stage?: LEAVE_APPROVAL_STAGE_ENUM | null,
  submissionType?: LEAVE_SUBMISSION_TYPE_ENUM | null
): string | null {
  switch (stage) {
    case LEAVE_APPROVAL_STAGE_ENUM.ManagerLevel1:
      return submissionType === LEAVE_SUBMISSION_TYPE_ENUM.ManagerSelf
        ? 'LEAVES_PAGE.PENDING_SUPERVISOR'
        : 'LEAVES_PAGE.PENDING_DIRECT_MANAGER';
    case LEAVE_APPROVAL_STAGE_ENUM.ManagerLevel2:
      return 'LEAVES_PAGE.PENDING_HIGHER_MANAGER';
    case LEAVE_APPROVAL_STAGE_ENUM.Hr:
      return 'LEAVES_PAGE.PENDING_HR';
    default:
      return null;
  }
}

/** Pill classes for the status column of the leave lists. */
export function leaveStatusBadgeClass(leave: LeaveStatusSource): string {
  const base =
    'text-[14px] min-h-[24px] inline-flex justify-center items-center gap-2 px-2 rounded-full font-medium';
  switch (leave.status) {
    case LEAVE_STATUS_ENUM.New:
      return `${base} text-[#1849a9] bg-[#eff8ff]`;
    case LEAVE_STATUS_ENUM.Accepted:
      return `${base} text-[#085d3a] bg-[#ecfdf3]`;
    case LEAVE_STATUS_ENUM.Rejected:
      return `${base} text-[#912018] bg-[#fef3f2]`;
    default:
      return 'text-[14px] text-gray-600 px-2 py-1 rounded-full bg-gray-100 font-medium';
  }
}

export function leaveStatusDotClass(leave: LeaveStatusSource): string {
  switch (leave.status) {
    case LEAVE_STATUS_ENUM.New:
      return 'w-[10px] h-[10px] bg-[#1849a9] rounded-full';
    case LEAVE_STATUS_ENUM.Accepted:
      return 'w-[10px] h-[10px] bg-[#085d3a] rounded-full';
    case LEAVE_STATUS_ENUM.Rejected:
      return 'w-[10px] h-[10px] bg-[#912018] rounded-full';
    default:
      return 'w-[10px] h-[10px] bg-gray-600 rounded-full';
  }
}
