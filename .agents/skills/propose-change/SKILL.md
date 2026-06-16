---
name: propose-change
description: Automatically use before implementation for natural-language product requests, feature ideas, bug reports, workflow changes, or unclear asks. Turns the request into a reviewable product wiki proposal. Do not use for tiny mechanical edits.
---

# Propose Change

Your job is to turn a normal product request into a clear product wiki proposal.
Stay in natural language.
Do not edit application code.

## Workflow

1. Read `wiki/index.md`, relevant wiki units, `AGENTS.md`, and existing proposals.
2. Read `references/proposal-rubric.md`.
3. Restate the request in one sentence.
4. Ask only the questions needed to make the proposal reviewable.
5. Identify the smallest useful change.
6. Draft a proposal in `intake/proposals/` using `templates/proposal-template.md` as the shape.
7. Mark the proposal `status: awaiting-approval`.
8. Run `node scripts/proposal-lint.mjs` and `node scripts/proposal-traceability-lint.mjs`.
9. Stop and ask the user to approve, edit, or reject it.

## Proposal must include

- Request.
- Why now.
- Affected actors, jobs, stories, journeys, capabilities, rules, decisions, outcomes, non-goals, assumptions, and glossary terms.
- Proposed wiki additions or updates.
- Acceptance criteria with stable IDs.
- Checks that should run against the code later.
- Reuse or refactor question.
- Open decisions that need human judgement.
- Explicit out-of-scope items.
- Confidence level for inferred units.

## Do not

- Write implementation code.
- Rewrite large parts of the wiki without approval.
- Hide product decisions inside implementation detail.
- Create a full plan when the request is a tiny mechanical edit.

## Related skills

- `apply-wiki-change`: after the proposal is approved.
- `compile-change`: after the approved wiki change exists.
- `import-codebase`: when the request is to retrofit an existing repo instead of proposing one feature.
