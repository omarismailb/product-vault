# Upgrade

Product Wiki does not auto-update installed repos.
That is intentional.

Agent instructions, agent settings, and scripts can change how a repo behaves.
Updates must be explicit, reviewable, and versioned.

## Recommended update flow

From inside the target repo:

```text
Upgrade Product Wiki in this repo to the latest version from https://github.com/omarismailb/product-wiki.

Inspect the installed version and local changes first.
Update managed harness files only.
Preserve the product wiki, proposals, check manifest, app code, app tests, and project-specific agent rules.
Preserve `.product-wiki/ratchet-baseline.json` if the repo uses a ratchet baseline.
Regenerate `.product-wiki/source-map.json` after upgrading with `node scripts/wiki-anchor-lint.mjs --write-report`.
Refresh the managed Product Wiki routing block in AGENTS.md and CLAUDE.md without deleting local rules.
For other merge-required files, stage the upstream version in .product-wiki/incoming/ and show me the diff.
Run Product Wiki checks and the repo's normal checks.
Do not commit until I approve the diff.
```

The agent can use:

```bash
tmp="$(mktemp -d)"
git clone --depth=1 https://github.com/omarismailb/product-wiki.git "$tmp/product-wiki"
node "$tmp/product-wiki/scripts/sync-managed.mjs" --target . --write
node scripts/product-wiki-check.mjs
node scripts/doctor.mjs
```

## Ownership rules

- `wiki/` content is owned by the product repo.
- `intake/` content is owned by the product repo.
- `checks/manifest.json` is owned by the product repo after install.
- Skills, schemas, scripts, routines, templates, and agent settings are managed by Product Wiki.
- Routine reports under `.product-wiki/` are local runtime output and should not be committed.
- `AGENTS.md` and `CLAUDE.md` receive a managed Product Wiki routing block when they already exist.
- Agent settings still require review when they already exist.

This matches the Spec Kit/BMAD pattern: update shared infrastructure, preserve project artifacts.

## What does not happen

Installed repos do not auto-update when Product Wiki changes upstream.

That is a feature, not a gap.
An automatic update could change skills, scripts, or agent rules without the product owner noticing.

Use releases, explicit upgrade prompts, and diff review.
