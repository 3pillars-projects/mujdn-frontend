# Handoff: leave-unified-list (frontend)

## Versions and state

- Updated: 2026-10-21
- Contract: `mjd-attend-back/Features/leave-unified-list/handoff.md` (backend `feature/leave-unified-list` on top of `b9eb29b8`, uncommitted)
- Frontend: `feature/leave-unified-list` on top of `e7583b08`, uncommitted

## What changed

| Criterion | Implementation |
|---|---|
| Approval screen removed | `views/features/leaves-confirmations/` and `resolvers/lookups/department-leaves.resolver.ts` deleted. `RouteIdsEnum.LEAVES_CONFIRMATIONS` removed. `/attendance/leaves-confirmations` now redirects to `/attendance/leaves` (`routes/app.routes.ts`). |
| Menu | The "Leaves" group (two children) became one "Leave Requests" item (`side-bar-links.service.ts`). |
| Tab for DM or HR | `LeavesContainerComponent.showOtherLeavesTab()` |
| Take action in the tab | `OtherLeavesComponent.openTakeActionDialog()`, row button gated by `canTakeAction`; `canChangeDates` from `canAmendDates` |
| HR-only users | "Add new leave" and the `employees-lookup` call are DM only (`canAddLeave`). The employee search filter now uses `getMyDepartmentUsersLookup`. |
| Service | `LeaveService.loadApprovalsPaginated` and `exportDepartmentLeavesPdf` removed |
| Approval history removed | `views/features/leaves/leave-approval-timeline/` and `models/.../leave-approval-action.ts` deleted; removed from the view and add/edit/take-action popups. `Leave.approvalActions`, `level1ApprovalDepartment`, `level2ApprovalDepartment` and the interceptor mapping removed, matching the slimmer backend `LeaveModel`. Nine `LEAVES_PAGE` keys only the timeline used (`STAGE_*`, `APPROVAL_HISTORY`, `APPROVED_BY`, `REJECTED_BY`, `ACTED_AS_HR`, `AWAITING_DECISION`) removed from `en.json` and `ar.json`. |
| Translations | Removed the six keys only the old screen used (`LEAVES_PAGE.HR_CONFIRMATIONS_TAB`, `AWAITING_MY_APPROVAL_TAB`, `AWAITING_MY_APPROVAL_LIST`, `INCOMING_LEAVES_LIST`, `LEAVES_CONFIRMATIONS`, `MENU.LEAVES_CONFIRMATIONS`) from `en.json` and `ar.json`. No new text. |

## Checks

- `npm run build`: passed (existing bundle-budget and CommonJS warnings only).
- `npx prettier --check` on the changed files: clean after formatting `other-leaves.component.html`.
- Browser flows (EN/AR): **not run**. They need a selected test API and database.
