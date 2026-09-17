# Feature templates

Use these with [Agent-Workflow.md](../Agent-Workflow.md). They are starting points, not accepted requirements. Replace placeholders, remove non-applicable sections, and label unavailable evidence.

| Template | Destination and purpose |
|---|---|
| [Specification](spec.template.md) | Versioned `Features/<feature-id>/spec.md`: accepted behavior, criteria, contract intent, exclusions |
| [Task plan](task_plan.template.md) | Selected `.planning/<plan-id>/task_plan.md`: phases, dependencies, status, next action |
| [Findings](findings.template.md) | Same selected plan as `findings.md`: verified paths/facts and unresolved assumptions |
| [Progress](progress.template.md) | Same selected plan as `progress.md`: evidence, failures, and resume state |
| [Handoff](handoff.template.md) | Versioned `Features/<feature-id>/handoff.md`: backend/contract/frontend transfer state |

Reuse planning files created by planning-with-files; never create a second plan just to use these templates. Durable specifications and handoffs belong under `Features/`; execution state belongs under `.planning/` and is ignored here.

Before relying on Git transfer, run `git check-ignore -v <exact-path>` and `git status --short -- <exact-path>`. `Features/` and both repository-local skill paths are intended to remain visible to Git.

