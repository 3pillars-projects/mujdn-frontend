# Handoff: visit-cards (frontend)

## Versions and state

- Updated: 2026-11-17
- Specification: `Features/visit-cards/spec.md` (copy; backend copy is authoritative)
- Contract: `mjd-attend-back/Features/visit-cards/handoff.md` at backend commit `5833b5a8` (`feature/visit-cards`)
- Frontend branch: `feature/visit-cards` (from `dev` @ `9312139d`)
- State: implemented; build passes; unit tests pass apart from 4 smoke specs that already fail on `dev`. Not yet run against a live backend.

## Implemented behaviour

| Criterion | Frontend implementation | Evidence |
|---|---|---|
| AC-01–AC-04 | Visit cards list and add/edit popup: card ID (hex, normalized on blur and before sending), friendly number (1–9999, "up to 4 digits" hint), debounced uniqueness check on both fields, next number pre-filled in create mode, edit/delete disabled with a tooltip while `isInUse`, Excel export | `visit-cards-list`, `visit-card-popup`, `VisitCardValidators` spec (9 tests) |
| AC-05 | Routes `/attendance/visit-cards` (ADMIN, Settings menu) and `/visits/visit-cards` (SECURITY_LEADER, Visits menu), separate route ids `VISIT_CARDS_SETTINGS` / `VISIT_CARDS` | build; review |
| AC-06–AC-11 | Link-card dialog: visit details (shared `visit-details-section`, with attendance status), debounced friendly-number lookup (spinner, not-found field error, retry on failure), read-only hex card ID, move warning with holder details and confirmation, `moveFromOtherVisit` on confirm, handles 409 by refreshing the holder, unlink with confirmation | `link-visit-card-popup`; review |
| AC-13 | Green card button on approved, not-ended visits in both "My visits" and "All visits" tabs for SECURITY_MEMBER / SECURITY_LEADER (icon `assets/icons/card-link.svg`); a "card short number" column (also in the Excel export) shows the linked card | both list components; review |
| AC-14 | Button hidden for other roles; the server enforces the roles | review |

## Implementation notes

- Lookup and availability calls use `SKIP_LOADING` + `SKIP_ERROR_ALERT`; the call sites show progress and errors inline. `linkCard` uses `SKIP_ERROR_ALERT` and reports every failure itself (alert with the `COMMON.<messageKey>` text). `unlinkCard` uses the global error dialog.
- New validation keys: `hexCardId`, `cardIdTaken`, `friendlyNumberTaken`, `cardNotFound` (added to `ValidationErrorKeyEnum` and `ValidationMessagesComponent`).
- The visit details block of `ViewActionVisitRequestPopupComponent` moved into `VisitDetailsSectionComponent` (same markup), reused by the link-card dialog.
- `assignedCard` is read-only on `Visit` and removed by `VisitInterceptor.send`; `isInUse` is removed by `VisitCardInterceptor.send`.
- PDF export is not offered on the cards page (the mock shows Excel only).

## Verification

| Check | Result |
|---|---|
| `npm run build` | passed; 20 warnings, same count as `dev` |
| `npx ng test --watch=false --browsers=ChromeHeadless` | 37 passed, 4 failed. The 4 failures (`DepartmentPopupComponent`, `DepartmentTreeComponent`, `DevicesConfigurationModalComponent`, `VersionComponent` "should create") fail identically on `dev` without these changes |
| Browser flow against a backend | not run (no environment selected) |
| Arabic/RTL and English/LTR visual check | not run |

## Not done

- Browser check of both journeys (ADMIN / SECURITY_LEADER card registry; SECURITY_MEMBER linking, moving and unlinking) against the backend branch.
- Field-level error icon from the mock: the shared validation message component has no icon, and adding one would change every form.
