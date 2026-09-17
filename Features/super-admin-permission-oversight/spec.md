# Feature: super-admin-permission-oversight — Root-department oversight of permissions

## Status and ownership

- Status: accepted (backend implemented; written up after implementation in this session)
- Owner: m1hosam (backend), coordinating agent: Claude Code
- Backend repository/revision: mjd-attend-back, branch `16-09-client-updates`, uncommitted working tree on top of `50b9ad79` (`Merge pull request #483 from mujdn/swipeid-fallback`). The repository already carries ~1300 unrelated pre-existing uncommitted files (a line-ending normalization pass) that this feature's diff is layered on top of and does not touch beyond its own files.
- Frontend repository/revision: not yet inspected (Angular app is a separate repository)
- Accepted baseline: this spec documents behavior already implemented and build-verified in this session; no separate design/plan artifact preceded it

## Goal and user journey

A user profile that sits at the **root department** (no parent department — the organization's top of the hierarchy; referred to here as the "super admin", regardless of their assigned role) needs to:

1. See every permission request in the system, not just their own department's, in the same paginated grid department managers and HR officers already use.
2. Reject a permission that a manager/HR officer already **accepted**, as an override — normally an accepted permission is final and nobody can act on it again.

This does not change who can **accept** a permission, and it does not let anyone reopen a **rejected** permission.

## Scope and exclusions

- In scope:
  - Granting the existing "department permissions" list endpoint to root-department users regardless of their role (they no longer need `DEPARTMENT_MANAGER` or `HR_OFFICER`).
  - Letting a root-department user reject a permission whose status is `Accepted`.
  - Surfacing a `canRejectAfterAcceptance` flag per permission row so the UI knows when to offer that override action.
- Out of scope (explicitly deferred, confirmed with the product owner during implementation):
  - A persisted `CanRejectAfterAcceptance` column on `Permission` or `PermissionType` — the capability is a runtime rule, not stored data.
  - Reversing an already-**Rejected** permission back to any other status, for anyone including the super admin.
  - Granting the super admin the ability to **accept** a `New`/`FirstAccepted` permission outside their normal approval-chain scope — the `Accept` endpoint's authorization is unchanged.
  - A brand-new "get all permissions" endpoint — the existing `GetDepartmentPermissionsWithPaging` endpoint is reused, since its underlying department-scope resolution already returns every department for an organization-wide scope.
  - PDF export endpoints (`ExportDepartmentPermissionsPdf`) — left on the old role-based authorization; not requested.
- Compatibility constraints: existing `DEPARTMENT_MANAGER`/`HR_OFFICER` behavior on the two touched endpoints is unchanged; only the previously-excluded root-department caller is newly admitted. No existing route path or request/response shape was renamed.

## Acceptance criteria

| ID | Given / When / Then | Verification approach |
|---|---|---|
| AC-01 | Given a user profile whose own department has no parent department (root department) and no `DEPARTMENT_MANAGER`/`HR_OFFICER` role, when they call `POST /api/Permissions/GetDepartmentPermissionsWithPaging`, then the call succeeds (200) and returns permissions from every department, not just their own. | Manual/integration test against a seeded root-department user with no other role. Not run this session (no test project, no seeded environment used). |
| AC-02 | Given the same root-department user, when they call `PUT /api/Permissions/{id}/reject` for a permission whose `FkStatusId` is `Accepted` (2), then the call succeeds, the permission's status becomes `Rejected` (3), `ActionDate` is stamped, and the requester is notified. | Same as AC-01 — not run this session. |
| AC-03 | Given a department manager or HR officer (not a root-department user) calling `PUT /api/Permissions/{id}/reject` on an `Accepted` permission, then the call still fails with `RECORD_MODIFIED_BY_ANOTHER_USER` (existing behavior, unchanged — this is the pre-existing, arguably mislabeled, denial key used by `RejectPermission` when `CanUserTakeAction` returns false). | Code inspection: `PermissionHelper.CanUserTakeAction` only sets `allowRejectAfterAcceptance` from the caller's own super-admin check in `PermissionService.RejectPermission`. |
| AC-04 | Given a `Rejected` permission, when a root-department user calls `PUT /api/Permissions/{id}/reject` on it, then the call fails the same way as for any other caller — a rejected permission is always final. | Code inspection: `canTakeAction = allowRejectAfterAcceptance && permission.FkStatusId == Accepted` — `Rejected` never satisfies this. |
| AC-05 | Given a root-department user, when the department-permissions grid is fetched, each row whose status is `Accepted` has `canRejectAfterAcceptance = true`; every other row (any other status, or the viewer is not a root-department user) has `canRejectAfterAcceptance = false`. | Code inspection: `PermissionService.GetDepartmentPermissionsWithPagingAsync` loop. Not exercised against a running API this session. |
| AC-06 | Given a root-department user who does *not* also hold `HR_OFFICER`, the temporary-department-manager exclusion that normally narrows a manager's visible list is skipped for them too (parity with HR), so they still see every department. | Code inspection only. |

## Business rules and permissions

- **"Root-department user" / super admin definition**: `UserProfile.FkDepartmentId` is a non-nullable column — no profile ever has a null department. The correct, already-established concept in this codebase is a user whose own `Department.FkParentDepartmentId == null` (the department itself has no parent). This is computed via `IUserProfileHelper.HasOrganizationWideScopeAsync(userProfile, applyHrScopeElevation: false)` in the service layer, and independently via `Department.FkParentDepartmentId == null` in the new authorization handler (`WebApi/Authorization/RequireDepartmentPermissionManagementHandler.cs`). `applyHrScopeElevation: false` is deliberate: this feature is about literally sitting at the root department, not the pre-existing "Super HR" case (an HR officer one level below root) — an HR officer already gets full visibility today via the existing role check, independent of this feature.
- **Authorization gate (coarse, controller-level)**: `Policies.RequireDepartmentPermissionManagement` (`Core/Models/Generic/Policies.cs`), enforced by `RequireDepartmentPermissionManagementHandler`. Succeeds for `DEPARTMENT_MANAGER` or `HR_OFFICER` role (unchanged from before), **or** for a user sitting at the root department (new). Applied to:
  - `POST /api/Permissions/GetDepartmentPermissionsWithPaging`
  - `PUT /api/Permissions/{permissionId}/reject`
- **Authorization gate (fine-grained, service-level)**: `PermissionHelper.CanUserTakeAction(permission, loggedInUserDepartmentId, allowRejectAfterAcceptance)`. The `allowRejectAfterAcceptance` flag is only ever passed as `true` from `PermissionService.RejectPermission` when the caller is the root-department super admin, and only has any effect when `permission.FkStatusId == Accepted`. It never applies to `Accept`, and never reopens `Rejected`.
- **Validation**: `ValidateUsersInDepartmentAsync` (existing) is called unchanged in `RejectPermission`. It already passes for a root-department caller without special-casing, because `GetDepartmentIdsAsync` already returns every department ID once the caller's scope resolves as organization-wide (pre-existing behavior, not touched by this feature).
- **Duplicate/retry/concurrency**: unchanged — `RejectPermission` still uses `_repository.Update` + `SaveChangesAsync`, no new concurrency handling was added or needed.
- **Data relationships/migration**: none — no schema/entity/migration changes. `CanRejectAfterAcceptance` is a computed DTO field, never persisted.
- **Date/time semantics**: unchanged — `ActionDate` is stamped with `DateOnly.FromDateTime(DateTime.UtcNow.ToAppTimeZone())`, same as the existing accept/reject paths.

## API contract intent

- Authoritative contract location/revision: none exported. Swagger/OpenAPI is configured in `WebApi/Program.cs` but no export was generated or reviewed this session — see `handoff.md` for what to do about that before frontend work starts.
- Generation/source policy: not established for this repository; the C# controller/DTOs below are the actual, build-verified source of truth for this revision.

| Operation | Method/path | Request | Success status/body | Failure statuses/keys | Access |
|---|---|---|---|---|---|
| List department/organization permissions | `POST /api/Permissions/GetDepartmentPermissionsWithPaging?PageNumber=&PageSize=&OrderBy=&SortDir=` | Body: `PermissionFilterParams` (`DateFrom?`, `DateTo?`, `FkStatusId?`, `FkReasonId?`, `FkDepartmentId?`, `FkPermissionTypeId?`, `CreationUserId?`) | 200, `ApiResponse<PaginatedResult<PermissionModel>>` — `data.list[]`, `data.paginationInfo{currentPage,pageSize,totalPages,totalItems}` | 401 unauthenticated; 400/403 via the policy handler's forbid path if neither a manager/HR role nor root-department (see Integration details in handoff) | Unchanged for `DEPARTMENT_MANAGER`/`HR_OFFICER`; newly also any user whose own department has no parent |
| Reject a permission (including override) | `PUT /api/Permissions/{permissionId}/reject` | Route param `permissionId:int`, no body | 200, `ActionResult<PermissionModel>` (not wrapped in `ApiResponse<T>` — this endpoint returns the model directly, pre-existing inconsistency, not introduced by this feature) | `ExternalServiceException` → surfaces as `RECORD_MODIFIED_BY_ANOTHER_USER` when the caller cannot act (including: not the super admin and permission already `Accepted`/`Rejected`); `BusinessValidationException(InvalidInput)`/404-style when the permission doesn't exist | Unchanged for `DEPARTMENT_MANAGER`/`HR_OFFICER`; newly also any root-department user, but only actually flips status when the permission is `Accepted` |

`PermissionModel` (relevant fields only — see `Core/Models/Schema/Lookup/PermissionModel.cs`): unchanged fields plus the new `canRejectAfterAcceptance?: boolean` (nullable, defaults to `false`), sibling to the existing `canTakeAction?: boolean`. `FkStatusId` enum values: `New=1, Accepted=2, Rejected=3, FirstAccepted=4, AutoRejected=5` (`Core/Enums/PermissionStatusEnum.cs`).

## Frontend behavior

- Screens/routes and representative existing components: not inspected — the Angular repository is separate and was not opened this session. The frontend team should locate whatever screen already calls `GetDepartmentPermissionsWithPaging` and the reject action today (used by department managers/HR officers) and extend it, rather than building a new screen.
- Form fields and validation: no new request fields; this is purely a visibility + one new action-eligibility flag change.
- Loading/empty/error/success states: no new states — this widens who can reach the existing list/reject flow.
- Permission-dependent UI: show a "reject" affordance on an already-`Accepted` row only when `canRejectAfterAcceptance` is `true` on that row. Do not infer super-admin status from role names — those are unrelated to this capability. On a denied reject attempt, the existing `RECORD_MODIFIED_BY_ANOTHER_USER` message key/copy applies (pre-existing, unrelated to this feature).
- Localization/accessibility/responsive: no new requirements identified; follow whatever the existing department-permissions grid already does.

## Decisions and open questions

| Question or proposed change | Evidence/options and impact | Resolution/owner |
|---|---|---|
| Where should the reject-after-acceptance capability live (DB flag vs. runtime rule)? | Options were: (a) capability check only, (b) column on `PermissionType`, (c) column on `Permission`. A DB column would need a migration and admin UI with no stated need for per-type/per-instance variation. | Accepted: (a) capability check only, computed from the caller's department position — user confirmed via AskUserQuestion during this session. |
| Should the super admin be able to reverse an already-`Rejected` permission back to any status? | Would give full override power but breaks the one-way terminal-status convention used elsewhere in this system. | Accepted: no — `Accepted → Rejected` only; `Rejected` stays final for everyone. User confirmed via AskUserQuestion. |
| How should "see all permissions" be exposed — new endpoint or reuse the existing department endpoint? | A new endpoint would duplicate `GetDepartmentPermissionsWithPagingAsync`'s query/projection almost entirely. `GetDepartmentIdsAsync` already returns every department ID once scope resolves as organization-wide, so the existing endpoint already returns everyone for a root-department caller — only its `[Authorize(Roles=...)]` attribute was blocking that caller. | Accepted: reuse the existing endpoint; relaxed its authorization via a new policy instead of adding a parallel endpoint. User confirmed via AskUserQuestion. |
| Should `Accept` also be opened to root-department users without `DEPARTMENT_MANAGER`/`HR_OFFICER`? | Not requested by the product ask ("see all permissions... and reject a permission after its acceptance"). Opening `Accept` too would be unrequested scope expansion. | Deferred/out of scope — raise separately if the product owner wants it. |

## Completion and rollout

- Required checks and data/environment: `dotnet restore` + `dotnet build MJD_Attendance_Backend.sln --no-restore` passed clean (0 errors; only pre-existing warnings) in this session. No test project exists in this repository (confirmed per `AGENTS.md`), so AC-01/AC-02/AC-05/AC-06 are **code-inspection-verified only**, not runtime-verified. Running the API to verify end-to-end requires an explicitly selected local/test database (starting it against any other environment can migrate/write data) — not done this session.
- Migration, compatibility, rollout, and rollback needs: none — no schema change; rollback is a plain code revert of the listed files.
- Evidence location: this repository's session transcript; see `handoff.md` for the concrete file/line list and the still-required runtime verification.
