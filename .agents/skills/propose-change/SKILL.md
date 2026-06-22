---
name: propose-change
description: Use when a request may change product behaviour, fix a bug, alter a workflow, add a capability, clarify product intent, or create/refine requirements before code.
---

# Propose Change

Your job is to turn a normal product request into a clear product wiki proposal.
Stay in natural language.
Do not edit application code.

## Hard gate

Do not invoke implementation, scaffold application code, or edit application code until the proposal is approved.
This applies even when the request sounds simple.
The proposal can be short, but the gate still exists.

## Template contract

Before drafting, load these files:

- `templates/proposal-template.md`
- `.agents/skills/propose-change/references/proposal-rubric.md`

If either file is missing, do not infer the proposal shape from schemas or previous examples.
First run `node scripts/repair-contracts.mjs --write`, then re-run `node scripts/template-lint.mjs` and `node scripts/skill-lint.mjs`.
Continue if repair succeeds.
Stop only if the canonical contract cannot be restored.

## Workflow

1. Read `AGENTS.md`, `wiki/overview.md`, `wiki/index.md`, relevant wiki units, and recent proposals.
2. Read `templates/proposal-template.md` and `references/proposal-rubric.md`.
3. Classify the request:
   - `mechanical`: copy, styling, rename, or config-only with no product intent change.
   - `normal`: feature, bug, workflow, or user-facing behaviour change.
   - `high-risk`: auth, money, privacy, data, migration, external integrations, architecture, design system, or multiple modules.
   - `greenfield`: first product slice in an empty wiki or new app.
   - `brownfield`: existing codebase import or retrofit. Use `import-codebase` instead.
4. Restate the request in one plain sentence.
5. Build a product-unit coverage map before asking questions:
   - actor
   - job
   - story
   - journey
   - capability
   - rule
   - acceptance criterion
   - outcome
   - non-goal
   - assumption or risk
   - glossary term
   - decision
6. Ask one question at a time when an answer would materially change scope, user experience, data, security, architecture, or checks.
   Recommend a default answer when the repo context gives you one.
   Do not ask preference questions that do not affect the proposal.
7. For meaningful changes, present 2-3 product or architecture approaches with trade-offs and your recommendation.
   Skip this only for truly mechanical changes.
8. Identify the smallest useful wiki change and explain how it fits the whole-product picture in `wiki/overview.md`.
9. Draft the proposal in `intake/proposals/` from `templates/proposal-template.md`.
   Keep every required section, even when the answer is "none", "not affected", or "deferred".
10. Mark the proposal `status: awaiting-approval`.
11. Self-review the proposal against the rubric:
    - no hidden implementation decision
    - no duplicate capability without explanation
    - all acceptance criteria are observable
    - checks can run against code later
    - explicit out-of-scope items
    - confidence and assumptions are labelled
    - each distinct user-requested action is its own story, not collapsed into one (see the rubric's "Sizing and splitting units")
    - real trade-offs are decisions with rejected alternatives, not buried in rules
12. Run `node scripts/proposal-lint.mjs` and `node scripts/proposal-traceability-lint.mjs`.
13. Stop and ask the user to approve, edit, or reject it.

## Proposal must include

- Request.
- Why now.
- Request type and risk level.
- Affected actors, jobs, stories, journeys, capabilities, rules, acceptance criteria, decisions, outcomes, non-goals, assumptions, risks, and glossary terms.
- Proposed wiki additions or updates.
- Acceptance criteria with stable IDs.
- Checks that should run against the code later.
- Reuse or refactor question.
- Design-system or architecture impact when relevant.
- Open decisions that need human judgement.
- Explicit out-of-scope items.
- Confidence level for inferred units.
- Self-review notes.

## Do not

- Write implementation code.
- Rewrite large parts of the wiki without approval.
- Hide product decisions inside implementation detail.
- Collapse jobs, stories, and acceptance criteria into one vague requirement.
- Skip a unit because it feels obvious.
- Create a full plan when the request is a tiny mechanical edit.

## Related skills

- `apply-wiki-change`: after the proposal is approved.
- `compile-change`: after the approved wiki change exists.
- `import-codebase`: when the request is to retrofit an existing repo instead of proposing one feature.
