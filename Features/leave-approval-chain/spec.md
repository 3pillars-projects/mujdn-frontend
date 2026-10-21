# Feature: leave-approval-chain — employee self-service leave with manager → HR approval

## Status and ownership

- Status: accepted 2026-10-20 (implementation in progress on `feature/leave-approval-chain` in both repos)
- Owner: backend/frontend implementation agent
- Backend repository/revision: `mjd-attend-back` on `dev` at `9fb09dfe` (working tree has unrelated uncommitted skill/config edits)
- Frontend repository/revision: `mujdn-frontend` on `dev` (working tree has unrelated uncommitted skill edits)
- Accepted baseline: user request dated 2026-10-20 ("Leave Request Management" §1–3) plus the decisions recorded below

## Goal and user journey

Today only a Department Manager can create a leave, and HR is the single approver (`New → Accepted/Rejected`). This feature makes leave a full request workflow:

1. **Employee submits for themselves.** It goes to their direct manager, then (two-level departments) the higher-level manager, then HR.
2. **Manager submits for a subordinate.** It goes straight to HR, whatever the department setting.
3. **Manager submits for themselves.** It goes to their own supervisor (the parent department's manager), then (two-level) the next manager up, then HR.

Each approver sees the requests waiting at their level, approves or rejects them, and the requester can follow the progress.

## Scope and exclusions

- In scope: submission routing for the three cases, an approval stage per manager level plus a final HR stage, an approval history, manager approval list and actions, HR fallback, requester edit/withdraw rules, notifications to next approvers, migration of in-flight leaves, status/stage display in lists, views and exports, and English/Arabic text.
- Out of scope: leave balances/entitlement, mandatory attachments per leave type, cancellation of approved leave by the requester, approval deadlines or auto-rejection, changes to the Permission workflow, and changing the attendance-processing SQL.
- Compatibility constraints:
  - `LeaveStatusEnum` integer values stay as they are (`New=1, Accepted=2, Rejected=3`). The SQL triggers (`Sql/triggers/Leave_*.sql`) and `Sql/processing/Processing_Leaves.sql` hard-code `Accepted = 2`, and only `Accepted` affects attendance. Approval progress is tracked in a separate stage field, and `New` keeps meaning "in progress".
  - The existing routes, `ApiResponse` envelope, attachment flow, decision-number rules, `concurrencyUpdateVersion` round-trip, HR date amendment at acceptance, and HR "reject after accepted" stay as they are.
  - The department setting reused is the existing `Department.IsOneLevelApproval`, which the Permission workflow already uses.

## Definitions

- **D**: the requester's (employee's) department. **P**: parent of D. **G**: parent of P.
- **Eligible managers of department X**: X's actual manager (`Department.FkManagerId`), users holding the *permanent* `DEPARTMENT_MANAGER` role who sit in X, and users with an active temporary `DEPARTMENT_MANAGER` assignment over X. This is stricter than `PermissionHelper.CanUserTakeAction`, which also counts temporary assignments of other roles and lets a temporary manager decide for his home department. The review on 2026-10-20 showed both as approval bypasses.
- **Requester is a manager**: the requester is an eligible manager of D (actual or active acting). This is the same test Permission uses (`IsPermissionCreatorActingDepartmentManager`).
- **Two-level**: `D.IsOneLevelApproval == false`, read at submission time.

## Routing rules (computed once at submission, then stored)

| Case | Level 1 department | Level 2 department (two-level only) | Final |
|---|---|---|---|
| Employee for self (requester is not a manager of D) | D | P | HR |
| Manager for self (requester is a manager of D) | P | G | HR |
| Manager on behalf of another employee | — | — | HR |

- **Structural gap → skip.** If a level's department does not exist (no parent, or no grandparent), that level is dropped. The remaining levels move up in order; the chain always ends at HR. Example: the root department's manager filing for themselves goes straight to HR.
- **Vacant seat → wait (Permission behaviour).** If the level's department exists but currently has no eligible manager, the request waits at that level. A newly assigned or acting manager can approve it, and HR can act on it at any time (see the HR fallback). **Superseded 2026-10-21 (`leave-unified-list`): the chain is sequential; HR acts only once the leave reaches the HR stage.**
- The level departments are stored on the leave, so later department re-parenting (the `department-parent-editing` feature) or setting changes do not reroute requests already in progress. The eligible people are resolved when the decision is made, so manager changes and delegations take effect immediately.

## Acceptance criteria

| ID | Given / When / Then | Verification approach |
|---|---|---|
| AC-01 | Given an ordinary employee in a one-level department, when they submit a leave for themselves, then it is `New` at stage *Manager level 1* (dept D), and after D's manager approves it moves to stage *HR*. | Service test (route resolver + transition); browser flow |
| AC-02 | Given an ordinary employee in a two-level department, when they submit, then the stages are D's manager → P's manager → HR, in that order. | Service test; browser flow |
| AC-03 | Given a manager filing for a subordinate in their scope, whatever the setting, the leave starts at stage *HR*, with no manager levels. | Service test |
| AC-04 | Given the actual or an acting manager of D filing for themselves, one-level gives P's manager → HR, and two-level gives P's manager → G's manager → HR. | Service test |
| AC-05 | Given a level whose department does not exist (no P or no G), that level is skipped at submission. A root-department manager's own request goes straight to HR. | Service test |
| AC-06 | Given a level whose department has no eligible manager, the request stays at that level. A manager assigned or delegated later can approve it, and HR can approve or reject it. | Service test |
| AC-07 | Given a request at a manager level, only eligible managers of that level's department (not the requester) can approve or reject it. Anyone else gets `400 LEAVE_APPROVAL_NOT_ALLOWED`. The approve/reject buttons follow server `canTakeAction`. | Service test; API check |
| AC-08 | Given an HR officer whose scope covers the employee, they can approve or reject at any pending stage. HR approval makes the leave `Accepted` (final). Only HR can change dates when approving. | Service test |
| AC-09 | Rejection at any stage requires notes of 1–500 characters, makes the leave `Rejected` (final), and notifies the employee. | Service test |
| AC-10 | The requester can never approve or reject their own leave at any stage, HR included. | Service test |
| AC-11 | A self-submitted leave can be edited or withdrawn (deleted) only by its requester, and only while no approval has been recorded. An on-behalf leave stays editable/deletable by managers in scope until HR decides, as today. Otherwise the server returns `LEAVE_ALREADY_DECIDED`. | Service test; UI shows actions from server `canEdit` / `canDelete` |
| AC-12 | Every approval and rejection is recorded (level, department, approver, decision, date, notes) and shown in the leave view as a timeline. **Superseded 2026-10-21 (`leave-unified-list`): decisions are still recorded, but the API no longer returns the history and no popup shows it.** | Service test; UI check |
| AC-13 | When a request reaches a level, that level's eligible managers are notified, or the HR officers in scope at the HR stage. On final approval or any rejection, the employee is notified (existing `LEAVE_RESULT`). | Service test with fake notification service |
| AC-14 | Any employee can open "My leaves", submit a leave for themselves with type, dates, decision number (required) and attachments, and see each request's current stage. | Browser flow (EN + AR) |
| AC-15 | A department manager sees an approvals list of requests waiting at a level they're eligible for, plus requests they already acted on, and can approve or reject from it. HR keeps the Leaves confirmations list. A user with both roles sees both. | Browser flow |
| AC-16 | After the migration, existing `New` leaves (all created by managers) are at stage *HR* and behave exactly as today. `Accepted` and `Rejected` leaves have no stage. Attendance processing output is unchanged. | Migration review; SQL check on a test DB |
| AC-17 | Two approvers acting on the same leave at the same time: one succeeds, the other gets `409 RECORD_MODIFIED_BY_ANOTHER_USER`, or `LEAVE_APPROVAL_NOT_ALLOWED` if the stage already moved on. | Service test (serializable transaction + concurrency token) |

## Business rules and permissions

- **Roles and data scope**
  - Create/edit/delete own leave: any logged-in user (`EMPLOYEE`).
  - Create/edit/delete on behalf: `DEPARTMENT_MANAGER` within the current scope and peer-manager rules (`GetLeaveEmployeesLookupAsync` / `ValidateNoPeerManagersAsync`, unchanged).
  - The server decides the case from `fkEmployeeId == caller` and never trusts the client. A manager who picks themselves goes through the manager-self route.
  - Approve/reject:
    - At a manager level: eligible managers of that level's department.
    - At any pending level: `HR_OFFICER` whose scope (`GetDepartmentUsersAsync` with HR elevation) contains the employee.
    - Nobody acts on their own leave.
  - Reject an already-accepted leave: unchanged (HR in scope).
- **Validation**: unchanged. That covers the decision number (required, trimmed, 1–100), dates, active employee, leave type, and no overlap with another non-rejected leave. Managers cannot change dates when approving; only HR can.
- **State model**
  - `Status`: New / Accepted / Rejected (unchanged values).
  - New `ApprovalStage` (nullable; set only while `Status = New`): `ManagerLevel1 = 1`, `ManagerLevel2 = 2`, `Hr = 3`.
  - Approve at a manager level → next stored level, or `Hr`.
  - Approve at `Hr`, or HR approves at any level → `Accepted`, stage cleared.
  - Reject → `Rejected`, stage cleared.
  - Editing a leave keeps its route. An on-behalf edit stays at HR, and a self-submitted leave can only be edited before the first approval, so its stage is unchanged.
- **Concurrency**: decisions run in the existing serializable transaction and re-check stage and eligibility inside it. The entity concurrency token turns a lost race into `409`.
- **Data**
  - `Lookup.Leave` gains:
    - `ApprovalStage` (int, nullable)
    - `SubmissionType` (int: `EmployeeSelf = 1`, `ManagerSelf = 2`, `OnBehalf = 3`)
    - `FkLevel1ApprovalDepartmentId` (nullable FK to Department)
    - `FkLevel2ApprovalDepartmentId` (nullable FK to Department)
  - New table `Lookup.LeaveApprovalAction`: `Id`, `FkLeaveId`, `Stage`, `FkDepartmentId` (nullable), `FkApproverId`, `IsApproved`, `ActionDate`, `Notes`, plus audit columns.
  - Migration backfill:
    - `New` → `ApprovalStage = 3`, `SubmissionType = 3` (they were all manager-filed).
    - Decided rows → `SubmissionType = 3`, stage NULL.
- **Dates**: `DateOnly` calendar dates, as today. `ActionDate` uses `ToAppTimeZone()` as `FinalizeLeaveDecisionAsync` already does.

## API contract intent

- Authoritative contract: this table until implementation, then the backend `handoff.md`. There is no OpenAPI artifact; the contracts are handwritten on both sides.

| Operation | Method/path | Request | Success | Failure keys | Access |
|---|---|---|---|---|---|
| Create leave | `POST /api/leaves` | `CreateLeaveRequest`; `fkEmployeeId` is now **optional**: omitted/null = the caller's own leave | `200 ApiResponse<LeaveModel>` | existing + `AUTH_UNAUTHORIZED_ACCESS` for a non-manager filing for someone else | **was** Manager → **now** any user (service enforces) |
| Update leave | `PUT /api/leaves` | `UpdateLeaveRequest` (unchanged) | `200 ApiResponse<LeaveModel>` | `LEAVE_ALREADY_DECIDED`, existing | **was** Manager → **now** any user (service enforces AC-11) |
| Delete leave | `DELETE /api/leaves/{id}` | — | `200` | `LEAVE_ALREADY_DECIDED`, existing | **was** Manager → **now** any user (service enforces AC-11) |
| HR list | `POST /api/leaves/GetWithPaging` | `LeaveFilterParams` + `approvalStage?` | paginated `LeaveModel` | — | HR (unchanged) |
| Manager approvals list (**new**) | `POST /api/leaves/GetApprovalsWithPaging` | `LeaveFilterParams` + `approvalStage?` | paginated `LeaveModel` | — | `DEPARTMENT_MANAGER` |
| Accept | `PUT /api/leaves/{id}/accept` | `AcceptLeaveRequest` (dates only honoured for HR; a non-HR caller sending dates → `INVALID_INPUT`) | `200 ApiResponse<LeaveModel>` | `LEAVE_ALREADY_DECIDED`, **new** `LEAVE_APPROVAL_NOT_ALLOWED`, `409` | **was** HR → **now** HR or Manager |
| Reject | `PUT /api/leaves/{id}/reject` | `RejectLeaveRequest` (unchanged) | `200 ApiResponse<LeaveModel>` | same as accept | **was** HR → **now** HR or Manager |
| My / created lists, exports, PDF | unchanged routes | unchanged | `LeaveModel` gains new fields; export status text shows the stage | — | unchanged |

`LeaveModel` additions (camelCase JSON; enums serialised as integers, as today):

- `approvalStage: number | null`
- `submissionType: number`
- `level1ApprovalDepartment` / `level2ApprovalDepartment: BaseLookupModel | null`
- `approvalActions: { stage, department, approver: {id,nameAr,nameEn}, isApproved, actionDate, notes }[]`
- `canEdit: boolean`, `canDelete: boolean`, `canAmendDates: boolean` (the caller's approval would be an HR decision)
- `canTakeAction` is now computed per stage (it was "is HR")

## Frontend behavior

- **Screens**
  - `views/features/leaves/my-leaves` gets a "New leave request" button that opens `LeavesAddEditPopupComponent` in self mode (no employee picker), plus edit/delete per `canEdit`/`canDelete`.
  - `other-leaves` keeps on-behalf create and drops the current user from the employee picker. Edit/delete follow the server flags.
  - `leaves-confirmations` opens to `DEPARTMENT_MANAGER`:
    - Managers get the tab "Awaiting my approval" (new endpoint).
    - HR keeps "HR confirmations" (existing endpoint).
    - A user with both roles sees both tabs.
    - The accept dialog shows date amendment only on the HR tab.
- **Status display**: `New` is shown as "Pending – direct manager / higher manager / HR", using `approvalStage` and `submissionType` (for a manager-self request, level 1 reads "supervisor"). `LeavesViewPopupComponent` shows the approval timeline. **Superseded 2026-10-21 (`leave-unified-list`): decisions are still recorded, but the API no longer returns the history and no popup shows it.**
- **Routes/menu**: `app.routes.ts` `leaves-confirmations` roles `[HR_OFFICER, DEPARTMENT_MANAGER]`; the sidebar item follows the route roles.
- **Errors**: the new message keys are added to `en.json` and `ar.json`, and the existing `httpErrorInterceptor` shows them.
- **Localization**: every new label exists in EN and AR, and RTL is checked. The department popup's one/two-level help text says the setting now covers both permissions and leave requests.

## Decisions and open questions

| Question | Evidence/options and impact | Resolution |
|---|---|---|
| Decision number for self-submitted requests | Today it is required at creation (`leave-decision-number` spec). | **Accepted 2026-10-20:** always required at submission, including employee self-requests. |
| Missing approver at a level | Permission flow never skips: the request waits, and HR can act at any stage (`PermissionHelper.CanUserTakeAction`). | **Accepted 2026-10-20:** follow the Permission behaviour, but skip structurally missing levels (no parent/grandparent). Vacant seats wait. HR can act at any stage, and HR approval is final. **Superseded 2026-10-21 (`leave-unified-list`): the chain is sequential; HR acts only once the leave reaches the HR stage.** |
| Requester edit/withdraw window | — | **Accepted 2026-10-20:** until the first approval. On-behalf requests stay editable by managers until HR decides. |
| Notifications | Only `LEAVE_RESULT` exists today. | **Accepted 2026-10-20:** notify the next level's approvers, and notify the employee on final approval or any rejection. Needs a new `LEAVE_PENDING_APPROVAL` notification type with EN/AR templates. |
| Which department's setting applies? | Permission uses the requester's department. | **Accepted 2026-10-20:** the requester's department D, for both self routes. |
| Acting (delegated) manager filing for themselves | Permission treats an active acting manager as a manager. | **Accepted 2026-10-20:** manager-self route (level 1 = P). |
| One person eligible at two levels (e.g. acting over D and P) | Permission allows it. | **Accepted 2026-10-20:** follow permissions. Allowed, and each approval is recorded separately. |
| HR officers and their own leave | User: "make it the same behavior as permissions". Permissions let HR officers submit their own requests like any employee and hide those requests from the HR list. | **Accepted 2026-10-20:** HR officers submit their own leave like any employee (through their managers, then another HR officer). Their own leave is hidden from their HR list and blocked on the server (AC-10). An HR officer who also manages a department may file for subordinates (on-behalf rules). |
| A manager editing an on-behalf leave filed for himself | Found in review: he could rewrite or withdraw a leave sitting at HR without his supervisor ever seeing it. | Accepted fix: on-behalf edits exclude the manager's own leave, including legacy rows he filed for himself. |
| A caller who is both the stage's eligible manager and HR in scope | Avoid HR approval silently skipping the higher-manager level. | Implementation choice: they act as the stage manager, so the request advances. The HR fallback (final approval) applies only when the caller is not the stage's manager. |
| Permission matrix docs | `PERMISSION_MATRIX.md` and `PERMISSION_MATRIX_TECHNICAL.md` were added at the workspace root; `PERMISSION_MATRIX_AR.md` is absent. | Update those two files plus `Business-Documents/02-…` and `04-…`. |

## Completion and rollout

- **Required checks**
  - Backend: `dotnet build`, `dotnet test Tests/Services.Tests`, with new tests for the route resolver, eligibility, transitions and concurrency. Review the migration script.
  - Frontend: `npm run build`.
  - Browser: one browser flow for each AC-14/AC-15 journey in EN and AR against a selected local DB.
- **Rollout**: apply the migration before deploying the frontend. Rollback drops the new columns/table and loses approval history. In-flight self-submitted leaves would then look like on-behalf leaves at HR.
- **Evidence**: `.planning/leave-approval-chain/progress.md`, then `Features/leave-approval-chain/handoff.md`.
