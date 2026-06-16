---
id: proposal.weekend-flight-change
type: proposal
status: awaiting-approval
approval_status: awaiting-approval
request: Travellers call on weekends because agents are offline. Can they make simple flight changes themselves?
updated: 2026-06-16
---

# Proposal: self-serve flight changes outside agent hours

## Request

Travellers call on weekends because agents are offline.
Let eligible travellers make simple flight changes themselves.

## Why now

Weekend support creates avoidable operational load and slows travellers down when an existing trip needs a simple change.
This is a small enough first slice to test the Product Wiki path without automating every ticketing edge case.

## Request type and risk

- Type: normal.
- Risk level: high.
- Reason: this touches money, ticketing, airline rules, payment authorisation, and support handoff.

## Product wiki impact

| Unit | ID | Change | Confidence | Notes |
|---|---|---|---:|---|
| Actor | `actor.frequent-flyer` | create | high | Traveller with an existing booking. |
| Job | `job.keep-trip-on-track-after-hours` | create | high | Change a trip when support is offline. |
| Story | `story.self-serve-flight-reschedule` | create | high | Show eligible change options and let the traveller confirm. |
| Journey | `journey.manage-existing-trip` | create | medium | Existing trip management flow. |
| Capability | `capability.flight-search` | reuse | medium | Finds candidate replacement flights. |
| Capability | `capability.fare-comparison` | create | medium | Compares fare difference and penalties. |
| Capability | `capability.payment-authorisation` | reuse | medium | Confirms payment before ticketing. |
| Rule | `rule.high-fare-difference-confirmation` | create | high | Fare differences over $500 need explicit confirmation. |
| Acceptance criterion | `ac.self-serve-flight-reschedule.options-within-60s` | create | high | Options render within 60 seconds. |
| Acceptance criterion | `ac.self-serve-flight-reschedule.high-fare-confirmation` | create | high | High fare difference blocks payment until confirmed. |
| Outcome | `outcome.reduce-weekend-change-calls` | create | medium | Fewer weekend calls for eligible simple changes. |
| Non-goal | `non-goal.multi-city-reissues` | create | high | Multi-city reissues stay with support. |
| Assumption | `assumption.airline-penalties-available-fast-enough` | create | medium | Penalties can be fetched quickly enough. |
| Glossary | `glossary.fare-difference` | link | medium | Canonical amount the traveller must approve. |
| Decision | `decision.self-serve-low-value-changes` | create | medium | Start with low-risk eligible changes. |

## Approaches considered

| Approach | Optimizes for | Trade-off | Recommendation |
|---|---|---|---|
| Support handoff only | Safety | Does not reduce weekend calls much | rejected |
| Self-serve eligible changes with explicit confirmation | Useful automation with controlled risk | Needs clear eligibility and payment checks | recommended |
| Full self-serve reissue | Maximum automation | Too much ticketing and airline risk for this slice | rejected |

## Proposed wiki changes

- `actor.frequent-flyer`
- `job.keep-trip-on-track-after-hours`
- `story.self-serve-flight-reschedule`
- `ac.self-serve-flight-reschedule.options-within-60s`
- `rule.high-fare-difference-confirmation`
- `journey.manage-existing-trip`
- `capability.flight-search`
- `capability.fare-comparison`
- `capability.payment-authorisation`
- `outcome.reduce-weekend-change-calls`
- `non-goal.multi-city-reissues`
- `assumption.airline-penalties-available-fast-enough`
- `decision.self-serve-low-value-changes`

## Acceptance criteria

- `ac.self-serve-flight-reschedule.options-within-60s`: Given a confirmed booking, when a traveller requests a new date, options appear within 60 seconds.
- `ac.self-serve-flight-reschedule.high-fare-confirmation`: Fare differences over $500 require explicit confirmation before payment.

## Checks to generate

- `ac.self-serve-flight-reschedule.options-within-60s`: Add an integration check that stubs search results and proves options appear inside the time limit.
- `ac.self-serve-flight-reschedule.high-fare-confirmation`: Add a unit or integration check that blocks payment until the traveller confirms a fare difference over $500.

## Reuse or refactor question

Can existing flight-search and payment-authorisation capabilities absorb this cleanly, or does the trip-change flow need a separate `change-quote` capability before implementation?

## Architecture and design notes

- Existing code paths likely affected: trip management, flight search, fare comparison, payment authorisation, support handoff.
- Data, security, privacy, or trust boundary impact: payment and ticketing actions require explicit confirmation.
- Design-system impact: confirmation state and support handoff state must use existing patterns.
- Observability or rollback: log eligible/ineligible decisions and handoff reason; feature flag the flow.

## Out of scope

- Multi-city reissues.
- Airline changes without reliable penalties.
- Full automatic ticketing without confirmation.
- Changing fee policy.

## Open questions

- Which bookings are eligible?
- Which airlines expose change penalties quickly enough?
- Do weekend changes use the same fee policy?

## Self-review

- [x] The proposal uses `templates/proposal-template.md`, not a schema-inferred shape.
- [x] The smallest useful change is clear.
- [x] Jobs, stories, rules, capabilities, and acceptance criteria do not duplicate each other.
- [x] Acceptance criteria are observable and can map to executable checks.
- [x] Reuse, refactor pressure, and duplicate paths are addressed.
- [x] Security, data, migration, observability, and design-system impact are addressed or marked not affected.
- [x] Out-of-scope items and assumptions are explicit.
- [x] Confidence is labelled for inferred units.
