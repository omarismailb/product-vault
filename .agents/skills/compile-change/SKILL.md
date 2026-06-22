---
name: compile-change
description: Use when an approved product wiki change needs implementation, checks, verification evidence, or reconciliation with code.
---

# Compile Change

Your job is to compile an approved product wiki change into code and executable checks.
Use the lightest safe path.

## Template contract

For medium or high-risk changes, load `templates/compiler-plan-template.md` before implementation.
If the template is missing, do not invent a plan shape from memory.
First run `node scripts/repair-contracts.mjs --write`, then re-run `node scripts/template-lint.mjs`.
Continue if repair succeeds.
Stop only if the canonical contract cannot be restored.

## Choose path by blast radius

Read `references/blast-radius-rubric.md` before choosing the path.

Use a light path when the change is tiny, mechanical, and has no product or architecture impact.

Use the full path when the change affects behaviour, user journeys, data, security, architecture, dependencies, or multiple modules.

## Full path

1. Apply or confirm the approved wiki change.
2. Locate the blast radius:
   - `wiki/overview.md`
   - wiki units
   - existing `PW:` wiki anchors from code search
   - code paths
   - tests
   - dependencies
   - design system files
3. Decide reuse or refactor:
   - reuse existing capability where possible
   - raise a refactor proposal before adding fragile branches
4. Define executable checks before application code:
   - acceptance criteria to tests
   - for each acceptance criterion, apply the edge-case triggers in `.agents/skills/generate-checks/references/check-patterns.md` (boundary, cardinality, round-trip, time and calendar, ordering, presence, identity; plus state and scale when introduced) and add a check for every trigger it matches, not only the happy path
   - rules to regression checks
   - journeys to integration or E2E checks where appropriate
   - update `checks/manifest.json` so every acceptance criterion in the approved change has a command that will run against code
   - register a runnable command that names a real test file for each acceptance criterion; see `references/blast-radius-rubric.md` for the command and shell-quoting gotchas
5. Plan the edit:
   - files
   - interfaces
   - data paths
   - risk points
   - `PW:` anchors to add or update at important implementation boundaries
   - use `templates/compiler-plan-template.md` when the change is medium or high risk
   - save the compiler plan under `docs/compiler-plans/`, never in `intake/proposals/` (proposal-lint treats every file there as a proposal and will fail it)
6. For behaviour changes, use a red-green loop:
   - add the smallest failing check for the next acceptance criterion
   - run it and confirm it fails for the expected reason
   - implement the smallest code change
   - run it again and confirm it passes
7. Implement the smallest coherent code change.
8. Add or update `PW:` anchors at important routes, services, workflows, domain modules, and tests.
   Use anchors as signposts, not comments on every line.
   Every active `capability` and `rule` unit must carry at least one `PW:` anchor in code, or `wiki-anchor-lint` fails.
9. Run checks, including `node scripts/checks-lint.mjs --run`, `node scripts/wiki-anchor-lint.mjs --write-report`, `node scripts/ratchet-lint.mjs`, and the product repo's normal test command.
10. Reconcile the wiki:
   - review `wiki/overview.md` if implementation changes the whole-product map
   - update traceability
   - update dependency links
   - update or review the local source map in `.product-wiki/source-map.json`
   - record decisions or assumptions discovered during implementation
   - keep each unit's `## What it does for you` in plain product language; move any implementation detail you add during compile under `## How it works`, never into the product prose
   - design system, important: adding any UI file turns on the design-system lint cascade; see `references/blast-radius-rubric.md` before introducing UI, or keep the change UI-free
11. Mark the proposal `implemented` only after the manifest coverage and code checks pass.
12. Run `node scripts/product-wiki-check.mjs`.

## Production questions

For production changes, ask:

- Does this cross a trust boundary?
- Does this affect permissions, secrets, auth, or user data?
- Does this require migration or backward compatibility?
- Will we know if it fails in production?
- Is rollback obvious?

## Output

Return:

- Proposal compiled.
- Checks added or run.
- Code paths changed.
- `PW:` anchors added or updated.
- Verification evidence.
- Wiki reconciliation notes.

## Related skills

- `generate-checks`: when acceptance criteria do not yet have executable checks.
- `review-architecture`: when reuse, data ownership, module boundaries, or refactor pressure are material.
- `reconcile-wiki`: after implementation.
