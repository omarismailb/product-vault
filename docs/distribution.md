# Distribution

Product Wiki has two distribution modes.

## Repo harness

Use this when Product Wiki should live inside an application repo and govern how product changes reach code.

The harness installs:

- skills
- reviewer agents
- native Stop-loop settings
- scripts
- schemas
- templates
- starter wiki folders
- native turn-end loop wiring for Codex and Claude Code

The product repo owns:

- its product wiki
- proposals
- check manifest
- application code
- application tests
- project-specific agent instructions

Updates are explicit.
Run the upgrade prompt or `scripts/sync-managed.mjs` and review the diff.

This is intentional.
Agent instructions and settings can change how a repo behaves, so they should not auto-update without review.

## Codex plugin

Use this when the workflow itself should be installed into Codex as a reusable package.

The source repo includes `.codex-plugin/plugin.json`.
It points Codex at the Product Wiki skills.

The plugin is the right shape for distribution.
The repo harness is still the right shape for a product that needs a durable wiki, proposals, checks, and local traceability.

Plugin metadata is source-only.
It is not copied into application repos during a harness install.

## Best practice

Do not silently update installed repos from upstream.

Prefer:

1. versioned releases
2. explicit upgrade prompt
3. managed-file sync
4. diff review
5. `node scripts/product-wiki-check.mjs`
6. the target repo's normal checks

That is slower than auto-update, but safer for anything that can affect code generation.
