import { WorkMissionStatusEnum } from '@/enums/work-mission-status-enum';

/** Status options for the mission status filters, in workflow order. */
export const WORK_MISSION_STATUS_OPTIONS: { value: WorkMissionStatusEnum; labelKey: string }[] = [
  { value: WorkMissionStatusEnum.Draft, labelKey: 'WORK_MISSIONS.STATUS_DRAFT' },
  { value: WorkMissionStatusEnum.PendingHrApproval, labelKey: 'WORK_MISSIONS.STATUS_PENDING_HR' },
  { value: WorkMissionStatusEnum.Approved, labelKey: 'WORK_MISSIONS.STATUS_APPROVED' },
  { value: WorkMissionStatusEnum.Rejected, labelKey: 'WORK_MISSIONS.STATUS_REJECTED' },
];

/** Translation key for a mission's status. */
export function workMissionStatusTextKey(status?: WorkMissionStatusEnum | null): string {
  return WORK_MISSION_STATUS_OPTIONS.find((option) => option.value === status)?.labelKey ?? '';
}

/** Pill classes for the mission status column and the details popup. */
export function workMissionStatusBadgeClass(status?: WorkMissionStatusEnum | null): string {
  const base =
    'text-[14px] min-h-[24px] inline-flex justify-center items-center gap-2 px-2 rounded-full font-medium';
  switch (status) {
    case WorkMissionStatusEnum.Draft:
      return `${base} text-gray-700 bg-gray-100`;
    case WorkMissionStatusEnum.PendingHrApproval:
      return `${base} text-[#1849a9] bg-[#eff8ff]`;
    case WorkMissionStatusEnum.Approved:
      return `${base} text-[#085d3a] bg-[#ecfdf3]`;
    case WorkMissionStatusEnum.Rejected:
      return `${base} text-[#912018] bg-[#fef3f2]`;
    default:
      return 'text-[14px] text-gray-600 px-2 py-1 rounded-full bg-gray-100 font-medium';
  }
}

export function workMissionStatusDotClass(status?: WorkMissionStatusEnum | null): string {
  switch (status) {
    case WorkMissionStatusEnum.PendingHrApproval:
      return 'w-[10px] h-[10px] bg-[#1849a9] rounded-full';
    case WorkMissionStatusEnum.Approved:
      return 'w-[10px] h-[10px] bg-[#085d3a] rounded-full';
    case WorkMissionStatusEnum.Rejected:
      return 'w-[10px] h-[10px] bg-[#912018] rounded-full';
    default:
      return 'w-[10px] h-[10px] bg-gray-600 rounded-full';
  }
}
