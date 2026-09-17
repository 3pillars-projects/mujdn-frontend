# Handoff: <feature-id>

## Versions and state

- Updated/owner: <date and owner>
- Accepted specification: <source repository/path/revision>
- Backend branch/commit: <reference; identify uncommitted changes>
- Frontend branch/commit: <reference; identify uncommitted changes>
- Contract artifact: <actual location and version/checksum>
- Contract produced from: <backend revision, tool/version/configuration/command>
- Overall state: <implemented, verified, proposed, blocked, or unavailable>

## Acceptance and implementation

| Criterion | Contract/operation reference | Backend state/evidence | Frontend state/evidence |
|---|---|---|---|
| AC-01 | <reference> | <state> | <state/next task> |

## Integration details

- Authentication/session mechanism: <behavior; never include credentials>
- Roles, ownership, data scope, and denial: <rules>
- Request/response envelope and null/omitted fields: <contract references>
- Validation/error statuses, keys, and details: <references/UI expectations>
- Dates/time zones and enum serialization: <semantics>
- Pagination/sorting and concurrency/retry/idempotency: <semantics>
- File formats/headers: <behavior or not applicable>

Link the actual schemas and sanitized examples tied to this revision. Label hypothetical examples and mocks; never reconstruct a missing schema from prose and call it verified.

## Frontend scope

- Screens/routes and verified source patterns: <paths>
- Form plus loading/empty/validation/denied/failure/retry/success behavior: <requirements>
- Duplicate-action and pending behavior: <requirements>
- Localization/direction/accessibility/responsive behavior: <requirements>
- Client integration: <handwritten mapping, or pinned generator/config/output/command; unavailable if absent>

## Run and verify

- Deliberate frontend/backend environment and revisions: <details; omit secrets>
- Sanitized role/test data: <setup>
- Automated/manual checks already run: <progress reference>
- Actual-API browser checks still required: <scenarios>

## Open decisions and next action

- Known gaps or incompatible changes: <facts>
- Required decisions: <question, impact, owner>
- Next task: <one bounded task with criteria and dependencies>

