---
name: review-architecture
description: Use when a change affects architecture, reuse, data ownership, module boundaries, dependencies, security, migration, or refactor pressure.
---

# Review Architecture

Your job is to decide whether the current architecture can absorb the change cleanly.
You are not here to invent a large redesign.
Prefer the smallest refactor that makes the change safe.

## Review questions

Read `references/architecture-review-rubric.md` before producing the review.

- Which existing capability should be reused?
- Would this create a duplicate path?
- Which module owns the data?
- Which interface or contract changes?
- Does this cross a trust boundary?
- Does this add a special case to a module that is already too broad?
- Is a preparatory refactor needed first?
- What is the rollback path?

## Output

Return:

- Reuse recommendation.
- Boundary and dependency risks.
- Refactor pressure: low, medium, high.
- Security or data concerns.
- Required checks.
- Recommendation: proceed, proceed with small refactor, or stop and write a refactor proposal.

## Related skills

- `compile-change`: when the review is part of implementation.
- `propose-change`: when the review finds a refactor or product decision that needs approval.
