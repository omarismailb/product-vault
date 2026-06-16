# Proposal Rubric

Use this when drafting or reviewing a Product Wiki proposal.

## Core idea

A proposal is not a loose feature spec.
It is a proposed change to the product wiki.
The wiki is made of small natural-language units with stable IDs, explicit links, and checks that can later run against code.

## Quality bar

A proposal is ready for approval when it is:

- Small enough to review.
- Written in product language, not implementation language.
- Linked to existing wiki units where possible.
- Clear about what is in scope and out of scope.
- Clear about which existing capability should be reused.
- Honest about assumptions and unknowns.
- Specific enough to generate executable checks.
- Clear enough for a non-technical reviewer to understand top-down.
- Precise enough for a coding agent to compile bottom-up.

## Clarification discipline

Ask one question at a time.
Ask only questions that materially affect scope, architecture, data, security, UX, product rules, or verification.

When possible, recommend an answer and explain the trade-off.
For ordinary changes, stop once the proposal is reviewable.
For high-risk changes, keep asking until the risky decision is no longer hidden.

Good clarification questions are concrete:

- "Should this apply to all travellers or only members with active bookings?"
- "Should a quote expire after 10 minutes, 30 minutes, or never?"
- "Should failed payment block the change or create a support handoff?"

Weak clarification questions are vague:

- "Any preferences?"
- "Should this be robust?"
- "Anything else?"

## Product-unit hierarchy

| Unit | Role | Good question | Example |
|---|---|---|---|
| Actor | Role involved in the product | Who is affected or taking action? | `actor.traveller` |
| Job | Durable, solution-free need | What is the user trying to get done, and why? | `job.change-booked-trip-without-calling-support` |
| Story | Small chosen product slice | What exact slice are we adding now? | `story.self-serve-flight-change-after-hours` |
| Acceptance criterion | Observable done condition | What would prove this works? | `ac.flight-change.quote-expiry` |
| Rule | Product logic reused across stories | What must always be true? | `rule.high-fare-difference-needs-confirmation` |
| Journey | End-to-end flow | Where does this sit in the user's path? | `journey.manage-booked-trip` |
| Capability | Reusable product or system function | Which existing function should own this? | `capability.change-quote-engine` |
| Outcome | Signal that the change mattered | What should improve? | `outcome.reduce-weekend-support-calls` |
| Non-goal | Deliberate boundary | What are we not doing? | `non-goal.no-airline-ticketing-without-agent-review` |
| Assumption or risk | Unproven belief or risk | What are we assuming, and how could it fail? | `assumption.airline-change-fees-available` |
| Glossary | Shared term | Which words need canonical meaning? | `glossary.fare-difference` |
| Decision | Rationale and rejected alternatives | Which trade-off are we choosing? | `decision.quote-before-ticketing` |

The units should not duplicate each other.
A job is the need.
A story is the chosen slice.
An acceptance criterion is the proof.
A rule is logic that should remain true beyond one story.
A capability is the reusable system function that should absorb future changes.

## User story shape

Use this shape when the story is user-facing:

```text
As a [actor], I want to [capability/action], so that [job/outcome].
```

For internal or system stories, use:

```text
When [trigger], the system should [behaviour], so that [outcome/rule].
```

## Acceptance criteria shape

Prefer observable Given/When/Then criteria:

```text
Given [state], when [action/event], then [observable result].
```

Avoid adjectives without bounds: fast, robust, intuitive, seamless, scalable.
Replace them with a condition, threshold, or explicit manual review step.

## Request types

### Tiny mechanical

Use the lightest path.
Still say why it is mechanical.
Do not produce an oversized proposal if no product intent changes.

### Normal feature or bug

Cover actors, job, story, acceptance criteria, capability, rule, non-goals, and checks.
Ask only the missing questions.

### High-risk feature

Also cover data ownership, trust boundary, migration, observability, rollback, security/privacy, and architecture pressure.
Use `review-architecture` before approval when reuse or boundaries are unclear.

### Greenfield product

Seed the first slice, but do not pretend the whole product is known.
Make the first job and story explicit.
Record non-goals and assumptions so the wiki can grow cleanly.

### Brownfield retrofit

Do not use this as the primary skill.
Use `import-codebase`, build an inventory, and treat output as proposals.

## Approaches

For meaningful changes, compare 2-3 approaches before drafting the final proposal.
Keep them short:

- approach
- what it optimizes for
- trade-off
- recommendation

This prevents the agent from smuggling an architecture decision into the first plausible implementation.

## Proposal self-review

Before asking for approval, check:

- Can a non-technical reviewer understand what changes and why?
- Is every acceptance criterion observable?
- Does every active criterion name a future executable check?
- Did you reuse an existing capability where possible?
- Did you flag any duplicate path, refactor pressure, or tech-stack drift?
- Did you separate product intent from implementation detail?
- Did you label confidence for inferred claims?
- Did you keep out-of-scope items explicit?
- Did you leave no `TBD`, `TODO`, placeholder, or vague adjective without a bound?

## Approval blockers

Do not ask for approval if:

- No acceptance criteria exist.
- The proposed capability duplicates an existing one without explanation.
- The user-owned decision is hidden inside implementation detail.
- Security, data, or migration risk is likely but unexamined.
- The check strategy is only prose.
- The proposal was drafted without loading `templates/proposal-template.md`.
- The proposal omits affected unit families instead of marking them not affected.
