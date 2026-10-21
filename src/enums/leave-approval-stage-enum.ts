/** Where an in-progress (New) leave is waiting; null once it is accepted or rejected. */
export enum LEAVE_APPROVAL_STAGE_ENUM {
  ManagerLevel1 = 1,
  ManagerLevel2 = 2,
  Hr = 3,
}
