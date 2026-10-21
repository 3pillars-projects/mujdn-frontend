export class PermissionFilter {
  declare dateFrom?: Date | string;
  declare dateTo?: Date | string;
  declare permissionDate?: Date | string;
  declare fkStatusId: number;
  declare fkReasonId: number;
  declare fkDepartmentId: number;
  declare fkPermissionTypeId: number;
  declare creationUserId: number;
  /** Incoming tab only: keep the requests the current user can approve or reject now. */
  declare onlyActionable?: boolean;
}
