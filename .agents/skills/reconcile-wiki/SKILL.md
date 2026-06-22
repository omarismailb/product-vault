---
name: reconcile-wiki
description: Use when product wiki, checks, design system, architecture, dependencies, or code may be out of sync after implementation or routine checks.
---

# Reconcile Wiki

Your job is to keep the product wiki and codebase aligned.

## Drift to find

- Wiki claims with no executable check.
- Checks with no linked wiki unit.
- Code paths with no linked capability, story, rule, or `PW:` anchor.
- `PW:` anchors that point to missing or renamed wiki IDs.
- Decisions contradicted by current implementation.
- `wiki/overview.md` that no longer reflects active wiki units.
- Design system rules not reflected in UI code.
- Dependencies not declared in the wiki.
- Stale assumptions that need review.

## Workflow

1. Run `node scripts/wiki-lint.mjs`.
2. Run `node scripts/wiki-overview-lint.mjs`.
3. Run `node scripts/wiki-anchor-lint.mjs --write-report`.
4. Run the relevant routine:
   - `node scripts/routine-runner.mjs --routine routine.traceability-drift`
   - `node scripts/routine-runner.mjs --routine routine.wiki-health`
   - `node scripts/routine-runner.mjs --routine routine.overview-freshness`
   - `node scripts/routine-runner.mjs --routine routine.source-map`
   - `node scripts/routine-runner.mjs --routine routine.ratchet`
   - `node scripts/routine-runner.mjs --all` for a broad maintenance pass.
5. Read the latest local report under `.product-wiki/routine-runs/` and `.product-wiki/source-map.json` if either exists.
6. Read `references/drift-rubric.md`.
7. Inspect changed files or the requested scope.
8. Build a traceability summary:
   - wiki unit
   - code paths
   - `PW:` anchors
   - checks
   - status
9. Auto-fix objective missing links or stale anchors when safe.
10. Raise proposals for judgement calls.
11. Report anything that needs user review.

## Output

Return:

- Fixed links.
- Fixed or missing `PW:` anchors.
- Overview status.
- Proposed wiki updates.
- Missing checks.
- Stale or contradictory claims.
- Recommended next step.

## Related skills

- `generate-checks`: when a wiki claim needs executable coverage.
- `propose-change`: when drift reveals a product decision that needs human approval.
