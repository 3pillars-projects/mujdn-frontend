# Using `mjd-feature`: illustrative overtime submission

> **Illustrative only:** employee overtime submission is not established by this frontend repository. The endpoints, fields, rules, statuses, permissions, and UI below are hypothetical workflow examples until a team accepts a specification and the backend implements and exports the matching contract.

This walkthrough shows how to use the repository-local `mjd-feature` skill to plan, implement, resume, review, and hand off one bounded Angular slice. The authoritative procedure is [Agent-Workflow.md](Agent-Workflow.md); actual code conventions are in [Angular-Development.md](Angular-Development.md).

## 1. Start planning

Start Codex or Claude Code at the repository root after confirming the skill is discoverable. Use an agent prompt, not a shell command:

```text
Codex: $mjd-feature plan employee overtime submission
Claude Code: /mjd-feature plan employee overtime submission
```

Add the product goal, known constraints, exact backend artifact locations, and a planning-only boundary. For example:

```text
$mjd-feature plan employee overtime submission.

Draft a frontend specification for an authenticated employee to submit one
overtime request and see the result. Inspect both repositories and identify
unresolved permissions, time-zone, overlap, duration, and retry decisions.
Use the selected planning-with-files plan. Do not implement application code,
and do not treat the illustrative endpoint or fields in the usage guide as real.
```

The agent should inspect current Git state, [repository rules](AGENTS.md), source examples, `package.json`/lockfile/workspace configuration, the backend handoff, and exact contract revision. It must move unknown endpoints, package APIs, commands, and rules into unresolved findings rather than guessing them.

## 2. Create the artifacts

Durable accepted behavior is separate from mutable execution state:

```text
Features/overtime-submission/
├── spec.md                 # copied from spec.template.md; draft then accepted
├── handoff.md              # backend/frontend transfer state
└── openapi.json            # illustrative location only; use the agreed artifact path

.planning/<selected-plan-id>/
├── task_plan.md
├── findings.md
└── progress.md
```

Use [Feature-Templates/README.md](Feature-Templates/README.md) to select templates. Do not create a second plan if planning-with-files already selected one. This repository ignores `.planning/`; `Features/` is not ignored by the repository rules. Verify both facts for the exact paths:

```bash
git check-ignore -v .planning/<selected-plan-id>/task_plan.md
git check-ignore -v Features/overtime-submission/spec.md
git status --short -- Features/overtime-submission
```

The specification stays `draft` until the material behavior and contract decisions are accepted. Chat text and `findings.md` do not replace that baseline.

## 3. Draft frontend acceptance criteria

The following sample is deliberately frontend-focused and hypothetical:

| ID | Illustrative Given / When / Then | Suggested evidence |
|---|---|---|
| AC-F01 | Given an authenticated employee and contract-valid values, when submission succeeds, then the UI displays the returned Pending request exactly once. | Component test plus actual-backend browser scenario |
| AC-F02 | Given an invalid interval, when the employee submits, then client validation prevents the request, identifies the fields accessibly, and preserves all values. | Component validation/DOM assertions |
| AC-F03 | Given a contracted server validation error, when it is returned, then the form stays open with values intact and shows the localized field/general message. | Component service-stub test plus API scenario |
| AC-F04 | Given a submission is in flight, when the employee activates submit again, then no duplicate request is sent and pending state is visible. | Component interaction/count assertion |
| AC-F05 | Given a recoverable network/server failure, when it settles, then controls are restored, context remains, and an explicit retry can submit once. | Component failure/retry test |
| AC-F06 | Given the server returns unauthenticated or forbidden, then the UI follows the accepted login/denied behavior and never renders protected response data. | Component/router assertion plus API browser check |
| AC-F07 | Given English/LTR or Arabic/RTL, then labels, validation, status, accessible names, order, and direction are usable. | Bilingual component/manual accessibility check |

The team still has to decide, for example, employee identity/ownership, allowed dates, overnight intervals, time zone, maximum duration, overlap/duplicate semantics, attachments, success status/envelope, retry/idempotency, and whether Pending is the real serialized status. Record accepted answers in `spec.md`; do not infer them from other request types.

## 4. Consume a versioned backend handoff

Do not begin contract-dependent code from a proposed prose route. Require these inputs:

- accepted `Features/overtime-submission/spec.md` revision;
- backend `handoff.md` identifying implemented/proposed/unavailable behavior;
- actual OpenAPI artifact version/checksum and the backend commit that produced it;
- note of any uncommitted backend changes;
- sanitized request/response/error examples checked against the real API;
- auth/ownership, dates/time zones, enums, null/omitted fields, pagination/concurrency/file semantics, and retry/idempotency notes.

A handoff might say that contract revision `sha256:<checksum>` was exported from backend commit `<commit>`. Confirm that its operation, schema, envelope, and error definitions match representative HTTP responses. If they do not, stop dependent mapping and record the mismatch for backend resolution.

The hypothetical operation below exists only to show how to read an artifact:

```http
POST /api/overtime-requests
```

Do not add that path or fields such as `startsAt`, `endsAt`, or `reason` unless they are present in the accepted implemented contract. This frontend has no generator workflow; either perform the accepted handwritten mapping or complete separately accepted generator setup. Never call prose a generated contract.

## 5. Plan a bounded Angular task

After backend handoff readiness, a task can be scoped like this:

| Task | Depends on | Result | Criteria |
|---|---|---|---|
| T-FE01 | Accepted spec + exact contract/handoff | Handwritten request/response mapping and service method | Contract alignment evidence |
| T-FE02 | T-FE01 | Routed/form UI with validation and complete user-visible states | AC-F01–F07 |
| T-FE03 | T-FE02 | Focused component verification | AC-F01–F07 |
| T-INT01 | Backend available at deliberate local/test environment | Real API browser success/failure flows | Integration evidence |
| T-REV01 | Prior tasks | Independent spec/contract/diff/evidence review | Findings resolved or owned |

Keep submission as the slice. History, approval, cancellation, payroll/reporting, or attachments are separate unless accepted explicitly.

An implementation prompt names exact paths and revision:

```text
$mjd-feature implement T-FE02 from
.planning/<selected-plan-id>/task_plan.md using
Features/overtime-submission/spec.md,
Features/overtime-submission/handoff.md, and contract sha256:<checksum>.

Implement only the accepted overtime submission form. Follow verified nearby
Angular patterns, preserve all entered values on server validation/failure,
prevent duplicate submission, and implement localized loading, validation,
denied, failure, retry, and success states. Do not invent API fields, endpoints,
commands, or packages. Record checks and one next action.
```

For Claude Code, replace `$mjd-feature` with `/mjd-feature`.

## 6. Implement the form behavior

The agent first selects patterns based on actual shape:

- [City popup](src/views/features/lookups/city/city-popup/city-popup.component.ts) shows the common base-popup/reactive-model pattern for simple CRUD.
- [Notification settings](src/views/features/settings/notification-settings/notification-settings.component.ts) shows explicit load/save flags, cross-field validation, disabled state, concurrency checks, and retry-by-reload behavior.
- [Attachment upload](src/views/shared/attachment-upload/attachment-upload.component.ts) shows focused signals, custom-control validation, async pending state, cleanup, and accessible busy UI.
- [HTTP interceptors](src/http-interceptors) define global loading/session/error behavior and local opt-out obligations.

Choose the smallest pattern that fits the accepted operation. A custom workflow should not be forced into `BasePopupComponent`; a simple contracted CRUD form should not duplicate base behavior without a reason.

The illustrative submission UX should satisfy all accepted details:

1. Build controls from exact contract fields and constraints. Cross-field time validation must use the accepted zone/overnight rule.
2. Mark controls touched when invalid and focus or announce the first meaningful problem.
3. On submit, guard if invalid or already pending; display progress and disable conflicting actions.
4. Send one mapped request through the feature service. Do not send employee identity if the accepted self-service contract derives it server-side.
5. On server validation, keep values and map the contracted error details locally.
6. On 401/403, follow the established session/denied flow without rendering protected data.
7. On recoverable failure, restore controls and provide a localized retry. Retry creates one new attempt only; do not automatically replay an unsafe mutation unless the contract provides idempotency.
8. On success, use the actual response, display the result once, clear/navigate only as specified, and show translated success feedback.
9. Verify all behavior in English/LTR and Arabic/RTL with semantic labels, keyboard operation, focus, and announced status/errors.

The global loading interceptor can cover ordinary HTTP progress, but a form-specific pending state is still needed for duplicate-submit and accessible feedback. `exhaustMap` in the popup base ignores parallel save emissions; it does not by itself show pending state or prove the backend avoided duplicates.

## 7. Verify the component and browser flow

Add focused tests that exercise behavior, not another creation-only spec. Examples include:

- invalid interval sends zero requests and exposes localized validation;
- valid submit maps exactly the contracted request;
- two rapid activations produce one request;
- server validation preserves inputs and renders the correct error;
- recoverable failure restores controls, and one retry sends one attempt;
- denied response follows the accepted navigation/message and hides data;
- success renders the contracted result once;
- English/Arabic accessible labels and direction-dependent behavior are present.

Run only actual repository commands and record discovered counts:

```bash
npm test
npm run build
```

The repository currently has no browser-test script. For integration, deliberately select a safe local/test frontend and backend configuration, record both revisions plus contract checksum and test role/data, then execute the accepted manual browser scenarios. At minimum cover success, client validation, contracted server validation, duplicate activation, failure/retry, and denied/session behavior that applies.

Do not start either application against an unspecified backend. A mocked service or successful build does not establish API compatibility.

## 8. Request an independent review

Use a fresh session or independent reviewer with artifacts, not just the implementer's summary:

```text
$mjd-feature review the overtime frontend diff against
Features/overtime-submission/spec.md,
Features/overtime-submission/handoff.md, and contract sha256:<checksum>.

Check each criterion, request/response/error mapping, auth and data exposure,
time-zone boundaries, duplicate/retry behavior, loading/empty/error/success UI,
English/Arabic direction and accessibility, tests, and unsupported completion
claims. Report findings with severity and file references. Do not edit code.
```

After fixes, rerun checks affected by those fixes and update `progress.md`. Another agent's approval does not replace evidence.

## 9. Resume after compaction or a new session

Persist resume state before the boundary, then give the next session exact references:

```text
$mjd-feature resume .planning/<selected-plan-id>/task_plan.md using
Features/overtime-submission/spec.md,
Features/overtime-submission/handoff.md, and contract sha256:<checksum>.

Read findings and progress, inspect the current Git diff because notes can be
stale, continue the recorded next action, verify it, and update progress.
```

Resume state should answer: accepted goal/revision, current task, real Git changes, criteria implemented/verified, checks passed/failed/not run, blockers, and one next action. Never select a different plan by recency when an exact plan is known.

## 10. Handle a changed requirement

Suppose the team proposes supporting evidence attachments. That may change form state, staging lifecycle, request schema, backend persistence, error keys, retry/cancellation behavior, and verification. It is not part of illustrative submission merely because this repository already has attachment components.

Before implementation:

1. Record the proposed change and impact in the durable specification decision log.
2. Add/adjust observable criteria after acceptance without rewriting history.
3. Update contract intent and planning dependencies.
4. Wait for/review the implemented OpenAPI revision and backend handoff.
5. Reuse [the established attachment components](src/views/shared/attachment-upload/attachment-upload.component.ts) only if their keep/stage/release contract matches the accepted API.
6. Refresh the handoff and rerun affected component and actual-backend browser scenarios.

If acceptance is pending, continue only work independent of attachments. Never modify criteria or client fields silently to follow a backend draft.

## 11. Save tokens between sessions

- Pass task ID, exact plan/spec/handoff paths, and contract checksum instead of repeating the full feature story.
- Link relevant source files instead of pasting components or schemas.
- Keep one current next action in `task_plan.md`; keep verified facts and unknowns in `findings.md`.
- Record each command/scenario outcome and test count once in `progress.md`; summarize long logs outside the prompt.
- Promote accepted decisions to `spec.md`/`handoff.md`, then archive stale working notes.
- Start a fresh session at a clean task/review boundary. Use parallel agents only for independent owned work; extra agents can increase total tokens and rework.

## 12. Finish the illustrative slice

The example would be complete only if the accepted specification and implemented contract agree, all in-scope criteria have implementation and honest evidence, the Angular flow passes against the exact backend revision, bilingual/accessibility behavior is checked, independent findings are resolved or owned, and the handoff identifies remaining gaps. None of those conditions is claimed for overtime by this documentation example.
