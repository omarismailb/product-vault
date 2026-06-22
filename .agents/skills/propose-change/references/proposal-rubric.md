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
| Capability | Reusable function of the product, named by what it does for the user | Which existing function should own this? | `capability.change-quote-engine` |
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
A capability is the reusable function of the product, named by what it does for the user, that should absorb future changes.

## Sizing and splitting units

Most requests contain more than one unit. Size by content, not by feature count.

Split stories by distinct user action, not by feature.
"Create a deck" and "study a card" are two stories even though one request asked for both, because each could ship or be tested on its own.
A request to "change my trip" splits into "see eligible changes", "preview the fare difference", and "confirm and pay" when each is separately observable.
Do not fold several actions into one vague story.

Tell a job from a story.
A job is solution-free and outlives any feature: "remember what I learn", "take time off without losing track of my balance".
A story names the chosen slice: "study a deck with spaced repetition", "request time off".
One product can serve more than one job, so name each job the request implies, not only the most obvious one.

Tell a decision from a rule.
A decision is a choice with at least one rejected alternative and a reason, and you record the alternatives: "store event times in UTC, not local time", "schedule with SM-2 rather than Leitner boxes", "sign in with an email link, not a password".
A rule is an invariant that must stay true across stories: "a refund never exceeds the amount paid", "per-person amounts always sum to the exact total".
If you are writing a rule that explains why one approach was picked over another, it is a decision.

Right-sized, not maximal.
Every unit must carry something no other unit carries. If you cannot write a non-redundant "What it does for you" for it, it is not a unit.
Do not manufacture a job, journey, or decision for a trivial action. A button colour is a design-system detail, not a story; a library you happened to use is a decision only if a real alternative was weighed.

## Worked example

Request: "Let an employee request time off, and let their manager approve or decline it. Show the employee their remaining balance."

A good decomposition:

- Actors: `actor.employee`, `actor.manager`.
- Jobs: `job.take-time-off-without-losing-track-of-my-balance`. The manager's "keep the team covered" is a second job only if the request implies it; here it is thin, so note it and leave it out until a feature needs it.
- Stories, three not one: `story.request-time-off`, `story.approve-or-decline-a-request`, `story.see-my-remaining-balance`.
- Journey: `journey.request-and-resolve-time-off`.
- Rules: `rule.request-cannot-exceed-balance`, `rule.approved-request-reduces-balance`.
- Decision: `decision.single-manager-approval` (rejected: a multi-approver quorum, too heavy for this team).
- Not units: the approval email wording (design-system content), the database choice (no real alternative was weighed).

The collapse to avoid: one `story.manage-time-off` that hides request, approval, and balance, with the approval logic buried in prose and no decision recorded.

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
- Did any distinct user-requested action get folded into another story instead of being its own?
- Is any real trade-off recorded as a rule, or left out, instead of a decision with rejected alternatives?
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
