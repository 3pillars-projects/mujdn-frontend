# Feature: leave-unified-list — decide leaves from the following-employees tab

## Status and ownership

- Status: accepted 2026-10-21 (user request: remove the "Leave Requests Approval" screen and move its logic into "Leave Requests")
- Builds on: `Features/leave-approval-chain/spec.md`. Where the two disagree, this one wins.
- Backend: `mjd-attend-back` on `feature/leave-unified-list`, branched from `feature/mission-unified-list` at `b9eb29b8`.
- Frontend: `mujdn-frontend` on `feature/leave-unified-list`, branched from `feature/mission-unified-list` at `e7583b08`.
- Same pattern as `Features/mission-unified-list` (one management list instead of separate approval lists).

## Goal and user journey

1. The "Leave Requests Approval" screen (`/attendance/leaves-confirmations`) and its menu item are removed.
2. The Leave Requests screen keeps two tabs:
   - **My Requests**: unchanged.
   - **Subordinate Employees' Leave Requests** (the following-employees tab): now shown to department managers **and** HR officers.
3. Each row in that tab shows **Take action** when the server says the caller can decide it (`canTakeAction`). It opens the existing take-action popup (approve / reject; dates editable only for an HR decision).
4. A department manager sees the requests of the employees he follows, and decides the ones waiting at his approval level.
5. An HR officer sees every request in his HR scope (except his own), but decides one only once it reaches the HR stage, after every manager level has approved it.

## Rules

| Before | Now |
|---|---|
| HR list: `POST api/leaves/GetWithPaging` (HR scope minus own) | Removed. Part of `GetMyCreatedLeavesWithPaging`. |
| Manager approvals list: `POST api/leaves/GetApprovalsWithPaging` | Removed. Part of `GetMyCreatedLeavesWithPaging`. |
| `POST api/leaves/ExportDepartmentLeavesPdf` (HR) | Removed. `ExportMyCreatedLeavesPdf` exports the merged list. |
| `GetMyCreatedLeavesWithPaging` / `ExportMyCreatedLeavesPdf`: DM only, subtree minus peer managers | DM **or HR**. Rows = union of: DM subtree minus peer managers (own leaves included); leaves waiting at a manager level the DM decides; HR scope minus own leave; any leave the caller decided. |
| Following-employees tab: DM only | DM or HR. "Add new leave" (on behalf) stays DM only. |
| HR in scope could approve or reject at any stage, and that approval was final (HR fallback) | **Sequential.** While a leave waits at a manager level, only that level's managers decide it. HR approves or rejects only at the HR stage. A user who is both DM and HR gets no shortcut at another manager's level. HR can still reject an accepted leave. |
| A level with no eligible manager waited, and HR could act on it | It waits until a manager is assigned or delegated (`TemporaryRoleAssignment`) for that department. Nobody else can move it. |

Unchanged:
- approval routing and stages, who decides at a manager level, date amendment (HR only), notifications;
- `canTakeAction`, `canEdit`, `canDelete`, `canAmendDates` meanings;
- the accept / reject / create / update / delete endpoints and request shapes;
- `GET api/leaves/employees-lookup` (DM only);
- the per-leave PDF download rule in the UI (department managers, accepted leaves only).

## Acceptance criteria

| ID | Given / When / Then | Verification |
|---|---|---|
| UL-01 | The level-1 manager sees an employee's pending leave in the following-employees list with `canTakeAction`; the level-2 manager sees it without the action until level 1 approves. | `FollowingList_ShowsScopeToManagers_AndHrScopeWithoutOwnLeaveToHr` |
| UL-02 | An HR officer sees every leave in HR scope except his own. `canTakeAction` and `canAmendDates` are true only once the leave is at the HR stage. | same test, `CanAmendDates_OnlyWhenTheCallerWouldDecideAsHr` |
| UL-03 | A manager sees a leave waiting at a level he decides even when the employee is outside his department tree, and keeps seeing it after he decides. | `FollowingList_ShowsALeaveWaitingForTheManager_EvenOutsideHisScope` |
| UL-04 | A user who is both DM and HR sees both scopes in one list. He decides as stage manager where he is one (no date change), and as HR only at the HR stage. His own leave is listed but not decidable. | `FollowingList_DualRole_SeesManagerScopeAndHrScope` |
| UL-07 | HR cannot approve or reject a leave waiting at manager level 1 or 2 (`LEAVE_APPROVAL_NOT_ALLOWED`); after the last manager approves, HR can. | `Hr_CannotDecideBeforeTheManagers_OnlyAtTheHrStage`, `HrInScope_CannotDecideWhileTheLeaveWaitsForAManager`, `HrWhoManagesOnlyTheFirstLevel_CannotDecideTheSecondLevel` |
| UL-05 | A temporary manager over the parent department sees the child department's leaves but cannot decide level 1. | `Delegate_DecidesOnlyTheDepartmentHeCovers_NotHisHomeDepartment` |
| UL-06 | The UI has no Leave Requests Approval screen or menu item; the old URL redirects to Leave Requests. HR officers see the following-employees tab without "Add new leave". Rows show "Take action" by `canTakeAction`. | Browser, EN and AR |

## Known limitations

- No approval deadline or auto-skip: a leave whose level has no eligible manager waits until one is assigned or delegated. Leaves already waiting at a manager level when this ships are affected the same way.

- A manager who decides a level whose department is outside his own department tree (rare: official manager of a sibling department) sees the row, but the attachment download and per-leave PDF still use the old scope checks and refuse it. This was already true on the removed approvals screen.
- `PERMISSION_MATRIX_AR.md` does not exist in the workspace, so only the English matrices are updated. The `.docx` / `.html` business exports are not regenerated.
