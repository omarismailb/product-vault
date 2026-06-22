# Changelog

This project follows [Semantic Versioning](https://semver.org/). Dates are in UTC (`YYYY-MM-DD`).

Only versions with a published artifact are listed as releases. The first published release is `1.7.1`, available on the npm registry and tagged `v1.7.1` in git. Earlier version numbers describe development history before that first release; they were never tagged or published, so they are grouped under a single pre-release note rather than presented as separate releases.

## 2.3.0 - 2026-06-22

Closes a gap where a passing acceptance check could still hide a real bug, plus first-public-release hardening.

- `generate-checks` now teaches edge-case coverage, not just check types. `references/check-patterns.md` gains a MECE edge-case trigger checklist: seven core triggers for any criterion that operates on values (boundary, cardinality, round-trip, time and calendar, ordering and ties, presence and validity, identity and matching) and two extended triggers for changes that add state or arithmetic (state and repetition, scale and precision). For each acceptance criterion the skill now asks which triggers it matches and requires a check for each match, and requires any matched trigger left unchecked to be named with a reason rather than left silent. This was prompted by a green acceptance check that asserted only happy-path times and so hid a DST off-by-one; the time-and-calendar trigger now calls out spring-forward, fall-back, and day-boundary cases directly. This is guidance, not a new gate: coverage judgement stays the agent's, recorded in the skill's output.
- First-public-release hardening: repo hygiene, a fully synthetic brownfield example, and version/manifest consistency across `VERSION`, `package.json`, `product-wiki.json`, and the Claude Code and Codex plugin manifests, now cross-checked by `doctor`.

## 2.2.0 - 2026-06-20

A second round of fixes from the end-to-end evolution test, closing gaps where a green gate could still hide a problem. Every fix ships with a unit test under `tests/unit/`, run by `script-tests` inside the gate.

- `checks-lint` no longer requires coverage for a retired criterion. It now drops any acceptance criterion whose current wiki status is `retired`/`superseded`/`rejected` from required coverage, the same rule `ratchet-lint` already applies. Before this, retiring a criterion and removing its check failed the gate, so a clean feature removal was impossible without editing the harness. The shared `RETIRED_STATUSES` set in `lib/wiki.mjs` keeps the two lints from drifting.
- New `managed-drift-lint`: the installer now records a sha256 of every managed harness file in the installed `product-wiki.json` (`managed_digests`), and this lint fails if any of them changed. It catches an agent silently patching a harness enforcement script to turn a red gate green. It is a no-op in the source repo and on installs that predate digests.
- The approval gate is enforced by default. `init` seeds `approvers` in the installed `product-wiki.json` from the repo's git identity (a user-customized list is preserved across upgrades), so `proposal-lint` enforces approver identity instead of treating approval as advisory. `doctor` warns when `approvers` is empty.
- New `wiki-retired-link-lint`: an active unit must not list a retired/superseded/rejected unit in its frontmatter `links:` graph, unless the link is the sanctioned supersession pointer. This closes the gap the connectivity lint leaves (reachable is not the same as free of stale dependencies). Prose history links are not affected.
- `proposal-lint` now fails when two non-rejected proposals target the same request, so a duplicate proposal cannot split a request lineage. A rejected earlier proposal is excluded, so normal iteration is unaffected.
- `init` replaces the npm-default `test` placeholder (which exits 1) so `npm test` is green at baseline; the first `compile-change` overwrites it with a real `node --test` command.

## 2.1.0 - 2026-06-18

- `propose-change` now teaches decomposition by example, not only by rule. The proposal rubric gains a "Sizing and splitting units" section and a worked example covering: splitting one request into several stories (a distinct user action is its own story), telling a job from a story, and telling a decision from a rule (a choice with a rejected alternative is a decision, not a rule), plus a "right-sized, not maximal" guard so units are not manufactured for trivial actions. The skill's self-review and `AGENTS.md` point to it. This is guidance, not a gate: decomposition quality stays the agent's judgment.
- Fixes from the end-to-end evolution test: `ratchet-lint` no longer scans proposal prose for `ac.*` tokens (it counts active acceptance-criterion units only), so a phantom id in prose or a removal proposal that names the criteria it retires no longer drops coverage and fails the gate. `compile-change` now says to save the compiler plan under `docs/compiler-plans/`, never in `intake/proposals/` (where `proposal-lint` treats every file as a proposal). The proposal template documents the `approved_by`/`approved_at` fields that approval requires. The connectivity rule (`apply-wiki-change`) and the required-anchor rule for capability/rule units (`compile-change`) are now stated in the skills, not only discoverable in lint source.

## 2.0.0 - 2026-06-18

Portable inter-unit links (breaking), and a clear statement of how the wiki connects to code.

- Inter-unit links are now portable. Unit prose uses standard relative markdown links (`[Label](../jobs/x.md)`) that render and click in GitHub, Obsidian, VS Code, and plain editors; the frontmatter `links:` array still holds the bare unit ids as the machine-readable graph. The unit template and `apply-wiki-change` generate relative links, and `wiki-link-lint` and `wiki-connectivity-lint` validate and follow them. The `aliases: [<id>]` workaround is removed from the template.
- BREAKING: Obsidian-only `[[type.slug]]` links are rejected by `wiki-link-lint` by default, because they render only in Obsidian and ship as dead text on GitHub. Relative markdown links work in Obsidian too, so this loses nothing. Migration: convert `[[type.slug]]` body links to `[Label](../type/slug.md)`. A repo that views its wiki solely in Obsidian can instead set `"allow_wikilinks": true` in `product-wiki.json` to keep `[[…]]` resolving.
- The wiki→code relationship is now explicit for the coding agent. `AGENTS.md`, the injected routing block, and `CONSTITUTION.md` state that the wiki is natural language and holds no code, and that code traces back to it by reference: `PW:<id>` comment anchors, the generated `.product-wiki/source-map.json`, and `checks/manifest.json`.

## 1.8.1 - 2026-06-18

Patch, from an end-to-end install-and-build test of 1.8.0.

- Fixed the installed gate. `self-test` is part of the universal check but depends on a source-only fixture wiki that is not synced into installed repos, so `npm run check` / `pw:check` failed on every fresh install of 1.8.0. `self-test` now no-ops cleanly when the fixture is absent and still does its non-vacuity work in the source repo.
- Fixed typed-link validation for hyphenated unit types. Links to `non-goal.*` and `design-system.*` were silently treated as free-form, so broken links to them passed and those units could not earn an inbound link. `wiki-link-lint` and `wiki-connectivity-lint` now share one type-list-aware id matcher in `scripts/lib/wiki.mjs`.
- Quieted the approval advisories. The "no approvers configured" note is emitted at most once per run instead of once per proposal, and the not-a-git-repo / uncommitted-approval case is no longer warned about.
- Documented two first-user sharp edges in `compile-change` and `checks/README.md`: a `--test-name-pattern` containing a `$` anchor must be single-quoted, and adding any UI file turns on `design-lint` and `design-token-lint`, so the design-system units must be filled. Also recommend putting tests under `tests/` and using a glob for the `test` script.

## 1.8.0 - 2026-06-18

Production-readiness hardening over 1.7.1.

Security and enforcement:

- `safe-exec` moved from a broad executable allow-list to command profiles. It now rejects, by default, every way an allow-listed runtime runs code other than the reviewed file it names: inline eval (`node -e`/`--eval`/`-p`/`--print`, `python -c`, `deno eval`), preload/loader injection (`node -r`/`--require`/`--loader`/`--experimental-loader`/`--import`/`--preload`), run-by-name (`python -m`, `npx`, `make`, `ts-node`, `tsx`), and control characters. A file-referencing interpreter must name an existing in-repo file, and a symlink whose target escapes the repo does not count. Opt a program back in per repo with `PRODUCT_WIKI_ALLOWED_COMMANDS`.
- `checks-lint` anti "test theatre" now applies to every executable check kind and every runner, not just `node --test`: an executable check must reference a real test file, inline-program flags are rejected, and a `--run` that executes zero tests fails.
- Optional approval allow-list: when `product-wiki.json` declares `approvers`, `intent-lint` and `proposal-lint` require `approved_by` to match a declared approver exactly. The human approval decision itself is enforced by PR review and branch protection, not by the linter; the git commit author of an approval is checked only as an advisory warning.
- A type-less file under `intake/proposals/` is now a `proposal-lint` error instead of being silently skipped.
- `wiki-link-lint` only honours an active-to-retired link when the edge is declared in frontmatter (`superseded_by`/`supersedes`), never inferred from prose.
- `wiki-anchor-lint` requires a `no-code: true` opt-out on an active capability or rule to be backed by an approved proposal.
- `ratchet-lint` guards against an uncommitted change that lowers the coverage baseline (overridable with `--allow-baseline-decrease`).
- New `wiki-connectivity-lint` flags units with no inbound link; new `design-token-lint` checks that documented design tokens appear in the CSS.
- `doctor` now runs as part of the default gate, scans committed files for common secret formats and local machine paths, warns when the repo is not under git, and verifies the gate script still runs the checks.
- A small committed fixture wiki plus a `self-test` step keeps the content lints from passing vacuously on the harness's own near-empty wiki.
- CI runs on a Node 18/20/22 matrix, and an installable workflow ships under `templates/github-workflows/` so installed products get a blocking gate.

Documentation:

- Corrected the README install claim: `pw:*` npm scripts are added only when the target repo has a `package.json`. In a bare repo none are created, so the gate is run with `node scripts/product-wiki-check.mjs`.
- `SECURITY.md` states that the registry release exists, recommends a SHA-pinned install and npm provenance, and describes the command-profile trust boundary honestly.
- Added `docs/README.md` as a one-line index of the docs.
- Unified the install instructions across the README, `docs/install.md`, and `SECURITY.md` on the npm registry path (`npx product-wiki@<version>`) as canonical, with a SHA-pinned GitHub install for tamper-evident reproducibility.
- Removed the stale `/plugin marketplace` install path from the docs to match the README.

## 1.7.1 - 2026-06-17

First published release. Available on the npm registry as `product-wiki@1.7.1` and tagged `v1.7.1`.

This is an early release of the harness: skills, reviewer agents, the native Stop-loop wiring, the deterministic check and routine runners, the product-wiki templates and schemas, the installer (`bin/product-wiki.mjs` plus `scripts/sync-managed.mjs`), and the public docs. It is hardening as it is used against real changes, so treat it as early rather than settled.

Security and enforcement notes for this release:

- Manifest `command` strings do not run through a shell. `scripts/lib/safe-exec.mjs` tokenises commands, rejects shell metacharacters (`&&`, `;`, `|`, redirects, globs, `$(...)`, backticks), and allow-lists the executable, so a check edited in a pull request cannot chain or inject a shell command on a reviewer's machine. The allow-list narrows but does not eliminate the trust boundary; see `SECURITY.md` for the residual interpreter inline-eval risk. Extend the allow-list with `PRODUCT_WIKI_ALLOWED_COMMANDS`.
- The default gate (`npm run check`, `npm test`, CI) executes the acceptance-criteria checks (`checks-lint --run`), not just structure lints, and the managed CI workflow calls `node scripts/product-wiki-check.mjs` directly so it works in installed repos that expose `pw:check`.
- The approval harvest reads acceptance-criteria ids only from a proposal's `## Acceptance criteria` section, links and anchors are lifecycle-aware, and `wiki-lint` validates the status enum.
- `sync-managed` refuses to follow a symlink whose target escapes the package, and reconstructs `.claude/skills` from `.agents/skills` so installs are correct whether or not symlinks survive packaging.
- A Claude Code plugin manifest (`.claude-plugin/plugin.json`) and a Codex plugin manifest (`.codex-plugin/plugin.json`) ship for discovery and distribution of the workflow itself; the harness install does not copy plugin metadata into application repos.

## Pre-1.7.1 development history (pre-release, no tagged artifacts)

The version numbers below were used during development before the first published release. None were tagged in git or published to the registry, so they are kept here as a development record rather than as installable releases. The notable steps were:

- One-command installer CLI wrapping the ownership-aware `sync-managed` copy.
- Greppable `PW:` wiki anchors, a local source map, and a ratchet check so approval, executable-check, and anchor coverage cannot quietly slip backwards.
- Approval gate enforced deterministically by `intent-lint`, plus `wiki-link-lint` for broken typed `[[unit.id]]` links.
- End-to-end brownfield import (`import-codebase` plus `import-coverage`) instead of a one-capability sample.
- Templates made first-class contracts with repair-first recovery (`repair-contracts`), proposal hardening, and skill pressure scenarios.
- `wiki/overview.md` as the whole-product map, with its own template, lint, and freshness routine.
- The compile lifecycle guard, `lifecycle-lint`, and the approved -> compile -> implemented model.
- The shared `scripts/lib/wiki.mjs` helpers, `design-lint`, and `prose-lint`.

## Release discipline going forward

- A version is listed as a release here only after it is tagged in git and published to the registry.
- Unreleased work accumulates under `## Unreleased` and is renamed to the version on release.
- Releases follow Semantic Versioning, and the recommended publish path is `npm publish --provenance` from CI so installs are verifiable back to source.
