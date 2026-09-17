# Feature: department-parent-editing — Editable department parent + parent-picker lookup

## Status and ownership

- Status: accepted (design) — no implementation done yet
- Owner: m1hosam (backend), coordinating agent: Claude Code
- Backend repository/revision: mjd-attend-back, branch `16-09-client-updates`
- Frontend repository/revision: not yet inspected (Angular app is a separate repository); frontend wiring is out of scope for this plan
- Accepted baseline: all open decisions below resolved by the user in this session (parent-options excludes the department and its descendants — the user changed this decision back after initially asking for self-only; cycle-forming choices are also independently blocked at save time as defense in depth; route naming left open for the handoff)

## Goal and user journey

An Admin editing a department in the department management screen currently cannot change which department it sits under. They need to be able to pick a different parent department from a dropdown and save it, except for the one static main/root department (the department with no parent), whose position at the top of the hierarchy must stay fixed.

The dropdown should list every department that could safely become the new parent: the department being edited and all of its descendants are excluded, since assigning either as the new parent would create a cycle in the hierarchy (see Business rules for why that's a hard rule, not a nicety). The backend also independently rejects a cycle-forming save at the validation layer, so a direct API call that bypasses the picker is still safe.

## Scope and exclusions

- In scope:
  - Backend: keep allowing `FkParentDepartmentId` to be changed via the existing `PUT /api/departments` flow for any department other than the root department (already possible today — see Completion and rollout note below), now with validation instead of none.
  - Backend: reject attempts to change the root department's (`FkParentDepartmentId == null` today) parent away from `null`.
  - Backend: reject a parent value that would create a cycle — the department's own id, or the id of any of its descendants.
  - Backend: reject a parent value that references a department id that does not exist, with a clear validation error instead of a raw DB/500 error.
  - Backend: new endpoint returning the department lookup list for the parent-picker, excluding the department being edited and every one of its descendants.
- Out of scope (this plan):
  - Angular UI work (dropdown, form wiring) — separate repository, to be handed off once the backend contract is accepted.
  - Changing which department is considered "the" root/main department, or allowing more than one root-level department — not requested.
  - Creation-time (`POST`) parent validation beyond what already exists (duplicate name check only). The user asked only about editing an existing department's parent.
  - Any change to who is allowed to edit departments — remains Admin-only, matching the existing `Post`/`Put`/`Delete` authorization on `DepartmentController`.

## Acceptance criteria

| ID | Given / When / Then | Verification approach |
|---|---|---|
| AC-01 | Given a non-root department and a `FkParentDepartmentId` for an existing department that is neither itself nor a descendant, when an Admin submits `PUT /api/departments` with the correct `ConcurrencyUpdateVersion`, then the update succeeds and the returned `DepartmentModel` reflects the new parent. | Service/API test; verify `UpdateWithRegionAndCityAsync` return value and a follow-up read. |
| AC-02 | Given the root department (`FkParentDepartmentId == null` on the existing row), when an Admin submits `PUT /api/departments` for it with any non-null `FkParentDepartmentId`, then the request is rejected (400) with a dedicated error key and the row is unchanged. | Service/API test asserting `BusinessValidationException` and unchanged DB state. |
| AC-03 | Given any department, when an Admin submits `PUT /api/departments` with `FkParentDepartmentId` equal to that department's own id, then the request is rejected (400). | Service/API test. |
| AC-04 | Given a department with at least one descendant, when an Admin submits `PUT /api/departments` with `FkParentDepartmentId` equal to a descendant's id (direct or nested), then the request is rejected (400). | Service/API test covering a direct child and a grandchild. |
| AC-05 | Given a `FkParentDepartmentId` that does not correspond to any existing department, when an Admin submits `PUT /api/departments`, then the request is rejected with a validation/not-found error rather than an unhandled DB exception. | Service/API test. |
| AC-06 | Given a department id, when an Admin calls the new parent-options endpoint, then the response lists all other departments as `BaseLookupModel` entries, excluding that department and every one of its descendants. | Service/API test comparing the returned id set against `GetAllChildDepartmentIdsAsync`. |
| AC-08 | Given a department with a descendant, when a `PUT /api/departments` request submits that descendant's id as `FkParentDepartmentId` directly (bypassing the picker, e.g. a stale client or a direct API call), then the request is still rejected the same way as AC-04 (cycle) — the validation layer doesn't rely on the picker having filtered it out. | Service/API test submitting a descendant id directly via `PUT`, independent of the parent-options endpoint. |
| AC-07 | Given a non-Admin (or unauthenticated) caller, when they call the new parent-options endpoint or attempt the `PUT` described above, then the request is rejected with 401/403, matching existing `DepartmentController` authorization. | API test / manual auth check. |

## Business rules and permissions

- Roles/ownership/data scope: department parent editing stays Admin-only (`RoleNames.Admin`), same as the existing `Post`/`Put`/`Delete` actions on `DepartmentController`. The new parent-options endpoint is Admin-only too, since it only exists to support this admin-only edit action (unlike the general-purpose `GET /api/departments/lookup`, which is Employee-accessible and department-scoped for other use cases — deliberately not reused here to avoid mixing that scoping logic with this admin-only, hierarchy-aware exclusion).
- Validation and state transitions:
  - The root department is identified structurally as the row whose **current** `FkParentDepartmentId` is `null`, not by a fixed id — matches how `GetDepartmentTreeAsync` already partitions the tree (`departmentLookup[null]`).
  - A non-root department's parent may be changed to any other existing department that is not itself and not one of its own descendants (direct or transitive) — **this is a hard rule, not a UX nicety**. Two existing methods (`GetAllChildDepartmentIdsAsync`, `GetAllChildDepartmentIds`) walk the department graph by following `FkParentDepartmentId` with no cycle guard; persisting a cycle would make them recurse forever and crash the process with an unrecoverable `StackOverflowException` the next time either is called (e.g. from the existing `GetMyDepartmentsForMissionsAsync`).
  - `DepartmentService` already has `GetAllChildDepartmentIdsAsync(int? parentId)`, which returns the department itself plus every descendant id; reused for both the cycle check in `ValidateEntityForUpdate` and the new lookup's exclusion set (AC-06), so a cycle-forming choice is filtered out of the picker *and* independently rejected if submitted directly (AC-08) — belt and suspenders around a crash-class bug.
  - This validation belongs in `DepartmentService.ValidateEntityForUpdate(DepartmentModel dto, Department existingEntity)` (currently not overridden), consistent with how `GenericService.UpdateAsync` already calls that extension point.
- Duplicate/retry/concurrency behavior: unchanged — the existing `ConcurrencyUpdateVersion` round trip through `UpdateAsync` continues to apply; no new concurrency concern is introduced by allowing this one additional field to change.
- Data relationships, retention, and migration needs: none — `FkParentDepartmentId` and its `DeleteBehavior.Restrict` self-referencing FK already exist; no schema change.
- Date/time semantics: not applicable.

## API contract intent

- Authoritative contract location/revision: proposed here; not yet exported as OpenAPI, and not yet reviewed against an Angular contract (separate repository).
- Generation/source policy: none established in this repo yet (see `Agent-Workflow.md`); record the intent below and reconcile against actual Swagger output during implementation.

| Operation | Method/path | Request | Success status/body | Failure statuses/keys | Access |
|---|---|---|---|---|---|
| Update department (existing) | `PUT /api/departments` | `DepartmentModel` body, including `Id`, `ConcurrencyUpdateVersion`, and now a changeable `FkParentDepartmentId` | 200, `ApiResponse<DepartmentModel>` | 400 `BAD_REQUEST`/new keys below on cycle/root-lock/invalid parent; 404 `RESOURCE_NOT_FOUND` if the department or parent id doesn't exist; 409 `RECORD_MODIFIED_BY_ANOTHER_USER` on stale version | `Admin` (unchanged) |
| Get parent options (new) | `GET /api/departments/{id}/parent-options` | route `id` = department being edited | 200, `ApiResponse<IEnumerable<BaseLookupModel>>` — all departments except `id` and its descendants | 404 `RESOURCE_NOT_FOUND` if `id` doesn't exist; 401/403 per auth | `Admin` |

Proposed new error keys in `Services/Error/ErrorMessages.cs`:
- `MainDepartmentParentNotEditable` → `MAIN_DEPARTMENT_PARENT_NOT_EDITABLE` (AC-02)
- `DepartmentParentCycle` → `DEPARTMENT_PARENT_CYCLE` (AC-03, AC-04 — self and descendant are both "would create a cycle")

AC-05 reuses the existing `ErrorMessages.NotFound` (`RESOURCE_NOT_FOUND`) via `NotFoundException` rather than adding a new key, per the repository's reuse-first guidance.

`FkParentDepartmentId` continues to serialize as a nullable int; `null` stays valid for the root department only (enforced server-side, not by field omission — the generic update maps whatever the DTO provides via AutoMapper).

## Frontend behavior

- Screens/routes and representative existing components: not inspected — Angular repository is separate. To be filled in during handoff once that repository is available.
- Everything below is proposed intent for the handoff, not verified against the Angular codebase:
  - Department edit form: add a parent-department select, populated from `GET /api/departments/{id}/parent-options`, disabled (not just empty) when editing the root department.
  - Loading/empty/error states: show the current server error message/key on 400 (cycle, root-lock) so the user understands why a save was rejected, even though the picker itself should already exclude cycle-forming choices in the normal flow.
  - Permission-dependent UI: only render/allow this control for Admin users, matching server-side enforcement.

## Decisions and open questions

| Question or proposed change | Evidence/options and impact | Resolution/owner |
|---|---|---|
| Should the parent-options endpoint exclude only the department itself, or itself + all descendants? | Initially the user asked for self-only (to let the picker offer a "lower into a former descendant" move), which was flagged as risky: persisting such a choice would crash the process (`StackOverflowException` in `GetAllChildDepartmentIdsAsync`/`GetAllChildDepartmentIds` — see Business rules). After that trade-off was raised, the user changed the decision back to excluding descendants too, so the picker only ever offers safe choices. | **Resolved by user (final):** exclude the department itself and all descendants. The `ValidateEntityForUpdate` cycle check (AC-04/AC-08) stays regardless, as defense in depth for calls that bypass the picker. |
| New dedicated endpoint vs. extending the existing `GET /api/departments/lookup` with a filter param | The existing `lookup` endpoint is Employee-accessible and applies non-admin department-scoping (`GetCurrentDepartmentIdsAsync`) that has nothing to do with parent-picking. Reusing it would either weaken that scoping or require branching its behavior on a new param. A separate Admin-only endpoint keeps both simpler. | Proposed: new endpoint `GET /api/departments/{id}/parent-options`. |
| Route naming: `{id}/parent-options` vs. a query-string form on `/lookup` vs. anything else | User confirmed the exact route/shape doesn't matter since no Angular contract exists yet to match against; it will be finalized in the handoff once the frontend is available. | **Resolved by user:** route naming is not fixed — keep `GET /api/departments/{id}/parent-options` as the working default, expect it to be revisited during handoff/implementation. |

## Completion and rollout

- Required checks and data/environment: `dotnet build MJD_Attendance_Backend.sln --no-restore`; service-level tests for AC-01..AC-06, AC-08 (no test project currently exists in this solution — establishing minimal coverage for this new validation is part of the implementation task, per `AGENTS.md`); manual API check against a local/test database and config per `README.md#getting-started` for AC-07 auth behavior.
- Migration, compatibility, rollout, and rollback needs: none — no schema change, no route removed/renamed. Note: `DepartmentService` has no `ValidateEntityForUpdate` override today and `DepartmentModel`↔`Department` is a plain `ReverseMap()`, so `PUT /api/departments` already accepts a changed `FkParentDepartmentId` at the backend today, including invalid values (self, descendant, changing the root's parent) — the restriction the user described is enforced only by the Angular form not exposing the field. This feature adds the missing backend validation (AC-02..AC-05) as well as the new lookup endpoint (AC-06); it is a safety fix, not a behavior addition, from the backend's point of view.
- Evidence location: `Features/department-parent-editing/progress.md` (to be created when implementation starts) and this spec's acceptance-criteria table, updated with actual results.
