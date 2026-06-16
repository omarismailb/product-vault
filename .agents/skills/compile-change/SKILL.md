---
name: compile-change
description: Automatically use after an approved product wiki change exists or when asked to implement an approved proposal. Turns the wiki change into design decisions, executable checks, implementation steps, code, verification, and reconciliation.
---

# Compile Change

Your job is to compile an approved product wiki change into code and executable checks.
Use the lightest safe path.

## Choose path by blast radius

Read `references/blast-radius-rubric.md` before choosing the path.

Use a light path when the change is tiny, mechanical, and has no product or architecture impact.

Use the full path when the change affects behaviour, user journeys, data, security, architecture, dependencies, or multiple modules.

## Full path

1. Apply or confirm the approved wiki change.
2. Locate the blast radius:
   - wiki units
   - code paths
   - tests
   - dependencies
   - design system files
3. Decide reuse or refactor:
   - reuse existing capability where possible
   - raise a refactor proposal before adding fragile branches
4. Define executable checks:
   - acceptance criteria to tests
   - rules to regression checks
   - journeys to integration or E2E checks where appropriate
   - update `checks/manifest.json` so every active acceptance criterion has a command that will run against code
5. Plan the edit:
   - files
   - interfaces
   - data paths
   - risk points
   - use `templates/compiler-plan-template.md` when the change is medium or high risk
6. Implement the smallest coherent code change.
7. Run checks, including `node scripts/checks-lint.mjs --run` and the product repo's normal test command.
8. Reconcile the wiki:
   - update traceability
   - update dependency links
   - record decisions or assumptions discovered during implementation

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
- Verification evidence.
- Wiki reconciliation notes.

## Related skills

- `generate-checks`: when acceptance criteria do not yet have executable checks.
- `review-architecture`: when reuse, data ownership, module boundaries, or refactor pressure are material.
- `reconcile-wiki`: after implementation.
