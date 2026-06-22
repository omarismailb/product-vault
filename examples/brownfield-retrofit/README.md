# Brownfield example: retrofitting an existing codebase

This example shows what `import-codebase` produces as the first small retrofit proposal for an existing repo.

The codebase here is Flagpole, a fictional feature-flag service. It already has a `README.md`, an `AGENTS.md`, package docs, and tests, but no product wiki.
The retrofit imports one capability at a time so each proposal stays small enough to review, rather than absorbing the whole repo at once.

## First import scope

Capability: percentage rollout.

Evidence:

- `README.md`
- `AGENTS.md`
- `package.json`
- `packages/flag-engine/src/rollout.ts`
- `tests/rollout.test.ts`

## Expected flow

1. `import-codebase` scans the repo and drafts an import inventory.
2. It writes one small import proposal per capability, starting with percentage rollout.
3. The product owner reviews and approves the proposal.
4. `apply-wiki-change` writes the wiki units.
5. `generate-checks` links existing tests, or drafts new checks, for the acceptance criteria.

## Result

See `proposal.md`.
