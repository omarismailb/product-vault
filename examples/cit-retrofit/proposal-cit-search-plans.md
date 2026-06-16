---
id: proposal.cit.search-plans
type: proposal
status: awaiting-approval
approval_status: awaiting-approval
request: Retrofit Product Wiki onto CIT by importing the explicit numbered search-plan capability.
updated: 2026-06-16
---

# Proposal: import CIT numbered search plans

## Request

Retrofit Product Wiki onto CIT by importing the explicit numbered search-plan capability.

## Why now

The numbered search-plan model is a central CIT behaviour and has enough evidence in the README, AGENTS file, and tests to become the first reviewable retrofit proposal.

## Request type and risk

- Type: brownfield.
- Risk level: medium.
- Reason: this imports existing behaviour as product intent, so any inferred motivation or trade-off must be labelled rather than treated as fact.

## Product wiki impact

| Unit | ID | Change | Confidence | Notes |
|---|---|---|---:|---|
| Actor | `actor.travel-operator` | create | medium | User who needs reliable flight-search plans. |
| Job | `job.find-reliable-flight-options` | create | medium | Generate viable route searches without manually building every search. |
| Story | `story.generate-numbered-search-plans` | create | high | Expand a trip request into numbered search plans. |
| Journey | `journey.trip-request-to-progressive-results` | create | medium | Request to search plans to progressive results. |
| Capability | `capability.numbered-search-plan-generation` | create | high | Generate route logic and search-number patterns. |
| Rule | `rule.route-membership-source-of-truth` | create | high | `CANONICAL_REGIONS` owns route membership. |
| Rule | `rule.generated-route-files-reviewed-by-volume` | create | high | Generated CSV changes need route-count review. |
| Acceptance criterion | `ac.cit.search-plans.us-europe-numbering` | create | high | US to Europe numbering follows documented model. |
| Acceptance criterion | `ac.cit.search-plans.europe-us-numbering` | create | high | Europe to US numbering follows documented model. |
| Acceptance criterion | `ac.cit.search-plans.row-numbering` | create | high | Rest of World numbering follows documented model. |
| Acceptance criterion | `ac.cit.search-plans.round-trip-numbering` | create | high | Round-trip numbering follows documented model. |
| Acceptance criterion | `ac.cit.route-membership-generated-from-canonical-regions` | create | high | Generated routes come from canonical regions. |
| Outcome | `outcome.faster-reliable-flight-search` | create | low | Product outcome needs owner confirmation. |
| Non-goal | `non-goal.no-manual-generated-route-patches` | create | high | Do not hand-edit generated route files. |
| Assumption | `assumption.numbered-search-model-is-product-intent` | create | medium | The current numbering model is intended, not incidental. |
| Glossary | `glossary.search-plan` | create | high | Canonical meaning of a numbered search. |
| Decision | `decision.numbered-search-plan-model` | create | low | Rationale needs owner confirmation. |

## Approaches considered

| Approach | Optimizes for | Trade-off | Recommendation |
|---|---|---|---|
| Import the whole repo in one proposal | Speed | Too large to review and easy to confuse evidence with truth | rejected |
| Import one capability with evidence and confidence | Reviewability | Requires several import proposals to finish the retrofit | recommended |
| Skip wiki and only add checks | Lower process cost | Does not preserve product intent | rejected |

## Proposed wiki changes

- `actor.travel-operator`: A user who needs CIT to generate and execute reliable flight-search plans.
- `job.find-reliable-flight-options`: When a trip request arrives, the operator needs reliable search plans so viable routes can be found without manually building every search.
- `story.generate-numbered-search-plans`: As a travel operator, I want CIT to expand a trip request into numbered search plans by trip type and direction, so provider runners can execute the right searches consistently.
- `journey.trip-request-to-progressive-results`: Accept request, expand into search plans, execute across providers, stream incremental results, store queue and result state.
- `capability.numbered-search-plan-generation`: Generate search-number patterns and route logic for one-way and round-trip flight search plans.
- `rule.route-membership-source-of-truth`: Canonical airport-to-region membership lives in `packages/airport-profiles/src/regions.ts`.
- `rule.generated-route-files-reviewed-by-volume`: Generated route CSV changes must be reviewed by route-count diff before commit.
- `outcome.faster-reliable-flight-search`: Product outcome to confirm with Omar.
- `non-goal.no-manual-generated-route-patches`: Generated route files are not patched directly.
- `assumption.numbered-search-model-is-product-intent`: The current numbered search model represents intended product behaviour.
- `glossary.search-plan`: A numbered provider search produced from a trip request.
- `decision.numbered-search-plan-model`: Record why this numbering model exists once confirmed.

## Acceptance criteria

- `ac.cit.search-plans.us-europe-numbering`: One-way US to Europe requests produce Search 1-5 according to the documented model.
- `ac.cit.search-plans.europe-us-numbering`: One-way Europe to US requests produce Search 1-5 according to the documented model.
- `ac.cit.search-plans.row-numbering`: One-way Rest of World requests produce Search 1-4 according to the documented model.
- `ac.cit.search-plans.round-trip-numbering`: Round-trip requests produce Search 1-3 according to the documented model.
- `ac.cit.route-membership-generated-from-canonical-regions`: Region membership changes are made in `CANONICAL_REGIONS`, then generated route files are synced from that source.

## Checks to generate

- `ac.cit.search-plans.us-europe-numbering`: Link or add the focused strategy-engine test that proves one-way US to Europe numbering.
- `ac.cit.search-plans.europe-us-numbering`: Link or add the focused strategy-engine test that proves one-way Europe to US numbering.
- `ac.cit.search-plans.row-numbering`: Link or add the focused strategy-engine test that proves Rest of World numbering.
- `ac.cit.search-plans.round-trip-numbering`: Link or add the focused strategy-engine test that proves round-trip numbering.
- `ac.cit.route-membership-generated-from-canonical-regions`: Keep `pnpm run check:generated-src-artifacts` as the guardrail for generated source artefacts.
- `pnpm run test:ita-confidence` appears to be a strong regression suite for this capability.

## Reuse or refactor question

Should `packages/strategy-engine` remain the owning capability for numbered search-plan generation, or is route membership sufficiently separate that it should become its own capability before future changes build on it?

## Architecture and design notes

- Existing code paths likely affected: `packages/strategy-engine`, `packages/airport-profiles/src/regions.ts`, generated route artifacts, related tests.
- Data, security, privacy, or trust boundary impact: none obvious from the import evidence.
- Design-system impact: none.
- Observability or rollback: generated route diffs and strategy-engine regression tests are the guardrails.

## Source evidence

| Claim | Evidence path | Confidence |
|---|---|---:|
| CIT expands requests into numbered search plans | `README.md` | high |
| `CANONICAL_REGIONS` owns route membership | `AGENTS.md`, `packages/airport-profiles/src/regions.ts` | high |
| Strategy engine owns search-plan generation | `README.md`, `packages/strategy-engine` | high |

## What code cannot tell us

- Whether the main outcome is faster quote turnaround, higher route quality, lower concierge overhead, or all three.
- Why the numbered search model was chosen over other modelling approaches.
- Which parts of the model are product intent versus provider implementation detail.

## Out of scope

- Importing every CIT capability in this proposal.
- Changing search-plan implementation.
- Editing generated route files.
- Treating inferred motivation as fact.

## Open questions

- Is the core actor an internal operator, an end customer, or both?
- Is the product outcome faster quote turnaround, higher route quality, lower concierge overhead, or all three?
- Which search-plan rules are product intent versus provider implementation detail?
- Which decisions explain why the numbered search model exists?

## Self-review

- [x] The proposal uses `templates/import-proposal-template.md`, not a schema-inferred shape.
- [x] The smallest useful import unit is clear.
- [x] Jobs, stories, rules, capabilities, and acceptance criteria do not duplicate each other.
- [x] Acceptance criteria are observable and can map to executable checks.
- [x] Reuse, refactor pressure, and duplicate paths are addressed.
- [x] Security, data, migration, observability, and design-system impact are addressed or marked not affected.
- [x] Out-of-scope items and assumptions are explicit.
- [x] Confidence is labelled for inferred units.
