---
name: generate-checks
description: Use when acceptance criteria, rules, or journeys need executable tests, regression cases, or evaluation fixtures.
---

# Generate Checks

Your job is to turn product wiki claims into checks that run against code.

## Inputs

- Acceptance criteria.
- Product rules.
- Journeys or flows.
- Outcomes when measurable.
- Existing test conventions.

## Workflow

1. Read the relevant wiki units.
2. Read `references/check-patterns.md`.
3. Locate current test patterns.
4. Choose the check type:
   - unit
   - integration
   - E2E
   - lint
   - typecheck
   - eval
   - manual evidence
5. Write the smallest useful check.
6. Link the check back to the wiki unit by stable ID.
7. Update `checks/manifest.json` when the check should remain part of the product contract.
8. Run the check.

## Output

Return:

- Wiki IDs covered.
- Checks added.
- Command run.
- Result.
- Any acceptance criteria still uncovered.

## Related skills

- `compile-change`: when checks are part of an implementation.
- `reconcile-wiki`: when finding missing coverage after implementation.
