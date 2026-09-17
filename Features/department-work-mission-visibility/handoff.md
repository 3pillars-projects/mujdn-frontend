# Handoff: department-work-mission-visibility

## Versions and state

- Updated/owner: 2026-09-16, m1hosam (backend), prepared by Claude Code
- Accepted specification: `mjd-attend-back/Features/department-work-mission-visibility/spec.md`
- Backend branch/commit: `16-09-client-updates` at `bb6f1417` **plus uncommitted changes**. The commit ID alone does not include this feature; see `progress.md` for the changed files.
- Frontend branch/commit: not started
- Contract artifact: no exported OpenAPI file yet. The contract below comes from reading the source. Check it against Swagger (`/swagger`) once the backend is running.
- Overall state: backend implemented and compiled (Release build passed). The migration has not been applied, and no runtime/API checks have been run. Frontend work is not started.

## Summary for the frontend

Admins can now turn the **work missions (task assignment) module** on or off for each department. The Angular app must:

1. Show an on/off toggle for this setting in the department create/edit form.
2. Ask the backend whether the current user should see the work-missions module, and hide its menu entry and routes when the answer is `false`.

The module is hidden when the user's own department **or any parent department** has the setting off. The backend works this out; the frontend only reads a boolean.

## Implemented behavior

| Criterion | API operation | Status and evidence | Frontend work remaining |
|---|---|---|---|
| AC-01 existing departments stay enabled | migration `AddDepartmentIsWorkMissionEnabled` | implemented; SQL reviewed (`DEFAULT 1`); not applied | none |
| AC-02 admin sets the flag | `POST`/`PUT /api/departments`, `POST /api/departments/GetWithPaging`, `GET /api/departments/GetDepartmentTreeAsync` | implemented; not runtime-verified | add the toggle to the department form and optionally a grid column |
| AC-03 omitted flag is not reset | same as AC-02 | implemented (mapping condition); not runtime-verified | none; older clients are safe |
| AC-04 effective visibility | `GET /api/WorkMission/is-enabled` | implemented; not runtime-verified | call it and hide the module when it returns `false` |
| AC-05 any authenticated user | `GET /api/WorkMission/is-enabled` | `[Authorize]` (no role restriction) | none |

## API contract

JSON is camelCase. Every response uses the envelope `{ "data": ..., "error": null | { "messageKey", "message", "details" } }`.

### 1. Department create/update (existing endpoints, new field)

`POST /api/departments` and `PUT /api/departments` (Admin only). The `DepartmentModel` body gains:

| Field | Type | Meaning |
|---|---|---|
| `isWorkMissionEnabled` | `boolean \| null` | `true` = show the work-missions module for this department and its sub-departments. `null` or omitted: create defaults to `true`; update keeps the stored value. |

PUT body (other fields unchanged, sample values):

```json
{
  "id": 5,
  "concurrencyUpdateVersion": "AAAAAAAAB9E=",
  "nameAr": "إدارة الدعم الفنى",
  "nameEn": "It",
  "fkParentDepartmentId": 1,
  "fkRegionId": 1,
  "fkCityId": 1,
  "address": "Street 2",
  "phoneNumber": "123456789",
  "fax": null,
  "fkManagerId": 12,
  "isOneLevelApproval": true,
  "isWorkMissionEnabled": false
}
```

Responses from `PUT`, `GetWithPaging` (`data.list[]`) and `GetDepartmentTreeAsync` (including nested `childDepartments`) now include `"isWorkMissionEnabled": true|false`.

### 2. Work-missions visibility for the current user (new)

`GET /api/WorkMission/is-enabled`: any logged-in user, no parameters.

```json
{ "data": true, "error": null }
```

- `true`: show the work-missions module.
- `false`: hide it.
- An unauthenticated caller gets 401, as with other endpoints.

## Integration details

- **Authentication:** the existing bearer token flow; nothing new.
- **Roles:** department settings are Admin-only (unchanged). `is-enabled` is open to every authenticated role.
- **Enforcement:** **UI only** (an accepted decision). The mission endpoints do not check this flag, so the frontend is the only place it takes effect. Hide both the menu entry **and** direct route access (for example with a route guard).
- **Scope of hiding:** the whole work-missions management module: list, create, edit, delete, assign employees, and PDF export. **Keep "My missions" (`GetMyWorkMissionsAsync`, `ExportMyMissionsPdf`) visible** regardless of the flag.
- **Error keys:** no new keys.
- **Nulls:** see the `isWorkMissionEnabled` table above.
- **Concurrency:** unchanged. Send `concurrencyUpdateVersion` on `PUT`; a stale version returns 409 `RECORD_MODIFIED_BY_ANOTHER_USER`.
- **Deployment order:** the API rejects unknown JSON properties (`UnmappedMemberHandling.Disallow`). **Deploy the backend before, or together with, the frontend.** Otherwise department saves that send `isWorkMissionEnabled` will fail with 400.

## Frontend scope (proposed; Angular repository not inspected)

- **Department form:** add a toggle/checkbox, for example "Enable task assignment" / "تفعيل تكليف المهام", bound to `isWorkMissionEnabled`, defaulting to on for new departments. When editing, fill it from the loaded department. Optionally show it as a column in the department grid.
- **Visibility:**
  - Call `GET /api/WorkMission/is-enabled` once after login or app start and cache the result, for example in the auth/user state.
  - Refresh it on the next login; changing a department's setting does not push updates.
  - Use the result to hide the work-missions menu item and to guard its routes, redirecting to the home page or a not-authorized page.
- **Loading/error:** if the call fails, keep the module hidden and don't block the app shell.
- **Localization:** add Arabic and English labels for the toggle.
- **Client generation:** not configured in the backend. Update the handwritten models/services: `DepartmentModel.isWorkMissionEnabled?: boolean | null`, plus a new service method for `is-enabled`.

## Run and verify

- **Backend:** apply the migration to a **local/test** database only. API startup outside Development runs migrations, and hosted services can write data (see `README.md#getting-started`).
- **Checks already run:** Release build of the solution passed and the migration SQL was reviewed (see `progress.md`).
- **Checks still required against the real API:**
  1. Create a department without the field and confirm the response has `isWorkMissionEnabled: true`.
  2. Turn the setting off on a parent department. `is-enabled` should return `false` for users in that department **and** in its sub-departments, and `true` for users elsewhere.
  3. Send a `PUT` without the field and confirm the stored value doesn't change.
  4. With the setting off, confirm the menu and routes are hidden while "My missions" stays visible.

## Open decisions and next action

- **Known gaps:**
  - No server-side enforcement.
  - The flag is not in the department PDF export or the Excel import (imported departments default to enabled), and not in `myprofile`.
- **Required decisions:** none are blocking.
- **Next task:**
  1. Backend: commit the changes and apply the migration to the test environment.
  2. Frontend: implement the department-form toggle and the `is-enabled` menu/route guard, then run checks 1–4 above.

## Frontend implementation (2026-09-16, mujdn-frontend)

- Branch: `16-09-client-requests` @ `9adbf134` plus uncommitted changes. Plan: `.planning/2026-09-16-department-work-mission-visibility/`.
- **Department form:** a "Enable task assignment (work missions)" checkbox bound to `isWorkMissionEnabled`, shown for every department and defaulting to on (`null`/missing → on). The department header also shows Enabled/Disabled.
- **Visibility:** `WorkMissionService.isWorkMissionEnabled()` calls `GET /api/WorkMission/is-enabled`. `WorkMissionResolver` calls it for department managers and HR officers on each visit to `/attendance/work-missions`. The "All missions" (management) tab and its department lookup load only when it returns `true`. A failed call hides the tab, and the global interceptor reports the error.
- **Deviation from the proposed UI above:** the menu entry and route are **not** hidden, and no route guard was added. That page also hosts "My missions", which decision 1 keeps visible. The management module is a tab, not a route.
- **Checks:** `npm run build` passed. The new specs compile but have not been run, because Karma had no browser available. Real-API checks 1–4 have not been run.
