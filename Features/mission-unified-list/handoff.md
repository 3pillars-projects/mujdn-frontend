# Handoff: mission-unified-list (frontend)

## Versions and state

- Updated: 2026-10-21
- Contract: `mjd-attend-back/Features/mission-unified-list/handoff.md` (backend `feature/mission-unified-list` on top of `037ac704`, uncommitted)
- Frontend: `feature/mission-unified-list` on top of `09a2df65`, uncommitted

## What changed

| Criterion | Implementation |
|---|---|
| UL-07 two tabs | `work-mission-container`: "My missions" and "My following employees' missions" (`FOLLOWING_EMPLOYEES_MISSIONS`). The HR approvals tab and the `hr-mission-approvals-list` component are removed, along with `WorkMissionService.loadHrApprovalsPaginated`. The tab shows for HR always, and for a manager when `isWorkMissionEnabled`. "Add new mission" shows when `isWorkMissionEnabled` (`canCreate` input). |
| UL-07 row actions | `assign-work-mission-list`, from left to right in LTR: View; one main button ("Assign employees" when Draft and `canAssign`, "Take action →" when Pending and `canTakeAction`, which opens the details popup with Approve and Reject); a ⋮ button that opens a shared `p-menu` popup. |
| UL-07 ⋮ menu | Edit mission (`canEdit`), Download file (always; the mission PDF, replacing the green per-row button), Edit assignment (`canAssign` and Pending), Delete mission (`canDelete`, shown in red through the item template). Items are separated by dividers. |
| Statuses | Draft is labelled **New / جديد** with the blue badge. Pending is labelled **Pending approval / بانتظار الموافقة**. |
| Assign popup | The "approved automatically" toast is removed. "Sent to HR" now reads "sent for approval". |
| Styles | Removed the three `::ng-deep .p-tieredmenu-root-list li:last-child` rules from the mission components. They leaked onto every tiered menu in the app once the screen had loaded. |
| i18n | Added `WORK_MISSIONS.{FOLLOWING_EMPLOYEES_MISSIONS, EDIT_ASSIGNMENT, DELETE_MISSION, DOWNLOAD_FILE, EXPORT_PDF}` and `COMMON.MORE_ACTIONS`. Updated `STATUS_DRAFT`, `STATUS_PENDING_HR`, `SENT_TO_HR` and `WORK_MISSIONS_LIST`. Removed `HR_APPROVALS_TAB`, `HR_APPROVALS_LIST`, `NO_HR_APPROVALS`, `APPROVED_AUTOMATICALLY` and `ASSIGN_WORK_MISSIONS`, after a grep showed no other users. |

## Checks

| Check | Result |
|---|---|
| `npm run build` | passed |
| `npx tsc -p tsconfig.spec.json --noEmit` | passed. The container spec was updated for `canManage` and `canCreate`. |
| `npm test` (Karma) | **not run**. ChromeHeadless cannot start in this WSL environment because system libraries such as `libnspr4.so` are missing. |
| prettier on changed files | passed |
| Browser flow, EN/LTR and AR/RTL | **not run**. It needs a selected test API. See the scenarios in the backend handoff. |
