> Copy of `mjd-attend-back/Features/visit-cards/spec.md` (2026-11-17, backend commit `5833b5a8`). The backend copy is authoritative.

# Spec: visit-cards

- Status: accepted 2026-11-17 (plan approved by the product owner in session); backend implemented, DSS behaviour not yet verified against a real DSS server
- Owner: backend first, then `mujdn-frontend` against `handoff.md`
- Revisions: 1 — initial

## Goal

Security staff at the gate hand an approved visitor a physical DSS access card, so the visitor can enter and leave with it during the visit. Card numbers are long hexadecimal values, so every card also has a 4-digit **friendly number** that is written on the card and typed at the gate.

## User journeys

1. **Register cards** (ADMIN under System Settings, SECURITY_LEADER in the Visits menu): list, filter, export, add, edit and delete cards. When adding, the friendly number is pre-filled with the next number (highest + 1). Card ID and friendly number are checked for uniqueness while typing.
2. **Link a card at the gate** (SECURITY_MEMBER, SECURITY_LEADER): on an approved visit, type the friendly number; the card's hexadecimal ID appears, or "not found". Confirming links the card in the database and on the visitor in DSS.
3. **Move a card**: when the typed card is linked to another visit, the officer sees who holds it and confirms a move. The card is taken off the old visitor and given to the new one.
4. **Unlink a card**: removes the card from the visitor in DSS and frees it.

## Scope decisions

- A card is on at most one visit at a time; a visit holds at most one card.
- Release is manual only: unlink, move, or rejecting the visit (including blacklist rejections). No background job releases cards when a visit ends.
- The hexadecimal card ID is typed manually (no card-reader integration).
- Out of scope: server role checks on the existing approve/reject visit endpoints (separate task), DSS token caching.

## Acceptance criteria

| ID | Criterion |
|---|---|
| AC-01 | A card has a unique card ID (hex, normalized to upper case without spaces, `:` or `-`, max 32 characters) and a unique friendly number (1–9999). Invalid or duplicate values are rejected with specific error keys. |
| AC-02 | `next-friendly-number` returns highest + 1 (1 when there are no cards). When 9999 is taken it returns the lowest free number; when every number is used it fails with `VISIT_CARD_NUMBERS_EXHAUSTED`. |
| AC-03 | `availability` reports whether a card ID / friendly number is taken, ignoring the card being edited (`excludeId`). |
| AC-04 | A card linked to a visit (`isInUse`) cannot have its card ID or friendly number changed and cannot be deleted (`VISIT_CARD_IN_USE`). A card that is not in use can be deleted; its history keeps a snapshot of its ID and number. |
| AC-05 | Card registry endpoints are restricted on the server to ADMIN and SECURITY_LEADER, including every inherited action. |
| AC-06 | Looking up a friendly number returns the card and the visit that currently holds it (visitor name, date, time window), or `VISIT_CARD_NOT_FOUND` (404). |
| AC-07 | Linking requires an approved visit that exists in DSS (`VISIT_NOT_APPROVED_FOR_CARD`) whose time window has not ended (`VISIT_ENDED`). The card is set on the DSS visitor before the database is updated. |
| AC-08 | Linking a card held by another visit without `moveFromOtherVisit` fails with 409 `VISIT_CARD_ASSIGNED_TO_ANOTHER_VISIT` and the holder's details. With `moveFromOtherVisit`, the card is cleared on the old visitor first, then set on the new one; the old assignment is released (`MovedToAnotherVisit`). |
| AC-09 | Linking a different card to a visit that already holds one replaces it (`ReplacedOnVisit`). Linking the same card again does nothing. |
| AC-10 | If DSS rejects a step or the database save fails, earlier DSS changes are reverted (best effort, logged) and the database is unchanged. |
| AC-11 | Unlinking clears the card on the DSS visitor and releases the assignment (`Manual`); unlinking a visit without a card fails with `VISIT_HAS_NO_CARD`. |
| AC-12 | Rejecting a visit releases its card (`VisitRejected`), and the DSS expiry call also clears the card on the visitor. |
| AC-13 | Visit list rows include `assignedCard` (friendly number and card ID) while a card is linked. |
| AC-14 | Gate endpoints are restricted on the server to SECURITY_MEMBER and SECURITY_LEADER. |
| AC-15 | The database enforces one active assignment per card and per visit (filtered unique indexes). |

## Data model (`Visit` schema)

- `VisitCard`: `CardId nvarchar(32)` unique, `FriendlyNumber int` unique, audit fields, rowversion.
- `VisitCardAssignment`: `FkVisitCardId int NULL` (ON DELETE SET NULL), `FkVisitLogId int` (Restrict), `CardIdSnapshot`, `FriendlyNumberSnapshot`, `ReleasedAt datetime2 NULL`, `ReleaseReason int NULL` (`VisitCardReleaseReasonEnum`: Manual 1, MovedToAnotherVisit 2, ReplacedOnVisit 3, VisitRejected 4), audit fields. Creation audit = linked by/at; last-update audit = released by/at.
  - `UX_VisitCardAssignment_ActiveCard`: unique `FkVisitCardId` where `ReleasedAt IS NULL AND FkVisitCardId IS NOT NULL`.
  - `UX_VisitCardAssignment_ActiveVisit`: unique `FkVisitLogId` where `ReleasedAt IS NULL`.
- Migration: `Infrastructure/Migrations/Tables/20261117111048_AddVisitCards` (new tables only).

## DSS integration

The card is carried in `authInfo.cardNo` on the existing visitor update, `PUT /obms/api/v1.0/visitors/visitor/{VisitorId}` (`DSSVisitService.UpdateVisitorCardAsync`). The body re-sends the visit's real time window, QR code and access channels so nothing else changes. Clearing sends `cardNo: ""` explicitly, because the DSS client omits null properties. Success is `code == 1000`; anything else becomes `DSS_CARD_ASSIGNMENT_FAILED` (DSS text is logged, not returned).

**Assumptions not yet verified against a DSS server (step 0 of the plan):**

1. Setting `authInfo.cardNo` on the visitor update assigns the card and it opens the visit's channels within the visit window.
2. DSS expects the card number as upper-case hexadecimal (format and length to confirm; server accepts 1–32 hex characters).
3. `cardNo: ""` removes the card; omitting `cardNo` keeps the existing one.
4. DSS refuses the same card on two visitors, which is why a move clears the old visitor first.
5. The visitor update needs the full visitor body (as the existing expiry call sends).

If any of these is wrong, only `DSSVisitService.UpdateVisitorCardAsync`/`BuildExpireVisitRequest` and possibly the card-ID validation in `VisitCardService` need to change; the API contract stays the same.

## Verification

- Service tests: `Tests/Services.Tests/Schema/Visit/VisitCards/VisitCardTests.cs` (26 tests, EF InMemory with a recording DSS fake). Full suite 279/279 on 2026-11-17.
- Not yet run: migration applied to a database, runtime calls against DSS, role checks over HTTP.
