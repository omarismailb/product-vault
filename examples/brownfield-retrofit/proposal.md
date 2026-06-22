---
id: proposal.flagpole.percentage-rollout
type: proposal
status: awaiting-approval
approval_status: awaiting-approval
request: Import one existing capability from the Flagpole codebase into the product wiki, starting with percentage rollout.
updated: 2026-06-16
---

# Proposal: import existing capability — percentage rollout

## Request

Retrofit the product wiki onto Flagpole, a fictional feature-flag service, by importing the percentage-rollout capability as the first reviewable unit.

## Why now

Percentage rollout is a central Flagpole behaviour and has enough evidence in the README, the agents file, and the rollout tests to become the first small import proposal.
Importing one capability at a time keeps the retrofit reviewable instead of trying to absorb the whole repo in a single pass.

## Request type and risk

- Type: brownfield.
- Risk level: medium.
- Reason: this imports existing behaviour as product intent, so any inferred motivation or trade-off must be labelled as an assumption rather than treated as fact.

## Import scope

Capability: percentage rollout, where a flag exposes a feature to a stable, deterministic share of users.

Code evidence:

- `README.md`
- `AGENTS.md`
- `packages/flag-engine/src/rollout.ts`
- `tests/rollout.test.ts`

## Confidence summary

| Unit | Confidence | Why |
|---|---:|---|
| Actor | medium | The README implies platform engineers as users, but no role is named explicitly. |
| Job | medium | The need to ship features gradually is clear from docs; exact framing is inferred. |
| Story | high | Rollout behaviour is described in the README and proven in tests. |
| Journey | medium | The evaluate-flag flow is visible in code but not documented end to end. |
| Capability | high | `packages/flag-engine/src/rollout.ts` is a clear owning module. |
| Rule | high | Bucket assignment uses a stable hash; this is asserted in tests. |
| Acceptance criterion | high | Tests cover the documented bucket boundaries. |
| Outcome | low | Business outcome is not stated anywhere in the repo. |
| Non-goal | high | The README says targeting rules are a separate capability. |
| Assumption | medium | Whether the current bucket model is intended needs owner confirmation. |
| Glossary | high | "Rollout bucket" is used consistently across docs and code. |
| Decision | low | The rationale for the bucket count is not recorded. |

## Product wiki impact

| Unit | ID | Change | Confidence | Notes |
|---|---|---|---:|---|
| Actor | `actor.platform-engineer` | create | medium | Engineer who controls how a feature reaches users. |
| Job | `job.ship-features-gradually` | create | medium | Release a feature to a growing share of users safely. |
| Story | `story.evaluate-percentage-rollout` | create | high | Decide whether a given user falls inside a flag's rollout. |
| Journey | `journey.flag-request-to-evaluated-decision` | create | medium | Request, resolve flag, assign bucket, return decision. |
| Capability | `capability.percentage-rollout-evaluation` | create | high | Map a user to a deterministic rollout bucket and decision. |
| Rule | `rule.bucket-assignment-is-deterministic` | create | high | The same user and flag always resolve to the same bucket. |
| Rule | `rule.rollout-percentage-bounds` | create | high | Rollout percentage is clamped to the 0 to 100 range. |
| Acceptance criterion | `ac.flagpole.rollout.deterministic-bucket` | create | high | A user maps to the same bucket on repeated evaluations. |
| Acceptance criterion | `ac.flagpole.rollout.zero-percent-excludes-all` | create | high | A 0 percent rollout returns false for every user. |
| Acceptance criterion | `ac.flagpole.rollout.hundred-percent-includes-all` | create | high | A 100 percent rollout returns true for every user. |
| Acceptance criterion | `ac.flagpole.rollout.bucket-boundary` | create | high | A user just inside the threshold is included; just outside is excluded. |
| Outcome | `outcome.safer-gradual-releases` | create | low | Product outcome needs owner confirmation. |
| Non-goal | `non-goal.no-attribute-targeting-here` | create | high | Attribute or segment targeting is a separate capability. |
| Assumption | `assumption.bucket-model-is-product-intent` | create | medium | The current bucket model is intended, not incidental. |
| Glossary | `glossary.rollout-bucket` | create | high | Canonical meaning of a rollout bucket. |
| Decision | `decision.deterministic-bucket-model` | create | low | Rationale for the bucket model needs owner confirmation. |

## Approaches considered

| Approach | Optimizes for | Trade-off | Recommendation |
|---|---|---|---|
| Import the whole repo in one proposal | Speed | Too large to review and easy to confuse evidence with truth | rejected |
| Import one capability with evidence and confidence | Reviewability | Requires several import proposals to finish the retrofit | recommended |
| Skip the wiki and only add checks | Lower process cost | Does not preserve product intent | rejected |

## Proposed wiki changes

- `actor.platform-engineer`: A user who controls how a feature is exposed to users through flags.
- `job.ship-features-gradually`: When a feature is ready, the engineer needs to release it to a growing share of users without exposing everyone at once.
- `story.evaluate-percentage-rollout`: As a platform engineer, I want the engine to decide whether a given user falls inside a flag's rollout, so the same user sees a stable decision across requests.
- `journey.flag-request-to-evaluated-decision`: Accept an evaluation request, resolve the flag, assign the user to a bucket, return the on or off decision.
- `capability.percentage-rollout-evaluation`: Map a user identifier and flag to a deterministic rollout bucket and an on or off decision.
- `rule.bucket-assignment-is-deterministic`: The same user identifier and flag key always resolve to the same bucket.
- `rule.rollout-percentage-bounds`: A rollout percentage outside 0 to 100 is clamped to that range before evaluation.
- `outcome.safer-gradual-releases`: Product outcome to confirm with the product owner.
- `non-goal.no-attribute-targeting-here`: Attribute and segment targeting are out of scope for this capability.
- `assumption.bucket-model-is-product-intent`: The current deterministic bucket model represents intended product behaviour.
- `glossary.rollout-bucket`: A stable slot, derived from a user identifier and flag key, used to decide inclusion in a rollout.
- `decision.deterministic-bucket-model`: Record why this bucket model exists once confirmed.

## Acceptance criteria

- `ac.flagpole.rollout.deterministic-bucket`: Given a user and a flag, repeated evaluations return the same bucket and decision.
- `ac.flagpole.rollout.zero-percent-excludes-all`: A flag at 0 percent rollout returns false for every user.
- `ac.flagpole.rollout.hundred-percent-includes-all`: A flag at 100 percent rollout returns true for every user.
- `ac.flagpole.rollout.bucket-boundary`: A user whose bucket is just inside the rollout threshold is included; a user just outside is excluded.

## Checks to generate

- `ac.flagpole.rollout.deterministic-bucket`: Link or add the focused rollout test that proves repeated evaluations return the same bucket.
- `ac.flagpole.rollout.zero-percent-excludes-all`: Link or add the rollout test that proves a 0 percent flag excludes every user.
- `ac.flagpole.rollout.hundred-percent-includes-all`: Link or add the rollout test that proves a 100 percent flag includes every user.
- `ac.flagpole.rollout.bucket-boundary`: Link or add the rollout test that proves the inclusion boundary behaviour.
- `pnpm run test:rollout` appears to be the strong regression suite for this capability.
- Keep `pnpm run check:flag-schema` as the guardrail for flag configuration files.

## Reuse or refactor question

Should `packages/flag-engine` remain the owning module for percentage-rollout evaluation, or is bucket assignment separate enough that it should become its own capability before targeting work builds on it?
Is the current rollout code path duplicated or tangled with flag resolution in a way that needs a refactor first?

## Architecture and design notes

- Existing code paths likely affected: `packages/flag-engine/src/rollout.ts`, flag resolution, and the related rollout tests.
- Data, security, privacy, or trust boundary impact: none obvious from the import evidence; bucket assignment uses a hash of the user identifier.
- Design-system impact: none.
- Observability or rollback: rollout tests and the flag-schema check are the guardrails.

## Source evidence

| Claim | Evidence path | Confidence |
|---|---|---:|
| Flagpole evaluates flags as a percentage rollout | `README.md` | high |
| `DEFAULT_ROLLOUT_BUCKETS` defines the bucket model | `AGENTS.md`, `packages/flag-engine/src/rollout.ts` | high |
| The flag engine owns rollout evaluation | `README.md`, `packages/flag-engine/src/rollout.ts` | high |
| Bucket assignment is deterministic | `tests/rollout.test.ts` | high |

## What code cannot tell us

- Whether the main outcome is safer releases, faster iteration, lower incident risk, or all three.
- Why the deterministic bucket model was chosen over other rollout approaches.
- Which parts of the model are product intent versus implementation detail.
- Who the intended audience is beyond the engineers who edit flags.

## Out of scope

- Importing every Flagpole capability in this proposal.
- Changing the rollout implementation.
- Attribute or segment targeting.
- Treating inferred motivation as fact.

## Open questions

- Is the core actor an internal platform engineer, a product manager, or both?
- Is the product outcome safer releases, faster iteration, lower incident risk, or all three?
- Which rollout rules are product intent versus implementation detail?
- Which decisions explain why the deterministic bucket model exists?

## Self-review

- [x] The proposal uses `templates/import-proposal-template.md`, not a schema-inferred shape.
- [x] The proposal is one capability, not the whole retrofit.
- [x] Every claim has evidence or is marked as an assumption.
- [x] Code is treated as evidence, not truth.
- [x] Jobs, stories, rules, capabilities, and acceptance criteria do not duplicate each other.
- [x] Acceptance criteria are observable and map to existing or proposed executable checks.
- [x] Reuse, refactor pressure, and duplicate paths are addressed.
- [x] Out-of-scope items and assumptions are explicit.
- [x] Confidence is labelled for inferred units.
- [x] The import inventory can be ticked for this capability after approval.
