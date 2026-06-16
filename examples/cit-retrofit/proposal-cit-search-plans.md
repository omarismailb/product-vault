---
id: proposal.cit.search-plans
type: proposal
status: awaiting-approval
approval_status: awaiting-approval
request: Retrofit Product Wiki onto CIT by importing the explicit numbered search-plan capability.
updated: 2026-06-16
---

# Proposal: import CIT numbered search plans

## Confidence

Medium.
The README and AGENTS file clearly describe the search model and source-of-truth rules.
The product motivation and trade-offs still need human confirmation.

## Actor

`actor.travel-operator`

Confidence: medium.

A user who needs CIT to generate and execute reliable flight-search plans.

Evidence:

- README says CIT accepts trip requests and executes plans across Amadeus and ITA providers.

## Job

`job.find-reliable-flight-options`

Confidence: medium.

When a trip request arrives, the operator needs the system to generate reliable search plans so viable routes can be found without manually building every search.

Evidence:

- README describes natural-language and structured trip requests being expanded into numbered search plans.

## Story

`story.generate-numbered-search-plans`

Confidence: high.

As a travel operator, I want CIT to expand a trip request into numbered search plans by trip type and direction, so provider runners can execute the right searches consistently.

Evidence:

- README lists one-way US to Europe, Europe to US, Rest of World, and round-trip numbering.

## Rules

`rule.route-membership-source-of-truth`

Confidence: high.

Canonical airport-to-region membership lives in `packages/airport-profiles/src/regions.ts`.
Generated route files must not be patched directly.

Evidence:

- AGENTS.md says `CANONICAL_REGIONS` is the source of truth.

`rule.generated-route-files-reviewed-by-volume`

Confidence: high.

Generated route CSV changes must be reviewed by route-count diff before commit.

Evidence:

- AGENTS.md warns against broad generated CSV churn unless intentional and reviewed.

## Capability

`capability.numbered-search-plan-generation`

Confidence: high.

Generate search-number patterns and route logic for one-way and round-trip flight search plans.

Evidence:

- README maps this to `packages/strategy-engine`.

## Journey

`journey.trip-request-to-progressive-results`

Confidence: medium.

Accept request, expand into search plans, execute across providers, stream incremental results, store queue and result state.

Evidence:

- README product summary.

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

## Open questions for Omar

- Is the core actor an internal operator, an end customer, or both?
- Is the product outcome faster quote turnaround, higher route quality, lower concierge overhead, or all three?
- Which search-plan rules are product intent versus provider implementation detail?
- Which decisions explain why the numbered search model exists?
