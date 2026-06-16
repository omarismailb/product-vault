# CIT retrofit test

This is a dry-run retrofit of Product Wiki against an existing flight-search repo.

The target repo already had `README.md`, `AGENTS.md`, `CLAUDE.md`, package docs, tests, and custom Claude assets.
Because the repo had active local work, this example did not write into it.
It shows what `import-codebase` should produce as the first small proposal.

## First import scope

Capability: explicit numbered search plans.

Evidence:

- `README.md`
- `AGENTS.md`
- `package.json`
- `packages/strategy-engine`
- `routes-and-logic/`

## Result

See `proposal-cit-search-plans.md`.
