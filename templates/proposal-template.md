---
id: proposal.example
type: proposal
status: awaiting-approval
approval_status: awaiting-approval
request: Replace with the user's request.
updated: YYYY-MM-DD
---

# Proposal: replace with title

## Request

One sentence in the user's language.

## Why now

What problem, opportunity, or risk makes this worth considering now.

## Request type and risk

- Type: mechanical / normal / high-risk / greenfield / brownfield.
- Risk level: low / medium / high.
- Reason:

## Product wiki impact

Every row should be filled in.
Use `none` or `not affected` when a unit family genuinely does not apply.

| Unit | ID | Change | Confidence | Notes |
|---|---|---|---:|---|
| Actor | `actor.example` | create/update/link/none | high/medium/low | Who is involved? |
| Job | `job.example` | create/update/link/none | high/medium/low | Durable need, solution-free. |
| Story | `story.example` | create/update/link/none | high/medium/low | Small chosen product slice. |
| Journey | `journey.example` | create/update/link/none | high/medium/low | End-to-end flow. |
| Capability | `capability.example` | reuse/extend/create/none | high/medium/low | Reusable product or system function. |
| Rule | `rule.example` | create/update/link/none | high/medium/low | Logic that must remain true. |
| Acceptance criterion | `ac.example.behaviour` | create/update/link/none | high/medium/low | Observable done condition. |
| Outcome | `outcome.example` | create/update/link/none | high/medium/low | Signal that the change mattered. |
| Non-goal | `non-goal.example` | create/update/link/none | high/medium/low | Boundary of this change. |
| Assumption or risk | `assumption.example` | create/update/link/none | high/medium/low | Unproven belief or risk. |
| Glossary | `glossary.example` | create/update/link/none | high/medium/low | Shared term. |
| Decision | `decision.example` | create/supersede/link/none | high/medium/low | Rationale and rejected alternative. |

## Approaches considered

| Approach | Optimizes for | Trade-off | Recommendation |
|---|---|---|---|
| Option A |  |  | recommended / rejected |
| Option B |  |  | recommended / rejected |

## Proposed wiki changes

- `actor.example`: role involved.
- `job.example`: solution-free need.
- `story.example`: chosen product slice.
- `ac.example.behaviour`: observable done condition.
- `rule.example`: reusable product rule.
- `capability.example`: reusable function that should own this behaviour.
- `outcome.example`: expected signal.
- `non-goal.example`: explicit boundary.
- `assumption.example`: risk or uncertain belief.
- `decision.example`: trade-off to record.

## Acceptance criteria

- `ac.example.behaviour`: Given the relevant state, when the user takes the action, then the observable behaviour happens.

## Checks to generate

- `ac.example.behaviour`: Add or link the smallest executable check that proves the behaviour works.

## Reuse or refactor question

Which existing capability should absorb this?
If none can absorb it cleanly, what refactor must happen first?

## Architecture and design notes

- Existing code paths likely affected:
- Data, security, privacy, or trust boundary impact:
- Design-system impact:
- Observability or rollback:

## Out of scope

- What this proposal deliberately does not do.

## Open questions

- Questions that materially affect scope, architecture, data, security, UX, or checks.

## Self-review

- [ ] The proposal uses `templates/proposal-template.md`, not a schema-inferred shape.
- [ ] The smallest useful change is clear.
- [ ] Jobs, stories, rules, capabilities, and acceptance criteria do not duplicate each other.
- [ ] Acceptance criteria are observable and can map to executable checks.
- [ ] Reuse, refactor pressure, and duplicate paths are addressed.
- [ ] Security, data, migration, observability, and design-system impact are addressed or marked not affected.
- [ ] Out-of-scope items and assumptions are explicit.
- [ ] Confidence is labelled for inferred units.

## Approval

Status: awaiting approval.
