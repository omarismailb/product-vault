# Brownfield Import Rubric

Use this when importing an existing codebase into Product Wiki.

## Principle

Code is evidence, not truth.
It can show what the product does today.
It usually cannot recover why it exists, who it is for, or which options were rejected.

## First pass

1. Identify the product surfaces.
2. Identify the main capabilities.
3. Map docs, tests, routes, modules, and agent instructions.
4. Choose one capability for the first proposal.
5. Draft only what can be supported by evidence.
6. Mark confidence on every inferred unit.
7. Stop for human review.

## Evidence quality

| Confidence | Meaning |
|---|---|
| High | Stated directly in docs, tests, public API, or agent instructions |
| Medium | Strongly implied by code paths and naming |
| Low | Plausible inference that needs owner confirmation |

## Brownfield scan checklist

- Existing `AGENTS.md`, `CLAUDE.md`, `.claude`, `.codex`, or other agent rules.
- README and product docs.
- Routes, commands, public APIs, jobs, queues, cron tasks.
- Tests that reveal intended behaviour.
- Design system or UI conventions.
- Architecture decisions or docs.
- Security, auth, permissions, secrets, and data ownership patterns.
- Deployment and observability files.

## Output discipline

Import proposals should be small.
If the repo has ten capabilities, create one proposal for the first capability.

Do not write final wiki files during import.
Do not edit app code.
Do not mark inferred product intent as fact.
