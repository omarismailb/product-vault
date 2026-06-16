---
name: import-codebase
description: Automatically use when retrofitting Product Wiki onto an existing codebase or when asked to create the first product wiki from a repo. Reads code, docs, tests, and agent instructions to draft product wiki proposals. Treats output as proposals, not facts.
---

# Import Codebase

Your job is to draft a product wiki from an existing codebase.
This is reverse compilation.
Code can reveal some of the what.
It usually cannot recover the why.

## Rules

- Do not edit application code.
- Do not claim inferred intent as fact.
- Chunk large repos by capability.
- Prefer small, reviewable proposals over a giant wiki dump.
- Mark confidence on every inferred unit: high, medium, or low.

## Sources to inspect

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `PRODUCT.md`
- `docs/`
- `tests/`
- package or app structure
- public API routes
- existing design system docs
- existing agent skills or commands

## Workflow

1. Map the repo structure.
2. Read `references/brownfield-import-rubric.md`.
3. Identify major capabilities.
4. Choose one capability for the first import.
5. Draft actors, jobs, stories, acceptance criteria, rules, journeys, capabilities, outcomes, non-goals, assumptions, glossary terms, and decisions using `templates/import-proposal-template.md`.
6. Create a proposal under `intake/proposals/`, not final wiki files.
7. Include source evidence for every inferred claim.
8. Run `node scripts/proposal-lint.mjs` and `node scripts/proposal-traceability-lint.mjs`.
9. Stop for human review.

## Output

Return:

- Capability imported.
- Proposal path.
- Confidence summary.
- Open questions.
- Gaps where code cannot reveal intent.

## Related skills

- `propose-change`: for a new feature request after the first import.
- `apply-wiki-change`: after the human approves an import proposal.
- `reconcile-wiki`: after implementation or when checking drift.
