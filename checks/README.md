# Checks

This folder is for check manifests and reusable verification notes when Product Wiki is copied into an application repo.

The rule is simple: product claims need executable evidence where possible.
Acceptance criteria should link to tests, regression cases, evals, or manual verification steps that actually run against the product.

For the bare harness, `node scripts/product-wiki-check.mjs` validates the wiki, proposals, proposal-to-check links, wiki anchors, ratchet coverage, and `checks/manifest.json`.
Run `node scripts/checks-lint.mjs --run` to execute the commands in the manifest.
Run `node scripts/wiki-overview-lint.mjs` to confirm the whole-product overview exists, is linked from the index, links back to the index, and has been reviewed after active wiki units change.
Run `node scripts/wiki-anchor-lint.mjs --write-report` to refresh the local wiki-to-code source map under `.product-wiki/source-map.json`.
Run `node scripts/ratchet-lint.mjs` after implementation so check coverage and wiki anchors do not silently slip backwards.
Run `node scripts/routine-runner.mjs --all` for recurring maintenance loops.
Codex and Claude Code also run `node scripts/hook-loop.mjs --event stop` through native Stop hooks.
Inside a real app, add the app's normal test commands to the manifest.

## Authoring an executable check

An executable check's command must name a real test file under `tests/`, for example `node --test --test-name-pattern='^ac.your-id$' tests/your.test.mjs`.
Single-quote any `--test-name-pattern` that contains a regex anchor such as `$`, because the command runner rejects an unquoted `$` as a shell expansion.
For a repo `test` script, prefer a glob (`node --test tests/*.test.mjs`) over the bare directory form (`node --test tests/`), which fails on some Node versions.
