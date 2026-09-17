# Handoff: super-admin-permission-oversight

## Versions and state

- Updated/owner: 2026-09-16, backend by m1hosam (implemented via Claude Code this session)
- Accepted specification: `Features/super-admin-permission-oversight/spec.md` (this repository, same session — written up after implementation, not a pre-existing accepted plan)
- Backend branch/commit: `16-09-client-updates`, on top of `50b9ad79` (`Merge pull request #483 from mujdn/swipeid-fallback`). **Uncommitted working tree** — this feature has not been committed. The repository also carries roughly 1,300 unrelated pre-existing uncommitted files (an in-progress line-ending normalization pass); this feature's changes are limited to the files listed below and do not touch that unrelated set.
- Frontend branch/commit: not started / not inspected
- Contract artifact: **none exported**. Swagger is configured in `WebApi/Program.cs` but no OpenAPI JSON was generated or reviewed this session. Treat the C# signatures in this file and in `spec.md` as the authoritative source until an actual OpenAPI export is produced and diffed against them.
- Contract produced from: not applicable (no export run)
- Overall state: backend implemented and build-verified (`dotnet build` clean, 0 errors). **Not runtime-verified** — no test project exists in this repository, and the API was not started against a seeded database this session (starting it can migrate/write data outside an explicitly selected local/test environment). Frontend work has not started.

## Implemented behavior

| Criterion | API operation/contract reference | Status and evidence | Frontend work remaining |
|---|---|---|---|
| AC-01: root-department user sees all permissions | `POST /api/Permissions/GetDepartmentPermissionsWithPaging` | Implemented. `WebApi/Controllers/Schema/Lookup/PermissionsController.cs:41-50` now gated by `[Authorize(Policy = Policies.RequireDepartmentPermissionManagement)]`; `Services/Schema/Lookup/Permission/PermissionService.cs:107-186` (`GetDepartmentPermissionsWithPagingAsync`). Build-verified only. | Point the existing department-permissions grid's data call at this same endpoint for root-department users (no new endpoint to wire up) |
| AC-02: reject an Accepted permission | `PUT /api/Permissions/{permissionId}/reject` | Implemented. `PermissionsController.cs:98-104`; `PermissionService.cs` `RejectPermission` (~line 512-547); capability gate in `Services/Helper/Permission/PermissionHelper.cs:38-97` (`CanUserTakeAction`, new `allowRejectAfterAcceptance` param). Build-verified only. | Add a "reject" affordance on `Accepted` rows, gated on the new `canRejectAfterAcceptance` field |
| AC-03: non-super-admin still blocked from rejecting Accepted | same reject endpoint | Implemented (unchanged existing denial path — `ExternalServiceException(ErrorMessages.RecordModifiedByAnotherUser)`). Code-inspection only. | No new UI needed — existing error handling applies |
| AC-04: Rejected permissions stay final for everyone | same reject endpoint | Implemented — `allowRejectAfterAcceptance` only has effect when `FkStatusId == Accepted`. Code-inspection only. | None |
| AC-05: `canRejectAfterAcceptance` flag per row | `PermissionModel.CanRejectAfterAcceptance` (`Core/Models/Schema/Lookup/PermissionModel.cs`) | Implemented — populated in the paging loop of `GetDepartmentPermissionsWithPagingAsync`. Code-inspection only. | Drive the reject-override button/menu-item visibility off this field |
| AC-06: super admin gets HR-style visibility (temp-manager exclusion skipped) | same list endpoint | Implemented — `PermissionService.cs` around line 119. Code-inspection only. | None (backend-only nuance) |

## Integration details

- **Authentication/credentials mechanism**: unchanged — standard JWT bearer auth already used by every other endpoint in this controller (`[Authorize]` at controller level).
- **Roles/ownership and denied requests**:
  - `POST /api/Permissions/GetDepartmentPermissionsWithPaging` and `PUT /api/Permissions/{permissionId}/reject` are now gated by policy `RequireDepartmentPermissionManagement` (`WebApi/Authorization/RequireDepartmentPermissionManagementHandler.cs`) instead of `[Authorize(Roles = "DEPARTMENT_MANAGER,HR_OFFICER")]`. The policy succeeds for the same two roles **or** any user whose own department has `FkParentDepartmentId == null` (sits at the root department) — regardless of role.
  - A caller who fails the policy gets the framework's standard 401 (unauthenticated) or 403 (forbidden) response via `CustomAuthorizationMiddlewareResultHandler.cs` — this policy does **not** use the special `NotRootDepartment` 400 path that `Policies.RequireRootDepartment` uses; that's a different, older policy on other controllers (Holidays/Shifts/UserProfiles) and was not reused here since its role semantics differ.
  - Even when the policy admits a caller, the actual reject-after-acceptance override is decided again at the service layer (`CanUserTakeAction`) — a root-department user who somehow isn't a "true" root-department profile at that instant (race condition, department reassignment mid-request) is still denied there, not just at the controller gate.
- **Error message keys and field validation**: no new error keys were added. Reject denial reuses the existing `RECORD_MODIFIED_BY_ANOTHER_USER` key (`Services/Error/ErrorMessages.cs:10,168`) — this is a pre-existing, arguably mislabeled key (it's really "you can't act on this," not a concurrency conflict); flagging so the frontend doesn't need a new translation, but also doesn't misread it as an actual optimistic-concurrency conflict.
- **Dates/time zones, enums, null/omitted fields**: unchanged. `PermissionStatusEnum`: `New=1, Accepted=2, Rejected=3, FirstAccepted=4, AutoRejected=5`. `CanRejectAfterAcceptance` is `bool?` defaulting to `false`, serialized like the existing `CanTakeAction` field (omit-if-null is **not** configured on `PermissionModel`, so expect `"canRejectAfterAcceptance": false` explicitly on every row, not an omitted key — confirm against an actual response once the API is run, this was not captured live).
- **Pagination/sorting and response envelope**: unchanged — `POST GetDepartmentPermissionsWithPaging` returns `ApiResponse<PaginatedResult<PermissionModel>>` (`data.list`, `data.paginationInfo{currentPage,pageSize,totalPages,totalItems}`), same as today. `PUT .../reject` returns `ActionResult<PermissionModel>` directly (not wrapped in `ApiResponse<T>`) — this is a pre-existing inconsistency in this controller (`Accept`/`Reject` both bypass the `ApiResponse` envelope), not something this feature changed or fixed.
- **Concurrency/retry handling**: unchanged — no optimistic-concurrency token round trip was added to the reject flow beyond what already existed (none, currently — `Accept`/`Reject` don't check `ConcurrencyUpdateVersion` today).
- **File responses**: not applicable to this feature.

No live request/response examples are attached — the API was not run this session. Treat the shapes above as derived from source, not captured traffic.

## Frontend scope

- Screens/routes and existing patterns: not verified — locate the Angular screen(s) that already call the department-permissions list and its accept/reject actions (used today by department managers and HR officers) and extend them; do not build a parallel screen.
- Form and loading/empty/error/success states: none new.
- Localization/accessibility: none new; reuse whatever the existing grid/action already has for the reject flow.
- Generator/client integration: not configured in this repository per `Agent-Workflow.md`; no OpenAPI client generation exists to regenerate. If the Angular repo hand-writes its HTTP client/types for this controller, add `canRejectAfterAcceptance?: boolean` to its permission model by hand and confirm the endpoint's actual JSON against a running backend before wiring the UI.

## Run and verify

- Backend local/test setup: use an explicitly selected local/test database and configuration before starting the API — see `README.md#getting-started`. `WebApi/Program.cs` migrates the configured database outside Development and hosted services can write data even in Development.
- Frontend setup: not inspected this session — discover from the Angular repository's `package.json`/CI.
- Test data: needs at least one seeded `UserProfile` at the root department (its `Department.FkParentDepartmentId IS NULL`) with **no** `DEPARTMENT_MANAGER`/`HR_OFFICER` role, plus at least one `Permission` in `Accepted` status created by a user outside that root user's own department, to exercise AC-01/AC-02/AC-05 meaningfully.
- Automated/manual checks already run: `dotnet restore` and `dotnet build MJD_Attendance_Backend.sln --no-restore` — succeeded, 0 errors, pre-existing warnings only. No other checks were run.
- Checks still required against the actual API:
  1. Call `GetDepartmentPermissionsWithPaging` as the seeded root-department user and confirm rows from multiple departments come back, and confirm `Accepted` rows carry `canRejectAfterAcceptance: true`.
  2. Call `PUT /api/Permissions/{id}/reject` on one of those `Accepted` rows as that user and confirm the status flips to `Rejected`, `ActionDate` is set, and the requester's notification fires.
  3. Repeat step 2 with a plain department manager/HR officer (not root-department) on an `Accepted` row and confirm it's still denied with `RECORD_MODIFIED_BY_ANOTHER_USER`.
  4. Repeat step 2 with the root-department user on an already-`Rejected` row and confirm it's still denied.
  5. Confirm a plain employee (no role, not root department) gets 401/403 from both endpoints.

## Open decisions and next action

- Known gaps or incompatible changes: no OpenAPI artifact exists for this contract yet; no runtime verification has been performed (see above). `PUT .../reject`'s unwrapped `ActionResult<PermissionModel>` response and its reuse of `RECORD_MODIFIED_BY_ANOTHER_USER` for a non-concurrency denial are pre-existing quirks carried forward, not introduced here — worth a separate cleanup ticket if the frontend team finds them awkward, but out of scope for this feature.
- Required decisions: none outstanding — the three material design questions (flag placement, Rejected-reversal, endpoint reuse vs. new endpoint) were resolved with the product owner during implementation and are recorded in `spec.md`'s decisions table.
- Next task: run the five checks listed under "Checks still required against the actual API" against a local/test environment with the seeded root-department user described above, then hand the confirmed live response shapes back into this file before the Angular team starts wiring the UI.
