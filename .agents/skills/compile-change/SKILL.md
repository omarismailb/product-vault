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
   - rules to regression checks
   - journeys to integration or E2E checks where appropriate
   - update `checks/manifest.json` so every acceptance criterion in the approved change has a command that will run against code
5. Plan the edit:
   - files
   - interfaces
   - data paths
   - risk points
   - `PW:` anchors to add or update at important implementation boundaries
   - use `templates/compiler-plan-template.md` when the change is medium or high risk
6. For behaviour changes, use a red-green loop:
   - add the smallest failing check for the next acceptance criterion
   - run it and confirm it fails for the expected reason
   - implement the smallest code change
   - run it again and confirm it passes
7. Implement the smallest coherent code change.
8. Add or update `PW:` anchors at important routes, services, workflows, domain modules, and tests.
   Use anchors as signposts, not comments on every line.
9. Run checks, including `node scripts/checks-lint.mjs --run`, `node scripts/wiki-anchor-lint.mjs --write-report`, `node scripts/ratchet-lint.mjs`, and the product repo's normal test command.
10. Reconcile the wiki:
   - update traceability
   - update dependency links
   - update or review the local source map in `.product-wiki/source-map.json`
   - record decisions or assumptions discovered during implementation
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
