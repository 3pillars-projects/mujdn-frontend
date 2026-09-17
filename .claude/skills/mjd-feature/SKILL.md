---
name: mjd-feature
description: Plan, implement, resume, review, or hand off substantial MJD Attendance Angular features using an accepted specification, exact backend handoff/API contract revision, repository patterns, and recorded verification. Use for frontend feature work that requires cross-session planning or backend coordination.
---

# MJD frontend feature workflow

This is a repository-local router. Resolve links relative to this file; the repository root is three directories above it.

1. Read [AGENTS.md](../../../AGENTS.md), the requested mode in [Agent-Workflow.md](../../../Agent-Workflow.md), and the relevant parts of [Angular-Development.md](../../../Angular-Development.md).
2. Select only `plan`, `implement`, `resume`, `review`, or `handoff` as requested or clearly implied. Planning/review does not authorize implementation; handoff does not authorize filling missing behavior.
3. Before contract-dependent work, inspect the accepted `Features/<feature-id>/spec.md`, backend `handoff.md`, exact implemented contract artifact/revision/checksum, current diff, and selected planning-with-files state. Label a missing/unaccepted input; never reconstruct it from examples.
4. Reuse the selected plan. If another task owns it, create/select a separate named plan according to the root workflow. Do not create a competing root plan.
5. Load templates only for the mode: plan uses [spec](../../../Feature-Templates/spec.template.md) plus selected-plan [task](../../../Feature-Templates/task_plan.template.md)/[findings](../../../Feature-Templates/findings.template.md); implement/resume updates [progress](../../../Feature-Templates/progress.template.md); handoff uses [handoff](../../../Feature-Templates/handoff.template.md); review needs no output template unless requested.
6. Verify every unfamiliar endpoint, request/response/error field, package API, and command in the supplied contract or repository files. Do not invent them, select an environment, or treat mocks/builds as actual-backend verification.
7. Carry out the bounded mode, preserve unrelated work and accepted criteria, record concrete evidence/gaps, and leave one next action when work remains.

Shared procedure changes belong in the root guides. Keep this file byte-identical to the other host's `SKILL.md`.

