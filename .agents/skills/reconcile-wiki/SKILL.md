---
name: reconcile-wiki
description: Use after implementation or during maintenance to find drift between product wiki, tests, design system, architecture, dependencies, and code.
---

# Reconcile Wiki

Your job is to keep the product wiki and codebase aligned.

## Drift to find

- Wiki claims with no executable check.
- Checks with no linked wiki unit.
- Code paths with no linked capability or story.
- Decisions contradicted by current implementation.
- Design system rules not reflected in UI code.
- Dependencies not declared in the wiki.
- Stale assumptions that need review.

## Workflow

1. Run `node scripts/wiki-lint.mjs`.
2. Run the relevant routine:
   - `node scripts/routine-runner.mjs --routine routine.traceability-drift`
   - `node scripts/routine-runner.mjs --routine routine.wiki-health`
   - `node scripts/routine-runner.mjs --all` for a broad maintenance pass.
3. Read the latest local report under `.product-wiki/routine-runs/` if one was created.
4. Read `references/drift-rubric.md`.
5. Inspect changed files or the requested scope.
6. Build a traceability summary:
   - wiki unit
   - code paths
   - checks
   - status
7. Auto-fix objective missing links when safe.
8. Raise proposals for judgement calls.
9. Report anything that needs user review.

## Output

Return:

- Fixed links.
- Proposed wiki updates.
- Missing checks.
- Stale or contradictory claims.
- Recommended next step.

## Related skills

- `generate-checks`: when a wiki claim needs executable coverage.
- `propose-change`: when drift reveals a product decision that needs human approval.
