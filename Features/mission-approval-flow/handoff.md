> Copy of `mjd-attend-back/Features/mission-approval-flow/handoff.md` (2026-10-20, uncommitted backend working tree on `feature/mission-approval-flow`). The backend copy is authoritative.

# Handoff: mission-approval-flow

## Versions and state

- Updated/owner: 2026-10-20, coordinating agent
- Accepted specification: `mjd-attend-back/Features/mission-approval-flow/spec.md` (accepted 2026-10-20)
- Backend branch/commit: `feature/mission-approval-flow` on top of `d3c2d503`. **All feature changes are uncommitted.**
- Frontend branch/commit: `feature/mission-approval-flow` @ `9fddacf0` (not started)
- Contract artifact: this file plus the spec's API table. No OpenAPI export exists in this repository.
- Contract produced from: the uncommitted backend working tree (built with `dotnet build -c Release`)
- Overall state:
  - Backend is implemented and service-tested (91/91, including 16 new mission workflow tests).
  - **SQL objects are edited in `Sql/` only.** Their migration is still to be written by the user.
  - Runtime checks against a database have not been run.

## Implemented behavior

| Criterion | API operation/contract reference | Status and evidence | Frontend work remaining |
|---|---|---|---|
| AC-01 | `POST api/WorkMission`, `POST api/WorkMission/AddUsersToMission` | implemented; `WorkMissionApprovalFlowTests.Create_*`, `FirstAssignment_ByManager_*` | show status and the "sent to HR" toast from `result.status` |
| AC-02 | `POST AddUsersToMission` | implemented; `FirstAssignment_ByHrCreator_IsAutoApproved_*` | "approved automatically" toast; auto-approved label in details |
| AC-03 | `POST AddUsersToMission` | implemented; `RemovingEveryAssignee_*` | "back to draft" toast |
| AC-04 | `PUT`, `DELETE {id}`, `POST AddUsersToMission` | implemented; `Creator_CanEditAndDeleteWhilePending`, `NonCreator_*`, `CoveringHr_Approves_LocksMission_*` | drive Edit/Delete/Assign from `canEdit`/`canDelete`/`canAssign` |
| AC-05 | `PUT {id}/approve`, `PUT {id}/reject` | implemented; `OnlyCoveringHrWhoIsNotInvolved_CanDecide`, `DraftMission_CannotBeDecided` | approve/reject buttons from `canTakeAction` |
| AC-06 | `PUT {id}/reject` | implemented; `Reject_*`, `CoveringHr_Approves_*` | reject dialog with notes (1–500, not blank) |
| AC-07 | SQL in `Sql/`; `UsersAvailableForPresenceInquiryHelper` | implemented (SQL not deployed); C# filter covered by review only | none |
| AC-08 | `GetMyWorkMissionsAsync`, `my-mission-creators-lookup`, `ExportMyMissionsPdf`, attachment and PDF access | implemented; `Lists_*`, `WorkMissionCreatorLookupTests` | none (data changes only) |
| AC-09 | `POST GetHrApprovalsWithPaging` | implemented; `Lists_*`, `StatusFilter_NarrowsHrList` | new HR approvals tab |
| AC-10 | all list/detail responses; `ExportPdf`, `ExportMissionPdf` | implemented (PDF not rendered in a test) | creator department and decision block in details; status and department columns |
| AC-11 | migration `20261020131156_AddWorkMissionHrApproval` | written and reviewed; not applied | none |
| AC-12 | serializable transactions; 409 mapping | implemented; not testable on InMemory | handle 409 by reloading the list |
| AC-13 | `[NonAction]` on inherited `GET /`, `GET {id}`, `GET lookup`, `POST GetWithPagingSP` | implemented; frontend grep found no callers | none |

## Integration details

- **Authentication:** unchanged cookie JWT; `withCredentials`.
- **Roles, ownership and denials**
  - Edit, delete and assign: DM or HR role, **and** caller is the creator, **and** status is Draft (1) or PendingHrApproval (2).
  - Approve, reject and HR list: `HR_OFFICER`. The service also requires the creator department to be in the caller's HR scope, and the caller to be neither the creator nor an assignee.
- **New error keys** (add text to `en.json` and `ar.json`):
  - `WORK_MISSION_ALREADY_DECIDED`: edit, delete, assign or decide after a decision.
  - `WORK_MISSION_APPROVAL_NOT_ALLOWED`: not a covering HR officer, or the creator, an assignee, or a Draft mission.
- **Existing error keys** you may now see on these calls: `CAN_NOT_TAKE_ACTION` (not the creator), `INVALID_INPUT` (blank notes), `NOT_FOUND`, `RECORD_MODIFIED_BY_ANOTHER_USER` (409).
- **Enum `WorkMissionStatusEnum`** (integers): `1 Draft`, `2 PendingHrApproval`, `3 Approved`, `4 Rejected`.
- **New `WorkMissionModel` response fields** (never send them back; create and update payloads are unchanged, and the API rejects unknown members):

  | Field | Type |
  |---|---|
  | `status` | int |
  | `creatorDepartment` | `{id, nameAr, nameEn}` or null |
  | `hrDecisionBy` | `{id, nameAr, nameEn}` or null |
  | `hrDecisionDate` | ISO datetime, app-local, no offset; or null |
  | `rejectionNotes` | string or null |
  | `isAutoApproved` | bool |
  | `canEdit`, `canDelete`, `canAssign`, `canTakeAction` | bool |

  - The department grid and HR list fill every field.
  - "My missions" fills status, department and decision, with all `can*` false.
  - `isMissionCreator` is unchanged.
- **`WorkMissionAssignmentResultDto`:** `{ conflictingUserIds: number[], status: int }`. `status` is the mission's status after the save.
- **Requests**
  - `PUT api/WorkMission/{id}/approve`: no body.
  - `PUT api/WorkMission/{id}/reject`: body `{ "rejectionNotes": "..." }`.
  - Both return `ApiResponse<WorkMissionModel>`.
  - `POST api/WorkMission/GetHrApprovalsWithPaging?pageNumber&pageSize&orderBy&sortDir`, body `WorkMissionFilterParams` (`nameAr`, `nameEn`, `workMissionType`, `startDate`, `endDate`, `missionStatus`). Returns `ApiResponse<PaginatedResult<WorkMissionModel>>`.
  - Default HR list order: pending first, then newest created. An explicit `orderBy` replaces it.
- **Department grid:** `POST GetWithPaging` also accepts optional `missionStatus`, and is now limited to DM and HR (it returns every status with HR decision details).
- **Concurrency:**
  - Edit, delete, assign, approve and reject each take an update lock on the mission row inside their serializable transaction, so they queue instead of deadlocking.
  - The second request sees `WORK_MISSION_ALREADY_DECIDED` or a 409.
  - Approve/reject carry no row version, so HR decides the mission as it currently is.
- Assigning employees can change the mission row (when its status changes), so its `concurrencyUpdateVersion` changes. Reload the list after the assign popup closes before allowing another edit.
- **Files:** `ExportMissionPdf` and the department `ExportPdf` now include creator department and status. There are no other format changes.

## Frontend scope

- **Screens:** `src/views/features/outside-mission/` under route `/attendance/work-missions` (`work-mission-container`).
  - Add a status column, a status filter and a creator-department column to `assign-work-mission-list`. Drive its actions from the server flags.
  - Add the creator department, a status badge and a decision block to `view-mission-data-popup`. Add Approve/Reject buttons there when `canTakeAction`.
  - New HR approvals tab, visible when `authService.isHROfficer`, independent of `isWorkMissionEnabled`.
- **Patterns to reuse:**
  - `src/views/features/leaves-confirmations/` (HR list)
  - `src/views/features/leaves/leaves-reject-popup/` (generalize its title and confirm keys)
  - `src/utils/leave-status.ts` (badges)
  - `leave.service.ts` accept/reject calls
- **States:**
  - Reload the list after approve, reject or assign.
  - A 409 shows the existing conflict message and reloads.
  - An empty HR list shows the standard empty state.
- **Localization:** add all new text to `en.json` and `ar.json` (statuses, tab, actions, notes, department, decision labels, toasts, the two error keys). Check RTL.
- **Client generation:** none. The service, model, interceptor and endpoints are handwritten.

## Run and verify

- **Backend:**
  - `dotnet build MJD_Attendance_Backend.sln -c Release`. A Debug build is currently blocked because the running `WebApi.exe` on Windows locks `WebApi/bin/Debug`.
  - `dotnet test Tests/Services.Tests/Services.Tests.csproj -c Release`
  - Starting the API migrates the DB and runs hosted services, so use a selected test database only.
- **Database:**
  - Apply `20261020131156_AddWorkMissionHrApproval`.
  - Then the user's SQL migration for `Processing_Missions` and the three triggers.
  - Order matters: the backfill must run before the new `trg_WorkMission_DatesUpdate`.
  - **Deploy both together.** Between them, the old assignment trigger still queues reprocessing when a mission is merely pending, and the old date trigger ignores approvals.
  - `Sql/processing/Processing_Missions.sql` ends with `GO`; strip it if the body goes into `migrationBuilder.Sql`.
- **Test data:**
  - a DM with employees in their department;
  - an HR officer whose elevated scope covers that department;
  - a second HR officer outside it.
- **Checks already run:** see `.planning/2026-10-20-mission-approval-flow/progress.md`.
- **Still required against the actual API:**
  - the backfill result (all `Status = 3`, departments filled);
  - approve → `NeedReprocessingLog` rows for the assignees, and attendance shows the mission after reprocessing;
  - a pending mission leaves `AttendanceReport.MissionId` empty;
  - the browser flow in EN and AR.

## Open decisions and next action

- **Review (2026-10-20):** an independent review found no blocking defects. Its confirmed findings were fixed:
  - edit/delete deadlock mapping and row lock;
  - the department grid role gate;
  - popup error handling;
  - attachments in the decision response;
  - the `Status` column default of 1;
  - status toasts only when the status changes.
- **Known gaps or incompatible changes:**
  - Existing missions become Approved and therefore locked.
  - Reassignment is now creator-only.
  - Assignees are no longer notified at assignment time.
  - The inherited `GET` endpoints are removed.
  - `PERMISSION_MATRIX_AR.md` does not exist in the workspace.
  - `ProcessingLogFilterParams` inherits the new `missionStatus` filter. A client sending it to `ProcessingLog/GetWithPagingSP` would pass an unknown SP parameter; no client sends it today.
- **Required decisions:** none open.
- **Next task:** frontend T08 (data layer plus the department tab), then T09 (details, HR tab, reject dialog, i18n).
