# Feature: department-work-mission-visibility — Per-department work-missions (task assignment) visibility

## Status and ownership

- Status: backend implemented (uncommitted), frontend not started
- Owner: m1hosam (backend), coordinating agent: Claude Code
- Backend repository/revision: mjd-attend-back, branch `16-09-client-updates`, on top of `bb6f1417` plus uncommitted changes
- Frontend repository/revision: not inspected (separate Angular repository)
- Accepted decisions (user, 2026-09-16):
  1. The setting controls the **whole work-missions module** for managers/HR (list, create, edit, delete, assign, export). The employee "My missions" view is not part of the switch.
  2. **UI visibility only.** The backend exposes the flag, but the mission endpoints do not enforce it.
  3. **Inherited:** the module is hidden when the user's own department **or any ancestor department** has the setting turned off.

## Acceptance criteria

| ID | Given / When / Then | Verification approach |
|---|---|---|
| AC-01 | Existing departments get `IsWorkMissionEnabled = true` from the migration, so current behavior is unchanged. | Generated SQL reviewed: `ADD [IsWorkMissionEnabled] bit NOT NULL DEFAULT CAST(1 AS bit)`. |
| AC-02 | An Admin can set `IsWorkMissionEnabled` on `POST`/`PUT /api/departments`. It is returned by `GetWithPaging`, the department tree, and the `PUT` response. | API check against a local database (not run). |
| AC-03 | A `POST`/`PUT` that omits `IsWorkMissionEnabled` (null) keeps the stored value on update and defaults to `true` on create. It never silently becomes `false`. | AutoMapper `Condition` in `MappingProfile`, plus the entity initializer. Needs an API or service test (not run). |
| AC-04 | `GET /api/WorkMission/is-enabled` returns `false` when the caller's department or any ancestor has the setting off, and `true` otherwise. | Service test with a three-level hierarchy (not run). |
| AC-05 | Any authenticated user can call `is-enabled`, and an unauthenticated caller gets 401. | API check (not run). |

## API contract

| Operation | Method/path | Request | Success | Access |
|---|---|---|---|---|
| Create/update department (existing) | `POST`/`PUT /api/departments` | `DepartmentModel` + optional `isWorkMissionEnabled: bool \| null` | `ApiResponse<DepartmentModel>` now includes `isWorkMissionEnabled` | Admin |
| Department paging/tree (existing) | `POST /api/departments/GetWithPaging`, tree endpoint | unchanged | items include `isWorkMissionEnabled` | unchanged |
| Work-missions visibility (new) | `GET /api/WorkMission/is-enabled` | none | `ApiResponse<bool>`: `true` = show the module | any authenticated user |

`null`/omitted `isWorkMissionEnabled` means "keep the stored value" (create: `true`).

## Frontend handoff notes (proposed, not verified against Angular)

- Department form: add an "Enable task assignment (work missions)" toggle bound to `isWorkMissionEnabled`, defaulting to on for new departments.
- App shell/menu: call `GET /api/WorkMission/is-enabled` after login (and after a department change) and hide the work-missions menu entry and routes when it returns `false`. Consider a route guard using the same value.
- Keep "My missions" visible regardless of the flag (decision 1).

## Exclusions and known gaps

- No server-side enforcement (decision 2). A direct API call still works when the module is hidden.
- Not added to: department PDF export, department Excel import (imported departments default to `true`), `DepartmentWithChildrenModel` (unused), or `myprofile`.
- Existing `IsOneLevelApproval` has the same null → `false` AutoMapper behavior on `PUT`. It was left unchanged here.
