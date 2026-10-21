> Copy of `mjd-attend-back/Features/mission-approval-flow/spec.md` (2026-10-20, uncommitted backend working tree on `feature/mission-approval-flow`). The backend copy is authoritative.

# Feature: mission-approval-flow — HR approval stage, pre-decision edit/delete, creator department

## Status and ownership

- Status: accepted 2026-10-20 (design approved in Plan mode; not yet implemented)
- Owner: backend/frontend implementation agent
- Backend repository/revision: `mjd-attend-back` on `feature/mission-approval-flow` at `d3c2d503`. The working tree shows many modified files that appear to be line-ending-only and are unrelated to this feature.
- Frontend repository/revision: `mujdn-frontend` on `feature/mission-approval-flow` at `9fddacf0`.
- Accepted baseline: user request dated 2026-10-20 ("Mission Request Management" §4–6) plus the decisions recorded below.

> **Superseded in part by `Features/mission-unified-list/spec.md` (2026-10-21):** HR-created missions are no longer auto-approved (AC-02, journey step 6); the creator **and covering HR** may edit, delete and reassign (AC-04); an HR creator may decide their own mission (AC-05); `GetHrApprovalsWithPaging` and the HR approvals tab are replaced by the merged management list (AC-09).

## Goal and user journey

A work mission ("WorkMission" in code, UI at `/attendance/work-missions`) has no status today. It counts for attendance as soon as an employee is assigned to it, and its creator can edit or delete it at any time. This feature turns a mission into a request that HR decides:

1. A department manager or HR officer creates a mission. It is a **Draft**.
2. The creator assigns employees. As soon as the mission has at least one assignee, it is **forwarded to HR** and becomes **Pending HR approval**. The HR officers who cover the creator's department are notified.
3. While the mission is Draft or Pending, the creator can edit it, delete it, or change its assignees.
4. An HR officer approves it, or rejects it with notes.
   - **Approved:** the mission takes effect on attendance (affected days are reprocessed), the assignees are notified, and the creator is notified.
   - **Rejected:** the mission never affects attendance, and the creator is notified with the notes.
5. After the decision, the mission is locked: nobody can edit, delete or reassign it.
6. A mission created by an HR officer skips the HR stage. It is approved automatically when it is first assigned, and then locked.
7. Mission details (and the management lists) show the department the creator belonged to when the mission was created.

## Scope and exclusions

- In scope:
  - status lifecycle and transitions;
  - HR approve/reject endpoints and the HR approvals list;
  - creator-only and status-based locks on edit, delete and assign;
  - attendance processing restricted to approved missions;
  - creator-department snapshot;
  - notifications;
  - migration of existing missions;
  - status, decision and department display in lists, details, PDF and Excel;
  - English and Arabic text;
  - permission documentation.
- Out of scope:
  - more than one approval level (for example manager levels before HR);
  - HR changing the mission's content while approving;
  - re-opening or cancelling a decided mission;
  - approval deadlines or auto-rejection;
  - server-side enforcement of `Department.IsWorkMissionEnabled`;
  - the inherited-endpoint gaps of other controllers.
- Compatibility constraints:
  - Existing routes, the `ApiResponse` envelope, the attachment flow, the strict JSON contract (`UnmappedMemberHandling.Disallow`) and the `concurrencyUpdateVersion` round trip stay as they are.
  - Create and update request bodies are unchanged.
  - Existing missions keep their effect on attendance (they are backfilled as Approved).
  - `WorkMissionTypesEnum` values are unchanged.

## Definitions

- **Creator:** `WorkMission.CreationUserId`, set automatically from the `uid` claim.
- **Creator department:** the new `WorkMission.FkCreatorDepartmentId`, a snapshot of the creator's `UserProfile.FkDepartmentId` taken at creation. It is not updated if the creator later moves department.
- **HR covering a department X:** a user whose effective roles include `HR_OFFICER` and whose department scope contains X. The scope comes from `IUserProfileHelper.GetDepartmentIdsAsync(profile)`, which applies the one-level HR elevation, adds active temporary departments, and returns every department for an organisation-wide scope. The recipient lookup (`GetHrOfficerIdsCoveringAsync`, today private in `LeaveService`) is the exact inverse, so the HR officers who are notified are the same set that may decide.
- **HR-created mission:** a mission whose creator holds `HR_OFFICER` in their effective roles (`IUserProfileHelper.IsHrOfficerAsync(creator.FkUserId)`) at the moment it is forwarded, i.e. its first assignment.

## Status lifecycle

`WorkMissionStatusEnum { Draft = 1, PendingHrApproval = 2, Approved = 3, Rejected = 4 }`. The SQL hard-codes `Approved = 3`.

| From | Event | To | Side effects |
|---|---|---|---|
| (new) | Create | Draft | Snapshot the creator department |
| Draft | Assignment saved with ≥1 assignee, creator is not HR | PendingHrApproval | Notify covering HR (`MISSION_PENDING_HR_APPROVAL`), excluding the creator |
| Draft | Assignment saved with ≥1 assignee, creator is HR | Approved | `IsAutoApproved = true`; decision user = creator; decision date = now; attendance reprocessed; assignees notified (`ASSIGN_TASK`) |
| PendingHrApproval | Assignment saved with 0 assignees | Draft | None. The mission leaves the HR list. |
| PendingHrApproval | HR approves | Approved | Decision user and date; attendance reprocessed; assignees notified (`ASSIGN_TASK`); creator notified (`MISSION_HR_DECISION`) |
| PendingHrApproval | HR rejects with notes | Rejected | Decision user, date and notes; creator notified (`MISSION_HR_DECISION`) |
| Approved / Rejected | Any edit, delete or assignment | — | Refused with `WORK_MISSION_ALREADY_DECIDED` |

## Acceptance criteria

| ID | Given / When / Then | Verification approach |
|---|---|---|
| AC-01 | Given a DM creates a mission, it is `Draft` and stores the creator's current department. When the creator saves an assignment with ≥1 employee, it becomes `PendingHrApproval`, and every covering HR officer except the creator gets `MISSION_PENDING_HR_APPROVAL`. | Service test with a fake notification service |
| AC-02 | Given an HR officer creates a mission, when they first save ≥1 assignee, it becomes `Approved` with `IsAutoApproved = true` and decision user = creator, and the assignees get `ASSIGN_TASK`. | Service test |
| AC-03 | Given a `PendingHrApproval` mission, when the creator removes every assignee, it returns to `Draft`. | Service test |
| AC-04 | Only the creator can edit, delete or change the assignees of a mission, and only while it is `Draft` or `PendingHrApproval`. A non-creator gets `400 CAN_NOT_TAKE_ACTION`; a decided mission returns `400 WORK_MISSION_ALREADY_DECIDED`. The UI shows Edit, Delete and Assign from the server flags `canEdit`, `canDelete` and `canAssign`. | Service test; UI check |
| AC-05 | Only an HR officer covering the creator department, who is neither the creator nor an assignee, can approve or reject a `PendingHrApproval` mission. Anyone else gets `400 WORK_MISSION_APPROVAL_NOT_ALLOWED`. A mission that is not pending returns `WORK_MISSION_ALREADY_DECIDED`. The buttons follow server `canTakeAction`. | Service test; API check |
| AC-06 | Rejection requires trimmed notes of 1–500 characters (otherwise a 400 validation error). The decision is stored (who, when, notes), and the creator gets `MISSION_HR_DECISION`. On approval the assignees also get `ASSIGN_TASK`. Assignees are **not** notified at assignment time. | Service test |
| AC-07 | Attendance only counts `Approved` missions. `Processing_Missions` ignores other statuses. The assignment insert/delete triggers and the date trigger enqueue reprocessing only for approved missions. Approval enqueues `NeedReprocessingLog` and `MonthlyGraceRecomputeQueue` rows for all assignees over the mission range, clamped to today. Presence-inquiry exclusion counts approved missions only. | SQL review; test-DB check |
| AC-08 | "My missions", its creators lookup and its PDF show approved missions only. An assignee can open a mission or its attachments only once it is approved. Overlap-conflict checks ignore `Rejected` missions. | Service test |
| AC-09 | The HR approvals list (HR only) shows non-Draft missions whose creator department is in the caller's HR scope, with a status filter (default Pending in the UI). It sorts pending first, then newest. | Service test; browser flow |
| AC-10 | The mission details, department grid, HR list, Excel and PDF show the creator department (snapshot), status, and decision info (decided by, date, auto-approved, rejection notes). | Browser flow (EN and AR) |
| AC-11 | After the migration, every existing mission is `Approved` with its creator department backfilled from the creator's current department (null if the creator is null). The migration itself queues no reprocessing, and attendance output is unchanged. | Migration review; test-DB check |
| AC-12 | Concurrent HR decision versus a creator edit, delete or reassignment: one succeeds, and the other gets `409 RECORD_MODIFIED_BY_ANOTHER_USER` or `WORK_MISSION_ALREADY_DECIDED`. | Service test (serializable transaction plus concurrency token); review |
| AC-13 | Inherited unscoped endpoints `GET /api/WorkMission`, `GET /api/WorkMission/{id}`, `GET lookup` and `POST GetWithPagingSP` are no longer reachable. | API check / controller review |

## Business rules and permissions

- **Roles, ownership and data scope**
  - Create: `DEPARTMENT_MANAGER` or `HR_OFFICER` (unchanged).
  - Edit, delete and assign: the creator only, while the mission is Draft or Pending. The assignment scope rules in `AddUsersToMission` are unchanged: the HR elevated scope minus the root manager, and for DMs their scope minus the main managers of temporary departments and their own actual manager. Before this feature, any DM or HR in scope could reassign any visible mission.
  - Approve and reject: `HR_OFFICER` covering the creator department; never the creator or an assignee.
  - HR approvals list: `HR_OFFICER`, scoped by creator department.
  - Department grid (`GetWithPaging`): unchanged scope (missions with an assignee or creator in scope). It now includes all statuses.
  - My missions: `EMPLOYEE`, approved only.
  - Mission view, PDF and attachments: an assignee (approved only), the creator, a DM or HR whose user scope contains the creator or an assignee (existing rule), or HR covering the creator department.
- **Validation and state transitions:** see the status lifecycle. Rejection notes are trimmed and must be 1–500 characters. Approve takes no body.
- **Duplicates, retries and concurrency**
  - Assignment, approve and reject each run in a serializable transaction. A deadlock or concurrency failure maps to `409 RECORD_MODIFIED_BY_ANOTHER_USER`, and the status is re-checked inside the transaction.
  - An assignment that changes status updates the mission row, so the rowversion changes. The client must reload before its next edit.
  - Notifications are created inside the transaction and delivered after commit.
- **Data relationships, retention and migration**
  - New columns on `Business.WorkMission`:
    - `Status int NOT NULL` (default 1)
    - `FkCreatorDepartmentId int NULL` (FK to `Lookup.Department`, Restrict)
    - `FkHrDecisionUserId int NULL` (FK to `Login.UserProfile`, Restrict)
    - `HrDecisionDate datetime2 NULL`
    - `RejectionNotes nvarchar(500) NULL`
    - `IsAutoApproved bit NOT NULL` (default 0)
  - Index on `(Status, FkCreatorDepartmentId)`.
  - Restrict on the department FK means a department that has missions cannot be deleted.
  - The migration backfills `Status = 3` and the creator department. Its timestamp is earlier than the SQL trigger migration, so the backfill fires no approval trigger.
  - New notification types: `MISSION_PENDING_HR_APPROVAL = 12` and `MISSION_HR_DECISION = 13`.
- **Date and time semantics:** mission dates are calendar `DateOnly` (unchanged). `HrDecisionDate` is the app-local time zone (`DateTime.UtcNow.ToAppTimeZone()`), as in Leave `ActionDate`. Reprocessing ranges are clamped to the app-local "today".

## API contract intent

- Authoritative contract: this table until `Features/mission-approval-flow/handoff.md` records the implemented revision.
- Envelope: `ApiResponse<T>` (`data`, `error{messageKey,message,details}`). Paging returns `PaginatedResult` (`list`, `paginationInfo`). Enums serialize as integers.

| Operation | Method/path | Request | Success | Failure keys | Access |
|---|---|---|---|---|---|
| Create (unchanged body) | `POST api/WorkMission` | `CreateWorkMissionRequest` | `WorkMissionModel`, `status = 1` | validation | DM, HR |
| Update (unchanged body) | `PUT api/WorkMission` | `UpdateWorkMissionRequest` | `WorkMissionModel` | `CAN_NOT_TAKE_ACTION`, `WORK_MISSION_ALREADY_DECIDED`, `RECORD_MODIFIED_BY_ANOTHER_USER` | DM, HR + creator |
| Delete | `DELETE api/WorkMission/{id}` | — | empty | same as update, plus `NOT_FOUND` | creator |
| Assign | `POST api/WorkMission/AddUsersToMission` | `MissionEmployeesAssignmentDto` (unchanged) | `WorkMissionAssignmentResultDto { conflictingUserIds, status }` (**new** `status`) | `CAN_NOT_TAKE_ACTION`, `NOT_FOUND`, `WORK_MISSION_ALREADY_DECIDED`, `WORK_MISSION_ALL_USERS_CONFLICT`, 409 | DM, HR + creator |
| Approve (**new**) | `PUT api/WorkMission/{id}/approve` | no body | `WorkMissionModel` | `WORK_MISSION_APPROVAL_NOT_ALLOWED`, `WORK_MISSION_ALREADY_DECIDED`, `NOT_FOUND`, 409 | HR covering |
| Reject (**new**) | `PUT api/WorkMission/{id}/reject` | `{ rejectionNotes: string(1..500) }` | `WorkMissionModel` | same as approve, plus validation | HR covering |
| HR approvals list (**new**) | `POST api/WorkMission/GetHrApprovalsWithPaging` | query: paging; body: `WorkMissionFilterParams` (names, dates, type, `missionStatus`) | `PaginatedResult<WorkMissionModel>` | — | HR |
| Department grid | `POST api/WorkMission/GetWithPaging` | adds optional `missionStatus` filter | rows carry the new fields | — | DM, HR (**new** role gate; it was open to any logged-in user) |
| Inherited `GET /`, `GET {id}`, `GET lookup`, `POST GetWithPagingSP` | — | — | **removed** (`[NonAction]`) | — | — |

New `WorkMissionModel` fields (response only; never sent back):

| Field | Type | Notes |
|---|---|---|
| `status` | int enum | |
| `creatorDepartment` | `{id, nameAr, nameEn}` or null | |
| `hrDecisionBy` | `{id, nameAr, nameEn}` or null | |
| `hrDecisionDate` | datetime or null | |
| `rejectionNotes` | string or null | |
| `isAutoApproved` | bool | |
| `canEdit`, `canDelete`, `canAssign`, `canTakeAction` | bool | Computed for the caller |

`isMissionCreator` stays for compatibility.

## Frontend behavior

- **Screens and routes:** unchanged route `/attendance/work-missions` (`work-mission-container`).
  - New tab **HR approvals**, visible when `authService.isHROfficer`, independent of `isWorkMissionEnabled`.
  - The "All missions" tab gains a status column and filter and a creator-department column.
  - "My missions" is unchanged apart from the approved-only data.
- **Row actions:**
  - Edit and Delete appear when `canEdit` / `canDelete`.
  - "Assign employees" appears when `canAssign`.
  - View is always available.
  - "Take action" (HR list) appears when `canTakeAction`.
- **Assign popup:** after saving, shows "Sent to HR for approval", "Approved automatically" or "Back to draft" based on `result.status`, and reloads the list.
- **Details popup** (`view-mission-data-popup`):
  - creator name with creator department;
  - status badge;
  - decision block (decided by, date, auto-approved, rejection notes);
  - Approve and Reject buttons when `canTakeAction`.
  - Reject opens the generalized `leaves-reject-popup` with mission title and confirm keys and required notes (maximum 500, no whitespace-only notes).
- **Errors:** `httpErrorInterceptor` maps the new error keys to text in `en.json` and `ar.json`.
- **Localization:** all new text in both languages under `WORK_MISSIONS.*`, with an RTL check.

## Decisions and open questions

| Question or proposed change | Evidence/options and impact | Resolution/owner |
|---|---|---|
| Attendance effect while pending | Immediate, or approved only | **Accepted:** approved only (user, 2026-10-20) |
| Forwarding trigger | Automatic at first assignment, or an explicit "send" action | **Accepted:** automatic |
| Approvers | HR covering the creator department, or Super HR only | **Accepted:** HR covering the creator department; no self-decision (*superseded by mission-unified-list: an HR creator may decide*); also no decision by an assignee (same rule as Leave L980) |
| HR-created missions | HR stage or auto-approve | **Accepted:** auto-approved at first assignment, then locked like any approved mission. *Superseded by mission-unified-list: pending like any mission.* |
| Who may reassign while pending | Today any DM or HR in scope | **Accepted:** creator only. *Superseded by mission-unified-list: creator or covering HR.* |
| Assignee notification timing | At assignment, or at approval | **Accepted:** at approval |
| Creator department source | Snapshot, or current | **Accepted:** snapshot at creation, existing rows backfilled |
| Existing missions | Backfill as Approved, or leave as Draft | **Accepted:** Approved. Consequence: they become locked. |
| Shared HR-coverage lookup | Duplicate it in `WorkMissionService`, or extract it | **Accepted:** extract into `IHrOfficerCoverageService`, used by `LeaveService` and `WorkMissionService` |
| `PERMISSION_MATRIX_AR.md` | Listed in the workspace `CLAUDE.md` but absent from disk | Update the English matrices only; report the gap |

## Completion and rollout

- **Required checks:**
  - `dotnet build MJD_Attendance_Backend.sln`
  - `dotnet test Tests/Services.Tests/Services.Tests.csproj` (new `WorkMissionApprovalFlowTests`, plus the existing lookup and leave tests after the constructor changes)
  - review of the generated migration and SQL
  - on a selected test database only: migration backfill, reprocessing rows after approval, and that a pending mission does not set `AttendanceReport.MissionId`
  - frontend `npm run build` and `npm test`
  - browser flow in EN and AR (see the task plan).
- **Rollout and rollback:**
  - Apply the Tables migration before the SQL migration (timestamp order).
  - **SQL objects** (`Sql/processing/Processing_Missions.sql`, `Sql/triggers/UserProfileWorkMissions_After{Insert,Delete}.sql`, `Sql/triggers/WorkMission_DatesUpdate.sql`) are edited in `Sql/` only. The user writes their migrations (decision 2026-10-20). That migration must be timestamped after `20261020131156_AddWorkMissionHrApproval`.
  - Rolling back the SQL migration restores the previous SP and trigger bodies.
  - Rolling back the Tables migration drops the columns and notification types.
  - Decisions made in the meantime would be lost, and pending missions would count for attendance again.
- **Evidence location:** `.planning/2026-10-20-mission-approval-flow/progress.md` (working state) and `Features/mission-approval-flow/handoff.md` (durable).
