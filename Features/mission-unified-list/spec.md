> Copy of `mjd-attend-back/Features/mission-unified-list/spec.md` (2026-10-21). The backend copy is authoritative.

# Feature: mission-unified-list — two mission tabs, HR missions need a decision, covering HR can edit

## Status and ownership

- Status: accepted 2026-10-21 (design approved in Plan mode)
- Builds on: `Features/mission-approval-flow/spec.md`. Where the two specs disagree, this one wins.
- Backend: `mjd-attend-back` on `feature/mission-unified-list`, branched from `feature/mission-approval-flow` at `037ac704`.
- Frontend: `mujdn-frontend` on `feature/mission-unified-list`, branched from `feature/mission-approval-flow` at `09a2df65`.
- UI reference: `mission-screen-shot.png` in the workspace root.

## Goal and user journey

1. The work-missions screen has two tabs:
   - **My missions**: approved missions the user is assigned to (unchanged).
   - **My following employees' missions**: for HR and managers. This one tab replaces the former "All missions" and "HR approvals" tabs.
2. A manager or an HR officer creates a mission. It is **New** (Draft), and its row shows **Assign employees**.
3. Assigning employees sends the mission to **Pending approval**, even when an HR officer created it. There is no auto-approval any more. The row now shows **Take action** in place of "Assign employees", for those who can decide.
4. While the mission is New or Pending, the **creator** and any **HR officer covering the creator's department** can edit it, change its assignment, or delete it. These actions sit in the row's ⋮ menu.
5. A covering HR officer approves or rejects the mission (with notes). An HR creator may decide their own mission.
6. After the decision, nobody can edit, reassign or delete the mission.

## Changes against mission-approval-flow

| mission-approval-flow rule | New rule |
|---|---|
| A mission created by HR is auto-approved at its first assignment | It goes to `PendingHrApproval` like any other mission |
| Edit, delete and assign: creator only | Creator **or** covering HR (`IsCoveringHr`), while Draft or Pending |
| Approve and reject: covering HR who is neither the creator nor an assignee | Covering HR who is not an assignee. The creator may decide. |
| Separate HR approvals list (`GetHrApprovalsWithPaging`) | Removed. `GetWithPaging` also returns, for HR, every mission whose creator department is in the HR scope. |
| Department grid sorted by start date, newest first | Sorted by creation date, newest first, when no column sort is given |
| `DELETE api/WorkMission/{id}` had no role gate (service check only) | `DepartmentManager` or `HROfficer`, plus the service check |

Unchanged:
- statuses and their numeric values;
- request and response shapes;
- the attendance effect (approved missions only);
- the assignment scope rules;
- the "My missions" data;
- the attachment flow.

## Acceptance criteria

| ID | Given / When / Then | Verification |
|---|---|---|
| UL-01 | An HR officer creates a mission and assigns employees. It becomes `PendingHrApproval` with `IsAutoApproved = false`. The other covering HR officers get `MISSION_PENDING_HR_APPROVAL`; the creator and whoever forwarded the mission do not. | `FirstAssignment_ByHrCreator_GoesPending_AndNotifiesOtherCoveringHr` |
| UL-02 | The HR creator can approve or reject their own pending mission. After that it is locked. A creator who decides their own mission gets no `MISSION_HR_DECISION` notification. | `HrCreator_CanApproveOwnMission_ThenItIsLocked` |
| UL-03 | A covering HR officer can edit, reassign and delete a manager's New or Pending mission. A non-creator manager and a non-covering HR officer get `CAN_NOT_TAKE_ACTION`. | `CoveringHr_CanEditReassignAndDelete_PendingManagerMission`, `NonCreatorOutsideHrCoverage_*` |
| UL-04 | A covering HR officer who removes every assignee returns the mission to Draft. Forwarding it again does not notify the HR officer who forwarded it. | `CoveringHr_RemovingEveryAssignee_*` |
| UL-05 | For HR, `GetWithPaging` also lists New and Pending missions from the covered departments, newest first. Its flags are `canEdit/canDelete/canAssign = open && (creator or covering HR)` and `canTakeAction = pending && covering HR && not an assignee`. | `Lists_ShowStatusDepartmentAndPerCallerActions`, `StatusFilter_NarrowsManagementList` |
| UL-06 | An HR officer who can reassign a mission sees all of its assignees in the row, so the "Edit assignment" popup cannot drop people silently. A manager still sees only the assignees in their own scope. | Code review (`ToDepartmentModel`) |
| UL-07 | The UI shows two tabs. Each row has View, one main action ("Assign employees" when New and `canAssign`, "Take action" when Pending and `canTakeAction`), and a ⋮ menu with Edit mission, Download file, Edit assignment and Delete mission, each gated by its server flag. | Browser, EN and AR |

## Decisions

| Question | Resolution (user, 2026-10-21) |
|---|---|
| Who decides an HR-created mission | The HR creator and any covering HR officer. Assignees never decide. |
| Who edits or reassigns while New or Pending | The creator and covering HR |
| Who deletes | Same as edit |
| Existing auto-approved missions | Stay Approved. No migration. |
| "تحميل الملف" menu item | Download the mission PDF. It replaces the per-row green PDF button. |
| Header PDF export | Kept next to Excel |

## Known limitations

- `AddUsersToMission` still checks the requested employees against the caller's scope before checking permission. A caller outside the mission's scope who sends employees therefore gets `AUTH_FORBIDDEN_ACTION` rather than `CAN_NOT_TAKE_ACTION`. This order existed before this feature and is kept.
- Nobody is notified when a covering HR officer edits a manager's pending mission.
- `PERMISSION_MATRIX_AR.md` does not exist in the workspace, so only the English matrices are updated.
