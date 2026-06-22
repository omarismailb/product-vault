# Wiki Write Rubric

Use this when writing or updating units under `wiki/` during apply-wiki-change.

## Two-way linking

Link units two ways.

In prose, use standard relative markdown links to real unit files.
For example, from a story unit, link to a related job with a path shaped like `../jobs/<job-slug>.md`.
These links render and click in GitHub, Obsidian, VS Code, and plain editors.

In the frontmatter `links:` array, list the bare unit ids (the machine-readable graph).

Do not use Obsidian-only `[[type.slug]]` links; they ship as dead text on GitHub.

## Product language vs implementation detail

Write `## What it does for you` in plain product language a non-engineer can understand: describe the value and the behaviour, not the mechanism.

Put every implementation term (injectable, fetch, pure, parser, DOM, view model, IANA, deterministic, mixed-content) under `## How it works`, never above it.

Omit `## How it works` when the unit has no implementation detail worth recording.

The precise, testable contract lives in the linked acceptance criteria and rules, so the product prose does not need to carry it.

## Connectivity

Every non-root unit must have at least one inbound link from another unit, or `wiki-connectivity-lint` fails.

Glossary, design-system, index, overview, and log are exempt.

A genuine top-level unit may set `no-inbound: true` in frontmatter.
