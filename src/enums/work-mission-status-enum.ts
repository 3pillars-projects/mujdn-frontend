/** HR approval status of a work mission; values match the backend `WorkMissionStatusEnum`. */
export enum WorkMissionStatusEnum {
  Draft = 1,
  PendingHrApproval = 2,
  Approved = 3,
  Rejected = 4,
}
