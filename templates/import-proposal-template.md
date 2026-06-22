---
id: proposal.import.example
type: proposal
status: awaiting-approval
approval_status: awaiting-approval
request: Import one existing capability into the product wiki.
updated: YYYY-MM-DD
---

<!--
This is the proposal template for a brownfield import (one capability at a time).
It is a superset of templates/proposal-template.md: it keeps every section proposal-lint
requires and adds the import-specific sections (Import scope, Confidence summary, Source
evidence, What code cannot tell us). A filled proposal written to this template passes the gate
after the placeholder frontmatter and example IDs are replaced with real values.
When the user approves, set status: approved and approval_status: approved, and add
approved_by and approved_at to the frontmatter above.
-->

# Proposal: import existing capability

## Request

One sentence: which capability is being imported into the wiki, and from which codebase.

## Why now

Why this capability is the right first (or next) import, and why one capability at a time keeps the retrofit reviewable.

## Request type and risk

- Type: brownfield.
- Risk level: low / medium / high.
- Reason: imports treat existing behaviour as product intent, so inferred motivation or trade-offs must be labelled as assumptions, not facts.

## Import scope

Capability:

Code evidence:

- `README.md`
- `AGENTS.md`
- `src/...`
- `tests/...`

## Confidence summary

| Unit | Confidence | Why |
|---|---:|---|
| Actor | high/medium/low | Evidence and uncertainty |
| Job | high/medium/low | Evidence and uncertainty |
| Story | high/medium/low | Evidence and uncertainty |
| Journey | high/medium/low | Evidence and uncertainty |
| Capability | high/medium/low | Evidence and uncertainty |
| Rule | high/medium/low | Evidence and uncertainty |
| Acceptance criterion | high/medium/low | Evidence and uncertainty |
| Outcome | high/medium/low | Evidence and uncertainty |
| Non-goal | high/medium/low | Evidence and uncertainty |
| Assumption or risk | high/medium/low | Evidence and uncertainty |
| Glossary | high/medium/low | Evidence and uncertainty |
| Decision | high/medium/low | Evidence and uncertainty |

## Product wiki impact

Every row should be filled in.
Use `none` or `not affected` when a unit family genuinely does not apply.

| Unit | ID | Change | Confidence | Notes |
|---|---|---|---:|---|
| Actor | `actor.example` | create/update/link/none | high/medium/low | Inferred or stated role. |
| Job | `job.example` | create/update/link/none | high/medium/low | Inferred or stated durable need. |
| Story | `story.example` | create/update/link/none | high/medium/low | Behaviour slice observed in code. |
| Journey | `journey.example` | create/update/link/none | high/medium/low | Flow this capability belongs to. |
| Capability | `capability.example` | reuse/extend/create/none | high/medium/low | Reusable function the code paths represent. |
| Rule | `rule.example` | create/update/link/none | high/medium/low | Product logic observed in code or tests. |
| Acceptance criterion | `ac.example.behaviour` | create/update/link/none | high/medium/low | Observable done condition. |
| Outcome | `outcome.example` | create/update/link/none | high/medium/low | Signal, if evidence exists. |
| Non-goal | `non-goal.example` | create/update/link/none | high/medium/low | Explicit boundary, if evidence exists. |
| Assumption or risk | `assumption.example` | create/update/link/none | high/medium/low | Inference that needs owner confirmation. |
| Glossary | `glossary.example` | create/update/link/none | high/medium/low | Canonical term. |
| Decision | `decision.example` | create/supersede/link/none | high/medium/low | Trade-off or rationale, if evidence exists. |

## Approaches considered

| Approach | Optimizes for | Trade-off | Recommendation |
|---|---|---|---|
| Import the whole repo in one proposal | Speed | Too large to review; easy to confuse evidence with truth | rejected |
| Import one capability with evidence and confidence | Reviewability | Requires several import proposals to finish the retrofit | recommended |

## Proposed wiki changes

- `actor.example`: inferred or stated role.
- `job.example`: inferred or stated durable need.
- `story.example`: behaviour slice observed in code.
- `journey.example`: flow this capability belongs to.
- `capability.example`: reusable function represented by the code paths.
- `rule.example`: product logic observed in code or tests.
- `ac.example.behaviour`: observable done condition.
- `outcome.example`: measurable or qualitative signal, if evidence exists.
- `non-goal.example`: explicit boundary, if evidence exists.
- `assumption.example`: inference that needs owner confirmation.
- `glossary.example`: canonical term.
- `decision.example`: trade-off or rationale, if evidence exists.

## Acceptance criteria

- `ac.example.behaviour`: Observable behaviour inferred from code or tests.

## Checks to generate

- `ac.example.behaviour`: Existing or proposed command that proves the behaviour.

## Reuse or refactor question

Which existing capability owns this behaviour?
Is the current code path duplicated, tangled, or likely to need refactor before new work builds on it?

## Architecture and design notes

- Existing code paths likely affected:
- Data, security, privacy, or trust boundary impact:
- Design-system impact:
- Observability or rollback:

## Source evidence

| Claim | Evidence path | Confidence |
|---|---|---:|
| `capability.example` exists | `src/...` | high/medium/low |
| `ac.example.behaviour` is intended | `tests/...` | high/medium/low |

## What code cannot tell us

- Product motivation.
- Rejected alternatives.
- Intended audience.
- Business outcome.

## Out of scope

- Importing every capability in this proposal.
- Changing the implementation during import.

## Open questions

- Questions for the product owner before this becomes an active wiki entry.

## Self-review

- [ ] The proposal uses `templates/import-proposal-template.md`, not a schema-inferred shape.
- [ ] The proposal is one capability, not the whole retrofit.
- [ ] Every claim has evidence or is marked as an assumption.
- [ ] Code is treated as evidence, not truth.
- [ ] Jobs, stories, rules, capabilities, and acceptance criteria do not duplicate each other.
- [ ] Acceptance criteria are observable and map to existing or proposed executable checks.
- [ ] Reuse, refactor pressure, and duplicate paths are addressed.
- [ ] Out-of-scope items and assumptions are explicit.
- [ ] Confidence is labelled for inferred units.
- [ ] The import inventory can be ticked for this capability after approval.
