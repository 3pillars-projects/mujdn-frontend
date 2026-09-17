import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { SingleResponseData } from '@/models/shared/response/single-response-data';
import { BaseCrudService } from '@/abstracts/base-crud-service';
import { LoggedInUser } from '@/models/auth/logged-in-user';
import { ROLES_ENUM } from '@/enums/roles-enum';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends BaseCrudService<LoggedInUser, string> {
  serviceName: string = 'AuthService';
  router = inject(Router);
  isAuthenticated = false;
  private loggedInUser: BehaviorSubject<LoggedInUser | undefined> = new BehaviorSubject<
    LoggedInUser | undefined
  >(undefined);

  get isAdmin() {
    return this.loggedInUser.value?.roles.includes(ROLES_ENUM.ADMIN);
  }

  get isDepartmentManager() {
    return this.loggedInUser.value?.roles.includes(ROLES_ENUM.DEPARTMENT_MANAGER);
  }

  get hasVisitsAccess() {
    return this.isDepartmentManager || this.isSecurityLeader || this.isSecurityMember;
  }

  get isHROfficer() {
    return this.loggedInUser.value?.roles.includes(ROLES_ENUM.HR_OFFICER);
  }

  get isSuperHROfficer() {
    return (
      this.loggedInUser.value?.roles.includes(ROLES_ENUM.HR_OFFICER) &&
      this.loggedInUser.value?.isInRootDepartment
    );
  }

  get isRootdepartment() {
    return this.loggedInUser.value?.isInRootDepartment;
  }

  get isRootDepartmentAdmin() {
    return this.isAdmin && this.isRootdepartment;
  }

  /** True only when root-department oversight is someone's sole standing — a manager/HR role
   * they also hold keeps their normal approval-chain actions, independent of this admin flag. */
  get isRootDepartmentOversightOnly() {
    return this.isRootDepartmentAdmin && !this.isDepartmentManager && !this.isHROfficer;
  }

  get isdepartmentActualManager() {
    return this.isActualDepartmentManager();
  }

  get isFollowUpOfficer() {
    return this.loggedInUser.value?.roles.includes(ROLES_ENUM.FOLLOW_UP_OFFICER);
  }

  get isSecurityLeader() {
    return this.loggedInUser.value?.roles.includes(ROLES_ENUM.SECURITY_LEADER);
  }

  get isSecurityMember() {
    return this.loggedInUser.value?.roles.includes(ROLES_ENUM.SECURITY_MEMBER);
  }

  getUrlSegment(): string {
    return this.urlService.URLS.AUTH;
  }

  login(username: string, password: string) {
    return this.http.post<SingleResponseData<LoggedInUser>>(
      this.getUrlSegment() + '/login',
      {
        username: username,
        password: password,
      },
      { withCredentials: true }
    );
  }

  loginWithActiveDirectory(username: string, password: string) {
    return this.http.post<SingleResponseData<LoggedInUser>>(
      this.getUrlSegment() + '/login/active-directory',
      {
        username: username,
        password: password,
      },
      { withCredentials: true }
    );
  }

  logout() {
    return this.http.get<SingleResponseData<LoggedInUser>>(this.getUrlSegment() + '/logout', {
      withCredentials: true,
    });
  }

  setUser(loggedInUser: LoggedInUser | undefined) {
    this.isAuthenticated = !!loggedInUser;
    if (loggedInUser) {
      loggedInUser.isDepartmentManager = loggedInUser.isDepartmentManager + '' == 'true';
      loggedInUser.isInRootDepartment = loggedInUser.isInRootDepartment + '' == 'true';
    }

    const user = loggedInUser ? Object.assign(new LoggedInUser(), loggedInUser) : undefined;
    this.loggedInUser.next(user);
  }

  refreshToken() {
    return this.http.get<SingleResponseData<LoggedInUser>>(this.getUrlSegment() + '/refresh', {
      withCredentials: true,
    });
  }

  getUser(): BehaviorSubject<LoggedInUser | undefined> {
    return this.loggedInUser;
  }

  isActualDepartmentManager(user: LoggedInUser | undefined = this.loggedInUser.value): boolean {
    return !!user?.isDepartmentManager;
  }

  hasRouteAccess(
    accessOptions?: { actualDepartmentManagerOnly?: boolean },
    user: LoggedInUser | undefined = this.loggedInUser.value
  ): boolean {
    if (accessOptions?.actualDepartmentManagerOnly && !this.isActualDepartmentManager(user)) {
      return false;
    }

    return true;
  }

  userVersionHasBeenChanged(user: LoggedInUser) {
    return this.loggedInUser.value?.version != user.version;
  }

  userDepartmentHasBeenChanged(user: LoggedInUser) {
    return (
      this.loggedInUser.value?.departNameEn != user.departNameEn ||
      this.loggedInUser.value?.departNameAr != user.departNameAr
    );
  }
}
