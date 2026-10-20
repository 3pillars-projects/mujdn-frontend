/** How a leave was filed; decides its approval route and who may edit it. */
export enum LEAVE_SUBMISSION_TYPE_ENUM {
  // An employee filed for himself: his manager(s), then HR.
  EmployeeSelf = 1,
  // A department manager filed for himself: the managers above him, then HR.
  ManagerSelf = 2,
  // A manager filed for an employee: straight to HR.
  OnBehalf = 3,
}
