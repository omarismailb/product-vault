---
name: generate-checks
description: Use when product wiki acceptance criteria, rules, journeys, or outcomes need executable checks, regression tests, evaluations, or verification evidence.
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
5. Apply the edge-case triggers in `references/check-patterns.md`.
   For each criterion, add a check for every trigger it matches, not only the happy path, and record any matched trigger you deliberately leave unchecked.
6. For behaviour changes, write the smallest check first and run it before implementation.
   Confirm it fails for the expected reason when the behaviour is not yet implemented.
7. Link the check back to the wiki unit by stable ID.
   Add a `PW:` anchor in the test when it helps the agent jump from the wiki claim to the check.
8. Update `checks/manifest.json` when the check should remain part of the product contract.
9. Run the check.
10. Run `node scripts/checks-lint.mjs --run` and `node scripts/wiki-anchor-lint.mjs`.

## Output

Return:

- Wiki IDs covered.
- Checks added.
- `PW:` anchors added where useful.
- Command run.
- Result.
- Whether the check was observed failing before implementation, when applicable.
- Edge-case triggers each criterion matched, and which check covers each (or why a match is deliberately left unchecked).
- Any acceptance criteria still uncovered.

## Related skills

- `compile-change`: when checks are part of an implementation.
- `reconcile-wiki`: when finding missing coverage after implementation.
