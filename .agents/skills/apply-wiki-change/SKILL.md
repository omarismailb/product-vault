---
name: apply-wiki-change
description: Use when the user has approved a Product Wiki proposal and the wiki needs to be updated before implementation.
---

# Apply Wiki Change

Your job is to apply an approved proposal to the product wiki.
This is the point where the wiki changes before code.

## Preconditions

- Proposal exists under `intake/proposals/`.
- Proposal status is `approved`, or the user explicitly approves it in the current conversation.
- Application code is not edited during this skill.
- `templates/wiki-unit-template.md` exists and can be read.
- `templates/wiki-overview-template.md` exists and can be read.

If a template is missing, do not infer wiki unit or overview structure from schemas, lints, previous examples, or memory.
First run `node scripts/repair-contracts.mjs --write`, then re-run `node scripts/template-lint.mjs`.
Continue if repair succeeds.
Stop only if the canonical contract cannot be restored.

## Workflow

1. Read the approved proposal.
2. Read `templates/wiki-unit-template.md`, `templates/wiki-overview-template.md`, and `references/wiki-write-rubric.md`.
3. Build a unit application table from the proposal:
   - unit ID
   - unit type
   - create / update / link / supersede / none
   - target file
   - source section in the proposal
4. Write or update the smallest possible set of files under `wiki/`, using `templates/wiki-unit-template.md` for new units.
   Follow `references/wiki-write-rubric.md` for two-way linking, the product-language vs implementation-detail split, and the connectivity rule.
5. Apply acceptance criteria as first-class wiki units under `wiki/acceptance-criteria/`, not only as bullets inside a story.
6. Keep the proposal status as `approved`.
   Do not mark it `implemented` until `compile-change` has added executable checks and code.
7. Preserve existing IDs. Do not rename IDs unless the proposal explicitly says so.
8. For decisions, supersede old decisions instead of deleting or rewriting historical rationale.
9. Update related links in both directions when safe, keeping every unit connected per the connectivity rule in `references/wiki-write-rubric.md`.
10. Update `wiki/index.md` if a new unit family or important entry needs discovery.
11. Review `wiki/overview.md`.
    Update it when the change affects what the product is, who it serves, main journeys, main capabilities, important rules, boundaries, or key decisions.
    If the overview is still accurate, refresh its `updated` date and review notes.
12. Append a dated entry to `wiki/log.md`.
13. Re-read the proposal and verify every proposed wiki change is represented or explicitly deferred.
14. Run `node scripts/wiki-lint.mjs`.
15. Run `node scripts/wiki-overview-lint.mjs`.
16. Run `node scripts/wiki-link-lint.mjs`.
17. Run `node scripts/proposal-lint.mjs`.
18. Run `node scripts/proposal-traceability-lint.mjs`.
19. Stop before implementation.

At this stage, approved acceptance criteria are pending compile.
They do not need manifest coverage yet.
The full `node scripts/product-wiki-check.mjs` gate should pass after `compile-change` has added check coverage, implemented code, and marked the proposal `implemented`.

## Output

Return:

- Files changed.
- New or updated stable IDs.
- Proposal units applied / deferred.
- Whether `wiki/overview.md` changed or was reviewed unchanged.
- Any missing links or open decisions.
- Confirmation that wiki and proposal lints passed, or the exact failures.
