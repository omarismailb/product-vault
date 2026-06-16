# Proposal Rubric

Use this when drafting or reviewing a Product Wiki proposal.

## Quality bar

A proposal is ready for approval when it is:

- Small enough to review.
- Written in product language, not implementation language.
- Linked to existing wiki units where possible.
- Clear about what is in scope and out of scope.
- Clear about which existing capability should be reused.
- Honest about assumptions and unknowns.
- Specific enough to generate executable checks.

## Clarification discipline

Ask at most three questions before drafting.
Ask only questions that materially affect scope, architecture, data, security, UX, or verification.

When possible, recommend an answer and explain the trade-off.

## Product-unit hierarchy

- Job: durable user need, solution-free.
- Story: chosen product slice that serves a job.
- Acceptance criterion: observable done condition for a story.
- Rule: reusable product logic that applies across stories.
- Journey: end-to-end flow.
- Capability: reusable product or system function.
- Decision: rationale, trade-off, rejected alternative.

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

## Approval blockers

Do not ask for approval if:

- No acceptance criteria exist.
- The proposed capability duplicates an existing one without explanation.
- The user-owned decision is hidden inside implementation detail.
- Security, data, or migration risk is likely but unexamined.
- The check strategy is only prose.
