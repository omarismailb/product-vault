# Architecture Review Rubric

Use this when a change touches architecture, data ownership, module boundaries, or refactor pressure.

## Review stance

Assume the change may be trying to add a second path where one already exists.
Your job is to protect reuse, modularity, and the ability to change the system later.

## Questions

- Which existing capability owns this behaviour?
- Is the proposed change a new capability or an extension of an old one?
- Would this create duplicate paths?
- Which module owns the data?
- Which interface changes?
- What existing tests describe the boundary?
- Does this cross auth, payment, privacy, or data trust boundaries?
- Does it need migration, rollback, or observability?
- Is a small preparatory refactor safer than layering the feature on top?

## Verdicts

Use one of:

- Proceed.
- Proceed with small refactor.
- Stop and write a refactor proposal.
- Stop and clarify product intent.

## Output shape

```markdown
## Architecture review

Verdict:

Reuse recommendation:

Boundary risks:

Refactor pressure: low / medium / high

Required checks:

Decision to record:
```
