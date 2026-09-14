# Building frontend features with coding agents

Use this workflow for substantial Angular work that depends on product acceptance or a backend contract. Small, understood changes may use a short scoped plan and targeted checks. The accepted user request determines scope; this guide does not authorize implementation from a planning/review request or deployment/runtime access.

For repository patterns, read [Angular-Development.md](Angular-Development.md). For a complete example, see the explicitly illustrative [overtime walkthrough](MJD-Feature-Usage-Guide.md).

## Accepted inputs and acceptance criteria

Before implementation, identify:

1. The accepted specification and revision under `Features/<feature-id>/spec.md`, including user journeys, numbered acceptance criteria, permissions, validation, edge cases, compatibility constraints, and exclusions.
2. The backend handoff under `Features/<feature-id>/handoff.md`, with implemented versus proposed behavior clearly separated.
3. The exact implemented API contract artifact and backend revision/checksum that the frontend will consume.
4. The selected planning-with-files directory and current task/next action.
5. Relevant frontend source examples and actual repository commands.

Acceptance criteria describe observable behavior, not the current code shape. Include success, loading, empty, validation, denied, failure, safe retry, duplicate action, localization/direction, accessibility, and compatibility scenarios that matter to the slice. Do not silently weaken or rewrite criteria to make current code pass.

If a specification is missing, create a draft from [spec.template.md](Feature-Templates/spec.template.md) in plan mode and label it draft. If business behavior, access, compatibility, or contract decisions remain material, record the question and impact for acceptance before dependent implementation. Routine implementation decisions within accepted scope do not require repeated approval.

## Artifact locations

Use one feature ID across repositories where possible:

```text
Features/<feature-id>/
├── spec.md                 # durable accepted behavior and contract intent
├── handoff.md              # durable cross-repository/session state
└── <contract-artifact>     # agreed versioned OpenAPI/schema artifact, if copied here

.planning/<selected-plan-id>/
├── task_plan.md            # execution phases, dependencies, status, one next action
├── findings.md             # verified repository facts and unresolved assumptions
└── progress.md             # completed work, checks, failures, resume state
```

`Features/` artifacts are intended to be versioned. `.planning/` is ignored transient execution state in this repository. Verify instead of assuming:

```bash
git check-ignore -v .planning/<selected-plan-id>/task_plan.md
git check-ignore -v Features/<feature-id>/spec.md
git status --short -- Features/<feature-id>
```

No output from `git check-ignore` means the path is not ignored. Do not commit secrets, environment values, raw session transcripts, or oversized generated artifacts without an agreed location.

## Planning with files

For a substantial task, use the installed planning-with-files workflow. Reuse the selected task directory when resuming. If another task owns the selected plan, create a separate named plan and pin the host using the installed skill's supported selector. A variable set only inside a child shell does not reconfigure the running host.

Use [task_plan.template.md](Feature-Templates/task_plan.template.md), [findings.template.md](Feature-Templates/findings.template.md), and [progress.template.md](Feature-Templates/progress.template.md) only when the selected plugin/plan did not already provide suitable files. Never create a competing root plan.

- `task_plan.md` owns scope, phases, dependencies, status, and one current next action.
- `findings.md` owns verified facts with exact source paths, missing tools/contracts, and unresolved assumptions.
- `progress.md` owns implementation/evidence outcomes, failures, revisions, and resume state.
- Promote lasting product/contract decisions into `spec.md` or `handoff.md`; execution notes are not the accepted baseline.

Inspect the current Git diff whenever starting/resuming because planning notes can be stale. One owner updates a shared plan. Use separate worktrees/plans only when parallel work is explicitly requested and file/task ownership is independent.

## Contract revision and backend handoff

The frontend contract input is the accepted specification plus an implemented backend handoff and an actual versioned OpenAPI artifact tied to a backend revision. The artifact should identify a checksum/version and the command/tool/configuration that produced it. Compare metadata with representative real HTTP responses because OpenAPI may omit response envelopes or error semantics.

The handoff must record at least:

- operations, verbs, paths, success statuses, and envelopes;
- authentication, roles, ownership, and denial behavior;
- request fields, required/optional/null/omitted semantics, and validation limits;
- response fields, pagination/sorting, enums, dates/time zones, and concurrency tokens;
- error statuses, `messageKey` values, field/general details, and safe retry rules;
- file formats/headers and sanitized test data where applicable;
- backend revision, uncommitted state, checks performed, known gaps, and one next frontend task.

This repository currently has no OpenAPI export/import script, generated client, or CI drift check. Do not reconstruct a missing contract from prose and call it verified. Contract-aligned mocks can unblock component work when accepted, but mark the dependency and do not declare integration complete until checked against the actual backend revision.

When backend behavior changes, produce a new authoritative contract revision and update the handoff deliberately. Do not let backend/frontend agents maintain incompatible shapes in chat. A material breaking change requires an accepted specification/contract update before dependent implementation.

## Small end-to-end slices

Split work by user-visible flow rather than by all models, then all services, then all UI. A slice normally includes:

1. accepted UI behavior and contract;
2. backend implementation and contract/handoff readiness;
3. handwritten frontend type/service mapping (or the accepted generated-client step);
4. component/form states and access behavior;
5. focused component verification and an actual-backend browser scenario;
6. independent review and affected re-checks.

For example, “submit one request and display its result” is a slice; approval, history, cancellation, and reporting can be later slices. Each task names its acceptance criteria, repository/owner, dependencies, expected files, and verification.

## Skill usage and modes

Use the repository-local `mjd-feature` skill as the entry point. Codex reads `.agents/skills/mjd-feature/SKILL.md`; Claude Code reads `.claude/skills/mjd-feature/SKILL.md`. The two files are identical and route here, to [Angular-Development.md](Angular-Development.md), and to only the templates relevant to the selected mode.

Start a fresh agent session after adding or changing the skill. Invoke it in agent chat, not a shell:

| Mode | Codex | Claude Code |
|---|---|---|
| Plan | `$mjd-feature plan <feature>` | `/mjd-feature plan <feature>` |
| Implement | `$mjd-feature implement <task and artifact paths>` | `/mjd-feature implement <task and artifact paths>` |
| Resume | `$mjd-feature resume <exact plan path>` | `/mjd-feature resume <exact plan path>` |
| Review | `$mjd-feature review <diff/revision against spec and contract>` | `/mjd-feature review <diff/revision against spec and contract>` |
| Handoff | `$mjd-feature handoff <feature artifacts and target>` | `/mjd-feature handoff <feature artifacts and target>` |

If discovery is unavailable, tell the agent to read this guide and perform the mode explicitly. Do not claim the skill ran when it did not.

### Plan mode

Inspect the working tree, repository instructions, accepted inputs, installed versions, nearest source patterns, backend state, and tooling gaps. Create/update the draft/accepted spec and selected planning state. Resolve or isolate material uncertainties. Do not implement application code from a planning-only request.

### Implement mode

Read the exact task, selected plan, accepted spec, backend handoff, contract revision, progress, current diff, and relevant Angular source. Implement one accepted slice without inventing API/package behavior. Verify it, map criteria to evidence, update progress, and leave one next action where work remains.

### Resume mode

Re-read the selected `task_plan.md`, `findings.md`, and `progress.md`; confirm spec/handoff/contract revisions and inspect Git because notes may be stale. Continue the recorded next action within current authorization. Do not replay the whole original conversation or silently select another plan.

### Review mode

Inspect the requested diff/revision independently against the accepted spec, exact contract, repository rules, and recorded evidence. Report actionable findings with severity and file references, distinguish defects from unverified risks, and list checks not run. Do not edit application code unless fixes were requested.

### Handoff mode

Inspect actual implementation, diff, and evidence, then update `Features/<feature-id>/handoff.md` from [handoff.template.md](Feature-Templates/handoff.template.md). Separate implemented, verified, proposed, blocked, and unavailable work. Do not implement missing behavior merely to make a handoff look complete.

One implementation pass followed by a genuinely independent review is preferred. A different model can offer another perspective, but agreement is not evidence. Parallel agents are useful only for independent tasks with explicit ownership; one integrator owns the shared plan and contract alignment.

## Verification against the actual backend

Map every criterion to the strongest appropriate evidence:

- component tests for form validation, mapping, interactions, pending/duplicate actions, loading/empty/error/retry/denied/success states;
- service tests for request construction/error mapping if suitable infrastructure is added;
- a browser flow using the exact backend and contract revision for important journeys and failure paths;
- accessibility, English/LTR, and Arabic/RTL checks for changed UI.

The current repository has only four creation smoke specs and no browser-test runner. Discover and report real test counts. `npm run build` proves compilation, not business behavior. A mock proves only the mocked interaction. Do not start the frontend or backend against an unspecified environment; runtime verification must state frontend/backend revisions, environment, role/test data, scenario, outcome, and gaps.

Record checks as `passed`, `failed`, or `not run`, including exact command/scenario. A skipped or zero-test run does not verify a criterion. Fix material review findings and rerun affected checks before completion.

## Requirement and contract changes

Agents may update routine task status and implementation notes within accepted scope. For a material change to behavior, permission, exclusion, compatibility, endpoint, schema, or semantics:

1. Record the proposed change, evidence, affected criteria/tasks, contract impact, migration/rollout concerns, and decision owner.
2. Continue only independent work while acceptance is pending.
3. After acceptance, update the durable `spec.md` baseline without erasing history, then update contract intent/tasks.
4. Obtain/review the new implemented backend contract and refresh `handoff.md`.
5. Re-run all component/integration/browser checks affected by the change.

Never edit old criteria to hide incomplete behavior. If the implemented backend contradicts the accepted contract, report the mismatch rather than adapting the frontend silently.

## Session boundaries and efficient context

Before compaction, a new session, or handoff, record:

- spec, handoff, contract, frontend, and backend revisions;
- current phase/task and criteria implemented versus verified;
- real Git state and relevant changed paths;
- checks, outcomes, counts, environment, and gaps;
- open decisions/blockers and one next action.

On resume, load those exact artifacts and only the active task's source references. Link to code/contracts instead of pasting interfaces or logs. Keep large command output out of the plan; store concise conclusions once. Start a fresh session at a clean task boundary, and archive stale findings only after durable conclusions are promoted. Optimize for low rework as well as low token count.

## Completion and handoff checklist

- The accepted specification and exact implemented contract revision agree with the frontend mapping.
- Every in-scope criterion has implementation and honest evidence, or an explicit owner/gap.
- Loading, empty, validation, denied, failure, retry, duplicate-submit, and success behavior is verified where relevant.
- Authentication/authorization assumptions are checked against the server; protected data is not exposed during redirects/errors.
- English/LTR, Arabic/RTL, accessibility, and responsive behavior are checked for changed UI.
- Applicable build/tests and actual-backend browser scenarios have recorded outcomes and counts; unavailable infrastructure is stated.
- Independent review findings are resolved or accepted with owner/impact.
- The final diff contains only intended work, `git diff --check` passes, and durable artifacts/skills are visible to Git.
