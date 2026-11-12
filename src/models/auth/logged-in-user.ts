export class LoggedInUser {
  version?: string;
  isActive?: string;
  fullNameAr?: string;
  fullNameEn?: string;
  departNameAr?: string;
  departNameEn?: string;
  profilePhotoId?: string;
  isInRootDepartment?: boolean;
  /** Computed by the backend (same rule as its RequireRootDepartment policy on HR endpoints). */
  isSuperHrOfficer?: boolean;
  isDepartmentManager?: boolean;
  roles: string[] = [];
}
