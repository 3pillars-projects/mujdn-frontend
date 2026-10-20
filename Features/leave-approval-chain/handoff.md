# Handoff: leave-approval-chain

## Versions and state

- Updated/owner: 2026-10-20, implementation agent
- Accepted specification: `mjd-attend-back/Features/leave-approval-chain/spec.md` (accepted 2026-10-20)
- Backend branch/commit: `feature/leave-approval-chain` off `dev` at `9fb09dfe`. **All changes are uncommitted.**
- Frontend branch/commit: `feature/leave-approval-chain` off `dev`. **All changes are uncommitted.** The frontend is already implemented against this contract.
- Contract artifact: there is no OpenAPI export. The contract is the spec's API table plus the source files below, at the uncommitted working tree.
- Overall state: implemented in both repos. The backend has been verified by unit and service tests (EF InMemory). It has not yet been run against SQL Server or exercised in a browser.

## Implemented behavior

| Criterion | API / source | Status and evidence |
|---|---|---|
| AC-01–AC-05 routing | `LeaveApprovalPolicy.ResolveRoute`; `LeaveService.CreateAsync` / `ResolveRouteAsync` | Implemented. Covered by `LeaveApprovalPolicyTests` (routing) and `LeaveServiceApprovalChainTests` (stored route, full chain). |
| AC-06 vacant seat waits, HR fallback | `LeaveApprovalPolicy.ResolveActorRole` | Implemented. Covered by policy tests plus `HrFallback_ApprovesAtManagerStage_AndThatIsFinal` and `HrOfficer_FilesOwnLeave_...` (vacant level). |
| AC-07 only the stage's managers decide | same | Implemented. Tests: `HigherManager_CannotDecideBeforeHisLevel...`, `ManagerSelf_TwoLevel...` |
| AC-08 HR any stage, final; dates HR-only | `AcceptLeaveAsync` | Implemented and tested |
| AC-09 rejection final, notes required | `RejectLeaveAsync` | Implemented and tested |
| AC-10 no self-decision (HR included) | policy | Implemented and tested |
| AC-11 edit/withdraw window | `LeaveApprovalPolicy.CanModify`, `EnsureCanModifyAsync` | Implemented and tested (self, on-behalf, re-target guard) |
| AC-12 history | `LeaveApprovalAction` table, `LeaveModel.approvalActions` | Implemented and tested. UI timeline built. |
| AC-13 notifications | `CreatePendingApprovalNotificationsAsync`, notification type `LEAVE_PENDING_APPROVAL` (11) | Implemented. Recipients tested with a recording fake. Delivery is not verified. |
| AC-14 employee self-service UI | My leaves tab | Implemented; build passes; **browser flow not run** |
| AC-15 manager approvals list/UI | `POST /api/leaves/GetApprovalsWithPaging`, confirmations tabs | Implemented and list-tested in the service; **browser flow not run** |
| AC-16 migration of in-flight leaves | `20261020090921_AddLeaveApprovalChain` | Implemented (backfill SQL). **Not applied to any database yet.** |
| AC-17 concurrent decisions | serializable tx + rowversion → 409; SQL deadlock (1205) during a decision → 409 | Implemented. **Not verifiable on InMemory**; needs SQL Server. |

## Integration details

- **Roles and ownership**
  - `POST/PUT/DELETE /api/leaves` are open to any authenticated user. The service decides what is allowed (see spec AC-11).
  - Accept and reject: `HR_OFFICER` or `DEPARTMENT_MANAGER` at the controller, then `LeaveApprovalPolicy` in the service.
  - `POST /api/leaves/GetApprovalsWithPaging`: `DEPARTMENT_MANAGER` only.
- **New error key**: `LEAVE_APPROVAL_NOT_ALLOWED` (400), with EN/AR text added under `COMMON` in the frontend.
- **Reused error keys**:
  - `LEAVE_ALREADY_DECIDED`: also returned when editing or withdrawing after the first approval.
  - `AUTH_UNAUTHORIZED_ACCESS`: not allowed to edit the leave, or a non-manager filing for someone else.
  - `INVALID_INPUT`: a manager sending dates on accept, or moving a self leave to another employee.
- **Enums (integers)**
  - `approvalStage`: 1 ManagerLevel1, 2 ManagerLevel2, 3 Hr, or null once the leave is decided.
  - `submissionType`: 1 EmployeeSelf, 2 ManagerSelf, 3 OnBehalf.
  - `status` values are unchanged.
- **New `LeaveModel` fields**:
  - `submissionType`, `approvalStage`
  - `fkLevel1ApprovalDepartmentId`, `level1ApprovalDepartment`, `fkLevel2ApprovalDepartmentId`, `level2ApprovalDepartment`
  - `approvalActions[]`, with `actionDate` as a DateOnly
  - `canEdit`, `canDelete`, `canAmendDates`
  - `canTakeAction` is now computed per stage.
- **Create request**: `fkEmployeeId` is optional. Omitting it files the leave for the caller.
- **Pagination, envelope and concurrency**: unchanged.

## Run and verify

- **Backend checks**
  - Build: `dotnet build` per project. A running `WebApi.exe` locks `WebApi/bin`, so `WebApi` was built with `-p:OutDir=<scratch>`.
  - Tests: `dotnet test Tests/Services.Tests/Services.Tests.csproj` passed 75 of 75. That includes 33 policy tests and 20 service tests that are new.
- **Independent review (2026-10-20)**: fixed both authorization findings (approver set too broad; manager editing an on-behalf leave of his own), the other-leaves self edit, and dual-role date amendment, and mapped deadlocks to 409. Not changed: on-behalf creation still validates with HR scope elevation for a manager who also holds HR (existing behavior, see open decisions).
- **Frontend checks**: `npm run build` passes. Only the existing bundle-budget and CommonJS warnings appear.
- **Still required** (on a selected local DB, after `dotnet ef database update`):
  1. Migration Up on a copy of real data: existing `New` leaves end at stage 3, and attendance output is unchanged.
  2. Browser flows in EN and AR:
     - employee in a two-level department → direct manager → higher manager → HR
     - manager on behalf → HR
     - manager for self
     - rejection at level 1
     - withdraw before approval, and the edit refused after approval
     - a user with both roles switching tabs
  3. A concurrent accept from two managers on SQL Server (AC-17).
  4. Notification delivery for `LEAVE_PENDING_APPROVAL`.

## Open decisions and next action

- **Known gaps**
  - The UI still requires at least one attachment on every leave form (an existing frontend rule), now including employee self-requests. The backend does not require one.
  - No approval deadline: a request at a vacant level waits until HR acts.
- **Pending decision**: a user who is both department manager and HR officer can file on-behalf leaves (which go straight to HR) for employees in their *elevated HR scope*, not only their own department tree. This was existing behavior and was left unchanged. Restricting it to the manager scope is a one-line change if wanted.
- **Department deletion**: a department referenced as an approval level by any leave (including historical ones) can no longer be deleted (Restrict FK).
- **Next task**: apply the migration to a local test DB and run the browser flows above.
