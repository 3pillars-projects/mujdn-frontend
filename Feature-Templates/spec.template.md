# Feature: <feature-id and name>

## Status and ownership

- Status: draft / accepted / superseded
- Owner: <person or coordinating agent>
- Accepted baseline: <decision/revision; set only after acceptance>
- Frontend repository/revision: <branch/commit; identify uncommitted work>
- Backend repository/revision: <branch/commit; identify uncommitted work>

## Goal and user journey

<Who does what and which observable result they receive.>

## Scope and exclusions

- In scope: <behavior>
- Out of scope: <behavior>
- Compatibility constraints: <routes/contracts/behavior to preserve>

## Acceptance criteria

Define behavior before implementation, including relevant loading, empty, validation, denied, failure/retry, duplicate-action, success, localization/direction, and accessibility paths.

| ID | Given / When / Then | Verification approach |
|---|---|---|
| AC-01 | <observable scenario and result> | <component/API/browser/accessibility evidence> |

## Business and access rules

- Roles, ownership, and data scope: <who can see/do what>
- Validation and state transitions: <rules>
- Duplicate, retry, idempotency, and concurrency: <rules>
- Dates/time zones and boundaries: <semantics>
- Data retention/files: <rules or not applicable>

## API contract intent

- Authoritative implemented contract: <artifact path/version/checksum or proposed/unavailable>
- Produced from backend revision: <commit plus uncommitted-state note>
- Generation/client status: <handwritten mapping, or accepted pinned generator/config/output>

| Operation | Method/path | Request schema | Success status/envelope | Failure statuses/keys | Access |
|---|---|---|---|---|---|
| <name> | <contract reference> | <schema link> | <schema link> | <cases> | <rule> |

Record null/omitted behavior, enum serialization, pagination/sorting, dates/time zones, concurrency tokens, and file formats. Link schemas instead of duplicating them. Mark proposals as proposals.

## Frontend behavior

- Route/screen and verified reference implementations: <paths>
- Form and client/server validation: <behavior>
- Initial/loading/empty/failure/retry/success behavior: <behavior>
- Session/denied behavior: <behavior>
- Duplicate-action/pending behavior: <behavior>
- English/LTR, Arabic/RTL, accessibility, and responsive behavior: <behavior>

## Decisions and changes

| Proposed/material change | Evidence, criteria/tasks, and impact | Decision/owner |
|---|---|---|
| <question> | <facts; distinguish assumptions> | pending / accepted / rejected |

## Completion and rollout

- Required commands/scenarios and environment: <actual repository checks>
- Backend/contract coordination: <handoff/revision>
- Compatibility/rollout/rollback: <plan or not applicable>
- Evidence location: <selected progress file/review>

