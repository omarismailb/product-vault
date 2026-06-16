---
id: proposal.import.example
type: proposal
status: awaiting-approval
approval_status: awaiting-approval
request: Import one existing capability into the product wiki.
updated: YYYY-MM-DD
---

# Proposal: import existing capability

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

## Source evidence

| Claim | Evidence path | Confidence |
|---|---|---:|
| `capability.example` exists | `src/...` | high/medium/low |
| `ac.example.behaviour` is intended | `tests/...` | high/medium/low |

## Reuse or refactor question

Which existing capability owns this behaviour?
Is the current code path duplicated, tangled, or likely to need refactor before new work builds on it?

## What code cannot tell us

- Product motivation.
- Rejected alternatives.
- Intended audience.
- Business outcome.

## Open questions

- Questions for the product owner before this becomes an active wiki entry.

## Self-review

- [ ] The proposal is one capability, not the whole retrofit.
- [ ] Every claim has evidence or is marked as an assumption.
- [ ] Code is treated as evidence, not truth.
- [ ] Acceptance criteria map to existing or proposed executable checks.
- [ ] The import inventory can be ticked for this capability after approval.
