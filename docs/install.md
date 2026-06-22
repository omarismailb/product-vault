# Install

The quickest path is the installer CLI, run from the root of your repo (no global install). The canonical source is the npm registry:

```bash
npx product-wiki@latest init      # install into the current repo
npx product-wiki@latest sync      # re-sync managed files (upgrade)
npx product-wiki@latest init --dry-run   # preview, write nothing
```

Pin a version for a reproducible install (`npx product-wiki@2.3.0 init`).

For a tamper-evident install you can verify against source, install from a pinned commit SHA on GitHub instead of a mutable tag:

```bash
npx github:omarismailb/product-wiki#<40-char-commit-sha> init
```

A registry version or a git tag is convenient but mutable; a commit SHA is the only form that is reproducible and tamper-evident today. See [SECURITY.md](../SECURITY.md) for the install-integrity notes. The CLI wraps the ownership-aware
`sync-managed.mjs` copy and then runs the harness checks. The agent-led and manual paths below
remain available and do the same thing underneath.

In a repo with no `package.json`, the installer cannot add `pw:*` scripts, so run the gate directly with `node scripts/product-wiki-check.mjs` (see Troubleshooting below).

Product Wiki can start a new product or be retrofitted into an existing repo.

The safest installation path is agent-led.
The agent should inspect the target repo, preserve existing project rules, install the managed harness files, and stop for review when a file needs merging.

## New repo

Ask Codex or Claude Code to start from Product Wiki.

Paste this into a fresh folder:

```text
Start a new product from https://github.com/omarismailb/product-wiki.

Set up the repo, run the harness checks, and then work with me on the first product wiki proposal before writing application code.
```

The agent can run:

```bash
git clone https://github.com/omarismailb/product-wiki.git my-product
cd my-product
node scripts/product-wiki-check.mjs
node scripts/doctor.mjs
```

Start normally:

```text
I want to build [feature].
Ask me questions until the product wiki change is clear.
Do not write code until I approve the wiki proposal.
```

## Existing repo

Open the target repo in Codex or Claude Code and paste:

```text
Install Product Wiki into this repo from https://github.com/omarismailb/product-wiki.

Inspect the current repo first.
Preserve existing AGENTS.md, CLAUDE.md, .claude, .codex, scripts, tests, CI, and project-specific rules.
Install managed Product Wiki files.
For existing AGENTS.md or CLAUDE.md files, activate Product Wiki by adding the managed routing block without deleting local rules.
For other files that already exist and need merging, put the Product Wiki version in .product-wiki/incoming/ and show me the diff.
Do not overwrite the product wiki, proposals, app code, or app tests.
Run the harness checks and the repo's normal checks.
Explain how to run Product Wiki routines with node scripts/routine-runner.mjs --all.
Explain how to run Product Wiki anchor, source-map, and ratchet checks.
Report files changed, files skipped, and anything requiring human judgement.
```

The agent can use this underneath:

```bash
tmp="$(mktemp -d)"
git clone --depth=1 https://github.com/omarismailb/product-wiki.git "$tmp/product-wiki"
node "$tmp/product-wiki/scripts/sync-managed.mjs" --target . --write
node scripts/product-wiki-check.mjs
node scripts/doctor.mjs
```

Use a fresh clone for each install or upgrade.
That keeps the managed files tied to a clear upstream version.

The installer updates existing `AGENTS.md` and `CLAUDE.md` files with an idempotent managed block between `product-wiki-routing` markers.
That makes normal product requests route through Product Wiki immediately while preserving the repo's existing instructions.

If the target repo has a `package.json`, the installer also adds collision-free `pw:*` scripts (for example `npm run pw:check`, `npm run pw:doctor`, `npm run pw:checks-run`, `npm run pw:overview`, `npm run pw:wiki-anchors`, `npm run pw:source-map`, and `npm run pw:ratchet`) without touching the repo's own scripts.
You can always call the scripts directly with `node scripts/...`.

## Repair managed contracts

If a managed template, skill, or script is missing, do not recreate it by hand.
Run:

```bash
node scripts/repair-contracts.mjs --write
node scripts/template-lint.mjs
node scripts/skill-lint.mjs
```

If the repo has package scripts from the installer, this is:

```bash
npm run pw:repair
```

The repair command restores managed Product Wiki contracts only.
It does not edit application code, application tests, product wiki units, proposals, or the product's check manifest.

## Enforcement

The approval gate is enforced deterministically.
`node scripts/product-wiki-check.mjs` runs `intent-lint`, which fails if an acceptance criterion is `active` without an approved or implemented proposal.
It also runs `checks-lint`, which requires manifest coverage once a proposal is `implemented`.
Approved proposals can remain pending compile so the agent can generate checks before code without fighting check-time enforcement.

## What gets updated

Product Wiki separates managed harness files from user-owned product files.

Managed files can be updated from the upstream repo.
User-owned files should not be overwritten by an update.

See `product-wiki.json` for the current ownership map.

## First use after install

For a new codebase, ask:

```text
I want to build [feature].
Work with me to turn this into a product wiki proposal first.
Do not write code until I approve the proposal.
```

For an existing codebase, ask:

```text
Read this repo and draft the first product wiki from what the code, docs, tests, and agent instructions reveal.
Treat the output as proposals, not facts.
Chunk the import by capability so I can review it.
Create an import inventory with batches and a resume point.
Do not edit application code.
```

## Upgrading

Run `sync` (or `sync-managed.mjs --write`) from a fresh clone of the version you want.
The sync updates managed harness files, preserves your wiki/proposals/app code, and refreshes the routing block.

Two upgrade notes:

- After installing or upgrading inside a running agent session, restart the session so the turn-end Stop loop is registered. Agents read hook configuration at session start.
- `.claude/settings.json` and `.codex/config.toml` are merge-required. When they change upstream, the new version is staged under `.product-wiki/incoming/` and your active file is left in place. `node scripts/doctor.mjs` warns when staged updates are unmerged, so review and reconcile them.

### Proposal-format migration (upgrading from before v1.3.0)

`proposal-lint` was hardened in v1.3.0 to require a fixed set of `## ` sections.
Proposals authored before v1.3.0 will fail the hardened lint after an upgrade, and `repair-contracts` does not rewrite them (it restores managed contracts only, never your proposals).
Re-author each old proposal against `templates/proposal-template.md` (add the missing sections). `node scripts/proposal-lint.mjs` names exactly which sections each proposal is missing.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm error Missing script: "check"` | Installed repos expose the gate as `pw:check`, not `check` | Run `npm run pw:check` or `node scripts/product-wiki-check.mjs`. CI should call the script directly. |
| `npm run check` fails right after `init` in an empty folder | No `package.json`, so the `pw:*` scripts were not added | Run `node scripts/product-wiki-check.mjs` directly, or `npm init -y` first, then re-run `init`. |
| `.claude/skills` look empty or broken after install | The copy method stripped symlinks | Re-run `sync`; the installer reconstructs `.claude/skills` from `.agents/skills` as real files. |
| A template/skill/script is missing | Managed contract drifted | `node scripts/repair-contracts.mjs --write` (or `npm run pw:repair`). |
| `wiki-overview-lint` says `index.md should link to wiki/overview.md` | Repo predates v1.6.0 | Re-run `sync`; it appends the `[[wiki.overview]]` link to `index.md`. |
| A check is rejected as not allowed | The check command is not an allow-listed executable, or uses shell features | Use a single program invocation (no `&&`/pipes/redirects). Extend the allow-list with `PRODUCT_WIKI_ALLOWED_COMMANDS` for unusual stacks. |
| `design-lint` fails on a UI product | A `wiki/design-system/*.md` unit is an empty scaffold or orphan | Fill in the design-system units and link them to the journeys/capabilities they govern. |
| `prose-lint` fails | A new unit added implementation jargon to its product prose | Move the implementation terms under a `## How it works` heading, or rephrase in product language. |
