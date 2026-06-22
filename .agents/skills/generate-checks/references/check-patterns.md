# Check Patterns

Use this when turning product wiki claims into checks.

## Check types

| Kind | Use when | Example |
|---|---|---|
| unit | Pure business logic or rule | fare difference threshold |
| integration | Multiple modules or data path | booking change creates payment intent |
| e2e | User journey matters | traveller changes flight in browser |
| lint | Structural repo rule | wiki IDs have frontmatter |
| typecheck | Interface contract | public SDK types compile |
| eval | LLM or agent output quality | import proposal contains confidence per unit |
| manual | Human judgement is required | UX copy approved by owner |

## Good checks

- Cover one wiki ID or a small related set.
- Run with a command.
- Fail clearly when the behaviour regresses.
- Link back to stable product wiki IDs.
- Are added to `checks/manifest.json` when they matter to the harness.

## Bad checks

- Only repeat the requirement in prose.
- Depend on a happy-path screenshot without assertions.
- Test implementation details unrelated to product behaviour.
- Have no command, owner, or evidence path.

## Acceptance criteria conversion

For each acceptance criterion, ask:

1. What observable behaviour proves this?
2. What is the smallest check that can observe it?
3. Is the check already present?
4. What command runs it?
5. Where should evidence be recorded?
6. Which edge-case triggers below does it match, and is each covered?

## Edge-case triggers

A green gate only proves the cases you wrote.
Most bugs that survive a passing gate fall into a small set of recurring shapes.
For each acceptance criterion, ask which triggers it matches and add at least one check for each match.
A criterion can match several, and that overlap is protective.
These cover the recurring classes, not every possible bug.

### Core: any criterion that operates on values

| Trigger | Fires when the criterion... | Add a check for |
|---|---|---|
| Boundary | has a threshold or an open/closed range | the exact edge: equal-at-boundary, just inside, just outside |
| Cardinality | handles a collection | zero, one, two, and a duplicate element |
| Round-trip | transforms a value you can read back (zones, units, encode/parse) | convert-then-invert returns the original where defined, and name where it cannot |
| Time and calendar | uses dates, times, or zones | DST nonexistent (spring-forward) and ambiguous (fall-back) local times, the midnight or day-boundary crossing, month/year/leap-day ends |
| Ordering and ties | sorts or ranks | equal keys (the tie-break), and degenerate input: already sorted, reversed, all-equal |
| Presence and validity | requires fields | missing, empty or whitespace, wrong type, out-of-range or wrong-sign |
| Identity and matching | compares or de-duplicates | an exact match, a case or whitespace variant, and a near-miss that must not match |

### Extended: only when the change introduces these

| Trigger | Fires when the change adds... | Add a check for |
|---|---|---|
| State and repetition | persistence, IO, or an external call | idempotency (apply twice), retry after a partial failure, concurrent or interleaved writes |
| Scale and precision | arithmetic or large inputs | large N, numeric overflow, floating-point rounding |

Record which triggers each criterion matched and which check covers each.
If a trigger matches but you deliberately do not check it, say so and why (for example, a deferred non-goal) rather than leaving it silent.
