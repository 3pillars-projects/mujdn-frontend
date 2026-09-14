# Task Plan: <feature-id>

## Goal

<Observable end state. Accepted specification: exact path and revision.>

## Next Step

<One concrete action; refresh whenever the phase changes.>

## Current Phase

Phase 1

## References and ownership

- Specification: <path/revision>
- Backend handoff: <path/revision>
- Contract: <path/version/checksum and backend revision, or explicitly pending>
- Frontend/backend branches: <references and uncommitted state>
- Shared plan owner: <owner>

## Phases

Use `pending`, `in_progress`, or `complete`. Duplicate Phase 2 for more small slices. Implementation with outstanding checks is not verified.

### Phase 1: Discovery and accepted design

- [ ] Inspect instructions, current diffs, commands, and representative source in both repositories.
- [ ] Resolve material requirements and record the accepted spec baseline.
- [ ] Review the implemented backend handoff and exact contract revision.
- **Status:** in_progress

### Phase 2: <Small user-visible slice>

| Task | Criteria | Owner/repository | Dependencies | Expected areas | Verification | Status |
|---|---|---|---|---|---|---|
| T01 | AC-01 | <owner/frontend> | <contract/task> | <paths> | <component/API/browser check> | pending |

- [ ] Implement without inventing API/package behavior.
- [ ] Verify loading, empty, validation, denied, failure/retry, duplicate-action, and success paths that apply.
- [ ] Update progress with exact outcomes and gaps.
- **Status:** pending

### Phase 3: Integration, review, and handoff

- [ ] Verify important journeys against the exact backend revision in a deliberate environment.
- [ ] Review spec, contract, diff, and evidence independently.
- [ ] Resolve material findings, rerun affected checks, and update durable handoff.
- **Status:** pending

## Decisions Made

| Decision | Evidence and accepted-spec reference |
|---|---|
| <routine choice or accepted material change> | <reference> |

## Errors Encountered

| Error | Attempt | Resolution or next different approach |
|---|---|---|
| <error> | <number> | <action> |

