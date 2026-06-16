---
id: proposal.weekend-flight-change
type: proposal
status: awaiting-approval
approval_status: awaiting-approval
request: Travellers call on weekends because agents are offline. Can they make simple flight changes themselves?
updated: 2026-06-16
---

# Proposal: self-serve flight changes outside agent hours

## Proposed wiki additions

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

## Open questions

- Which bookings are eligible?
- Which airlines expose change penalties quickly enough?
- Do weekend changes use the same fee policy?
