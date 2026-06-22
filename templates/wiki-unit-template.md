---
id: type.example
type: actor | job | story | acceptance-criterion | rule | journey | capability | outcome | non-goal | assumption | glossary | decision
status: active
updated: YYYY-MM-DD
links: []
---

<!--
Link other units two ways:
- In prose, use a standard relative markdown link, e.g. [Title](../jobs/the-slug.md).
  It renders and clicks in GitHub, Obsidian, VS Code, and plain editors. Do NOT use
  Obsidian-only [[type.slug]] links — they ship as dead text on GitHub.
- In the `links:` frontmatter array, list the bare unit ids (the machine-readable
  graph), e.g. links: [job.the-slug, capability.the-thing].
-->

# Title

One plain sentence: what this is, in the words of the person using the product.

## What it does for you

Two to four plain sentences a non-engineer can read and understand.
Describe the value and the behaviour, not the mechanism.
Do not use implementation terms here (injectable, fetch, parser, DOM, view model, deterministic). Those belong under "How it works".

## How it works

Optional. Implementation notes live here and only here: the libraries, data sources, and patterns the change relies on.
Omit this section entirely when the unit has no implementation detail worth recording.
The precise, testable contract still lives in the linked acceptance criteria and rules, not in this prose.

## Unit guidance

Use the relevant shape.
Delete the unused bullets after creating the unit.

- Actor: who or what takes action or is affected.
- Job: the durable need, written without naming the solution.
- Story: the small product slice, usually `As a [actor], I want to [action], so that [job/outcome]`.
- Acceptance criterion: observable Given/When/Then condition.
- Rule: product logic that should remain true across stories.
- Journey: the flow this unit sits inside.
- Capability: a reusable function of the product, named by what it does for the user, that should own this behaviour.
- Outcome: measurable or reviewable signal that the product improved.
- Non-goal: deliberate boundary.
- Assumption: uncertain belief or risk that needs validation.
- Glossary: canonical meaning of a term.
- Decision: trade-off, rationale, and rejected alternatives.

## Links

Use relative markdown links so they render everywhere (GitHub, Obsidian, editors):

- Related jobs: [Job title](../jobs/the-slug.md)
- Related stories: [Story title](../stories/the-slug.md)
- Related capabilities: [Capability title](../capabilities/the-slug.md)
- Related checks: [Criterion title](../acceptance-criteria/the-slug.md)

## Evidence

- Source, proposal, code path, user research, or decision record.

## Review notes

- Confidence: high / medium / low.
- Open questions:
