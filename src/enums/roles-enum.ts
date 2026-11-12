export enum ROLES_ENUM {
  ADMIN = 'adm26in2-737d-4667-00eddf86a2dd',
  DEPARTMENT_MANAGER = 'man4ag3r-f53f-4ef9-1ca7b455f8e4',
  EMPLOYEE = 'emp3l6y3-4cb1-402f-4f36a3b0441a',
  FOLLOW_UP_OFFICER = 'o9fi2cr2-d71f-480d-39a7763098fa',
  HR_OFFICER = '9hr55964-876d-45ec-e2b80ef3894f',
  SECURITY_LEADER = 'sec17l3d-d847-48f4-39bec9b5cb10',
  SECURITY_MEMBER = 'sec49m3m-133e-4d6f-4b53d752c34b',
  /** Composite role: the backend also grants HR_OFFICER and FOLLOW_UP_OFFICER, never Super HR. */
  ATTENDANCE_COMPLIANCE_OFFICER = 'acmp1nc3-5a2e-4c71-8be0c3f1a9d2',
}
