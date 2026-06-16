# Checks

This folder is for check manifests and reusable verification notes when Product Wiki is copied into an application repo.

The rule is simple: product claims need executable evidence where possible.
Acceptance criteria should link to tests, regression cases, evals, or manual verification steps that actually run against the product.

For the bare harness, `node scripts/product-wiki-check.mjs` validates the wiki, proposals, proposal-to-check links, and `checks/manifest.json`.
Run `node scripts/checks-lint.mjs --run` to execute the commands in the manifest.
Run `node scripts/routine-runner.mjs --all` for recurring maintenance loops.
Codex and Claude Code also run `node scripts/hook-loop.mjs --event stop` through native Stop hooks.
Inside a real app, add the app's normal test commands to the manifest.
