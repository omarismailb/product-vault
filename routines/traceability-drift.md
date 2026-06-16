# Traceability Drift Routine

Run this after implementation or during maintenance.

## Goal

Keep wiki claims, checks, and code paths aligned.

## Checks

1. Acceptance criteria with no test or evidence.
2. Tests with no linked wiki ID.
3. Code paths with no linked capability, story, or rule.
4. Changed code whose related wiki unit was not updated.
5. Wiki rules contradicted by implementation.

## Output

- Missing checks.
- Missing links.
- Code paths outside the wiki.
- Proposed wiki updates.

