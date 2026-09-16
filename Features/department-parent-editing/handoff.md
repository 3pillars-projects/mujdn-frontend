# Handoff: department-parent-editing

## Versions and state

- Updated/owner: 2026-09-16, m1hosam (backend) / Claude Code
- Accepted specification: `Features/department-parent-editing/spec.md` (this repository)
- Backend branch/commit: `16-09-client-updates`, based on `9604ff6b`, **plus uncommitted working-tree changes from this feature** (not yet committed — see below). The branch also carries a large pre-existing unrelated line-ending normalization pass this feature's diff sits on top of.
- Frontend branch/commit: `mujdn-frontend`, branch `16-09-client-requests`, working tree — implemented this session against this document's proposed contract, not yet verified against a running backend
- Contract artifact: none exported (no OpenAPI generation pipeline exists in this repo yet); this document plus `spec.md`'s API contract intent table is the authoritative source for now
- Contract produced from: manual inspection of the implemented code at `9604ff6b` + this feature's diff, not from a Swagger/OpenAPI export — **verify the actual JSON shape against a running instance before building the Angular client**, since it hasn't been compared to real HTTP responses in this session
- Overall state: backend implemented and unit-tested (10/10 passing); not yet committed; not yet exercised over real HTTP. Frontend implemented against this document's proposed contract; `npm run build` passes clean; `npm test` could not be run in this session (no Chrome/Chromium binary in the sandbox); not yet exercised against a real backend.

## Implemented behavior

| Criterion | API operation/contract reference | Status and evidence | Frontend work remaining |
|---|---|---|---|
| AC-01 | `PUT /api/departments` | Implemented, unit-tested (validation path); full save round-trip not independently re-verified this session (pre-existing generic behavior) | Frontend implemented — `fkParentDepartmentId` added to `Department.buildForm()` (`src/models/features/lookups/department/department.ts`) and included in the existing save payload (not stripped by `DepartmentInterceptor`); not yet verified against a running backend |
| AC-02 | `PUT /api/departments` → 400 `MAIN_DEPARTMENT_PARENT_NOT_EDITABLE` | Implemented, unit-tested | Frontend implemented — the parent-department `p-select` is disabled (`[disabled]="isRootDepartment"`) whenever `model.fkParentDepartmentId == null`, so the root department's field can't be interacted with client-side. Error key text added to `COMMON.MAIN_DEPARTMENT_PARENT_NOT_EDITABLE` in `en.json`/`ar.json` for the global error interceptor, but not exercised against a real 400 response |
| AC-03, AC-04, AC-08 | `PUT /api/departments` → 400 `DEPARTMENT_PARENT_CYCLE` | Implemented, unit-tested | Frontend implemented — `COMMON.DEPARTMENT_PARENT_CYCLE` added to `en.json`/`ar.json`; the existing global `httpErrorInterceptor` (`src/http-interceptors/http-error-interceptor.ts`) already shows `COMMON.<messageKey>` for any 400 with no extra code needed. Not exercised against a real 400 response |
| AC-05 | `PUT /api/departments` → 404 `RESOURCE_NOT_FOUND` | Implemented, unit-tested | Frontend implemented — reuses the existing `COMMON.RESOURCE_NOT_FOUND` key already present in i18n and the same global error interceptor; no new frontend code needed |
| AC-06 | `GET /api/departments/{id}/parent-options` → `ApiResponse<IEnumerable<BaseLookupModel>>` | Implemented, unit-tested | Frontend implemented — new `DepartmentService.getParentOptions(id)` (`src/services/features/lookups/department.service.ts`) calls this endpoint; called from both `DepartmentListComponent.openDialog()` and `DepartmentHeaderComponent.openDialog()` (the two places that open the edit popup) whenever the popup is opened in edit mode, and the resulting list is bound to the new "Parent department" `p-select` in `department-popup.component.html`. **Not verified against a running backend** — the exact response shape (`{ data: [...] }`, flat array) is assumed per this document and mapped via a new `$parentOptions` `CastResponseContainer` entry; confirm against real HTTP before considering this done |
| AC-07 | Both operations require `Admin` role | Implemented via `[Authorize(Roles = RoleNames.Admin)]`, matching existing `Post`/`Put`/`Delete` on this controller; **not exercised by an HTTP-level test this session** | Pre-existing — the `/departments` route already has `data: { roles: [ROLES_ENUM.ADMIN] }` with `authGuard` (`src/routes/app.routes.ts`), so the whole screen (including this new field) is already Admin-gated client-side. This is navigation/visibility only, not server authorization (per `AGENTS.md`); server enforcement is what actually matters and was not exercised over real HTTP this session |

## Integration details

- Authentication/credentials mechanism: unchanged — same bearer/cookie auth as the rest of the API (not modified by this feature).
- Roles/ownership and denied requests: both the update path and the new lookup require the `Admin` role. A non-Admin caller gets a 401/403 the same way they already do for `POST`/`PUT`/`DELETE /api/departments`.
- Error message keys and field validation:
  - `MAIN_DEPARTMENT_PARENT_NOT_EDITABLE` — attempted to change the root department's parent. Default text: "The main department's parent cannot be changed."
  - `DEPARTMENT_PARENT_CYCLE` — attempted to set a department's parent to itself or one of its own descendants. Default text: "A department cannot become its own parent or the parent of one of its own descendants."
  - `RESOURCE_NOT_FOUND` (existing key) — the submitted `FkParentDepartmentId` doesn't correspond to any department, or the `{id}` in the parent-options route doesn't exist.
  - All three arrive through the standard `ApiResponse` error envelope (`error.messageKey`, `error.message`) via the existing `GlobalExeptionHandlingMiddleware` — nothing new about the envelope shape itself.
- Dates/time zones, enums, null/omitted fields: not applicable to this feature. `FkParentDepartmentId` is a nullable int; `null` should only ever be submitted for the department that is already the root (identified by the existing row's `FkParentDepartmentId` being `null`, not a fixed id).
- Pagination/sorting and response envelope: `GET /api/departments/{id}/parent-options` returns the same shape as the existing `GET /api/departments/lookup` (`ApiResponse<IEnumerable<BaseLookupModel>>`, each item `{ id, nameEn, nameAr }`) — no pagination, it's a flat list for a dropdown.
- Concurrency/retry handling: unchanged — `PUT /api/departments` still requires `ConcurrencyUpdateVersion` and returns 409 `RECORD_MODIFIED_BY_ANOTHER_USER` on a stale update, same as every other field on this form.
- File responses: not applicable.

**Route naming is not finalized.** The user explicitly said the exact shape of the parent-options endpoint doesn't matter since no Angular contract exists yet to match against (`GET /api/departments/{id}/parent-options` is the current working default). Confirm this is workable for the Angular routing/generator setup before wiring it in, and update this document if it changes.

## Frontend scope

- Screens/routes and existing patterns: `mujdn-frontend`, `src/views/features/department/`. The department edit form is `DepartmentPopupComponent` (`department-popup/department-popup.component.ts`/`.html`), opened in edit mode from two places: `DepartmentListComponent.openDialog()` (`department-list/department-list.component.ts`) and `DepartmentHeaderComponent.openDialog()` (`department-header/department-header.component.ts`).
- Implemented this session:
  - `DepartmentService.getParentOptions(id: number): Observable<BaseLookupModel[]>` (`src/services/features/lookups/department.service.ts`) calls `GET /departments/{id}/parent-options` (base URL from `UrlService`/`EndPoints.DEPARTMENTS`), cast via a new `$parentOptions` `CastResponseContainer` entry (flat array under `data`, matching `LookupBaseService.getLookup()`'s pattern — DepartmentService's own `$lookup` entry was already shadowed for `ListResponseData`/paginated shapes, so it couldn't be reused here).
  - `Department.buildForm()` (`src/models/features/lookups/department/department.ts`) now includes an unvalidated `fkParentDepartmentId` control (no `Validators.required`, matching the pattern of the optional, no-clear `fkManagerId` control — the field is always pre-populated with the current parent in edit mode and the select has no clear affordance, so it can't be blanked out client-side).
  - `DepartmentPopupComponent` adds a "Parent department" `p-select` (edit mode only, `@if (!isCreateMode)`), bound to `fkParentDepartmentId`, options from `parentDepartments` (populated from dialog data), `[disabled]="isRootDepartment"` where `isRootDepartment` is `model.fkParentDepartmentId == null` — mirrors the existing `fkCityId`/`fkManagerId` template-driven disable pattern in this file rather than `FormControl.disable()`.
  - Both `openDialog()` call sites now call `getParentOptions(department.id)` before opening the popup when in edit mode (create mode passes `of([])`, since parent selection isn't shown/needed there), and pass the result through `dialogConfig.data.lookups.parentDepartments`.
  - New i18n keys: `DEPARTMENT_POPUP.PARENT_DEPARTMENT`, `DEPARTMENT_POPUP.CHOOSE_PARENT_DEPARTMENT`, `COMMON.MAIN_DEPARTMENT_PARENT_NOT_EDITABLE`, `COMMON.DEPARTMENT_PARENT_CYCLE` — added to both `public/assets/i18n/en.json` and `ar.json`.
- Loading/empty/error/success states: the existing global `httpErrorInterceptor` and spinner interceptor cover loading and error display for both the new `getParentOptions` call and the `PUT` save — no per-call-site loading/error UI was added, consistent with how the rest of this form already relies on those interceptors (see `AGENTS.md`'s "Global interceptors own the shared spinner... and most error dialogs"). If `getParentOptions` fails, the error is shown globally and the edit popup simply does not open (no dialog opened on that path) rather than opening with a broken/empty picker.
- Duplicate-action/pending behavior: unchanged — this feature adds one field to an existing form/save flow that already guards against duplicate submission via `exhaustMap` in `listenToSave()`.
- Localization/accessibility: new strings added to both locales (see above); the new select reuses the existing labeled-`<label for>` + `app-validation-messages` pattern used by the adjacent fields in this template.
- Client integration: handwritten (no generator in this repo); **not verified against a running backend** — the exact response envelope for `GET /departments/{id}/parent-options` is assumed from this document (`ApiResponse<IEnumerable<BaseLookupModel>>`, flat array under `data`), not from an actual HTTP response.

## Run and verify

- Backend local/test setup: see `README.md#getting-started`. **Not run this session** — no local/test database was available; only `dotnet build`/`dotnet test` were exercised (see `progress.md`).
- Frontend setup: `mujdn-frontend` repository root; `npm install` already present (existing `node_modules`).
- Test data: none set up in a real database; backend unit tests use an in-memory fixture (5 departments in a small tree — see `Tests/Services.Tests/Schema/Lookup/Department/DepartmentParentEditingTests.cs`).
- Automated/manual checks already run this session (frontend):
  - `npm run build` — passed (exit 0), no new compile errors; only pre-existing, unrelated CommonJS/ESM bundling warnings.
  - `npm test` — **not run**: no Chrome/Chromium binary is available in this sandbox (`karma` needs `ChromeHeadless`/`CHROME_BIN`), so the Karma runner cannot launch here. Not claimed as passed.
  - No browser check against a real backend — not available in this session (matches `AGENTS.md`: browser checks require a deliberately selected backend/environment, unavailable as a repository script).
- Checks still required against the actual API before this is considered done end-to-end:
  - AC-07: confirm a non-Admin token actually gets 401/403 on both operations over real HTTP.
  - AC-01: confirm a valid parent change actually persists and round-trips through `PUT` end to end (the unit tests only prove the new validation doesn't block it).
  - Compare the real JSON shape of both operations against this document before relying on the frontend mapping — specifically confirm `GET /departments/{id}/parent-options`'s envelope is a flat `data: [...]` array as assumed by the new `$parentOptions` cast container.
  - Run `npm test` in an environment with Chrome/Chromium available (or `CHROME_BIN` set) to get an actual pass/fail count; none of the four existing specs cover the new field, and no new component test was added this session.
  - Manually exercise the edit popup for the root department (parent select should be disabled/unchangeable), a mid-tree department (select should list only valid, non-descendant departments), and a rejected save (cycle/root-lock) once the backend branch is running, to confirm the error message actually surfaces via the global error dialog.

## Open decisions and next action

- Known gaps:
  - Backend: HTTP-level auth check and full save round-trip not run this session (see Checks still required, above). Not committed to git yet.
  - Frontend: implemented against the proposed contract only; not run against the real backend; `npm test` not run (no Chrome available in this sandbox); no new component test added for the parent-select behavior (disabled-for-root, populated-from-endpoint, included-in-save-payload).
- Required decisions: none outstanding on the backend side — all decisions in `spec.md`'s Decisions table are resolved. Route naming may still change once both sides are run against each other; that's expected, not a gap.
- Next task: **backend** — run the two remaining manual API checks above against a local/test environment, then commit. **Frontend** — once the backend branch is committed and running, point this working tree at it and re-verify: (1) the parent-options response shape matches the `$parentOptions` cast container assumption, (2) a save with a changed parent round-trips, (3) the two new error keys actually surface via the global error dialog on a rejected save.
