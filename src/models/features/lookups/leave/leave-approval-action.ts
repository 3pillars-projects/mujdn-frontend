import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { LEAVE_APPROVAL_STAGE_ENUM } from '@/enums/leave-approval-stage-enum';

/** One recorded approval or rejection on a leave, oldest first. */
export interface LeaveApprovalAction {
  id: number;
  stage: LEAVE_APPROVAL_STAGE_ENUM;
  department?: BaseLookupModel | null;
  approver: BaseLookupModel;
  actedAsHr: boolean;
  isApproved: boolean;
  actionDate: Date | string;
  notes?: string | null;
}
