# Traceability Drift Routine

Run this after implementation or during maintenance.

## Goal

Keep wiki claims, checks, wiki anchors, and code paths aligned.

## Checks

1. Acceptance criteria with no test or evidence.
2. Tests with no linked wiki ID.
3. `PW:` anchors that point to missing or renamed wiki IDs.
4. Code paths with no linked capability, story, or rule.
5. Changed code whose related wiki unit was not updated.
6. Wiki rules contradicted by implementation.

## Output

- Missing checks.
- Missing links.
- Invalid or missing `PW:` anchors.
- Code paths outside the wiki.
- Proposed wiki updates.
