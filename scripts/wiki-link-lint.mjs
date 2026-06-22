#!/usr/bin/env node

// wiki-link-lint: catch broken and lifecycle-violating wiki links.
//
// Inter-unit links come in two complementary forms:
//   - CANONICAL (body): a standard relative markdown link, for example
//     [Remember material](../jobs/remember-material.md). These render and click
//     in GitHub, Obsidian, VS Code, and plain editors alike, so this is the form
//     units use in their prose.
//   - frontmatter `links:`: the bare unit ids (the machine-readable graph).
//
// Obsidian-only [[type.slug]] links are rejected by default, because they render
// only in Obsidian and ship as dead text on GitHub. A repo that views its wiki
// solely in Obsidian can opt back in with "allow_wikilinks": true in
// product-wiki.json (then they resolve as typed links). Relative markdown links
// work in both, so they are the canonical form and nothing is lost by the default.
//
// A link is broken when a relative `.md` path that points into `wiki/` does not
// resolve to an existing unit file, or a [[id]] / frontmatter id does not resolve
// to a declared unit id. An active unit may not link to a retired/superseded unit
// except along a lifecycle edge declared in frontmatter (superseded_by/supersedes).

import fs from "node:fs";
import path from "node:path";
import { walk, readText, parseFrontmatter, asList, TYPED_ID_RE, RETIRED_STATUSES } from "./lib/wiki.mjs";

const ROOT = process.cwd();
const WIKI_DIR = path.join(ROOT, "wiki");
const errors = [];
let linkCount = 0;

// Opt-out for Obsidian-only repos. Default false: [[…]] is an error.
function allowWikilinks() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "product-wiki.json"), "utf8")).allow_wikilinks === true;
  } catch {
    return false;
  }
}
const ALLOW_WIKILINKS = allowWikilinks();

const scanDirs = ["wiki", "intake/proposals", "examples"];
const files = scanDirs.flatMap((dir) => walk(path.join(ROOT, dir), (f) => f.endsWith(".md")));

const declared = new Set();
const statusById = new Map();
const unitByRel = new Map(); // repo-relative posix path -> { id, status }
const records = [];

for (const file of files) {
  const { data, body } = parseFrontmatter(readText(file));
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  if (data.id) {
    declared.add(data.id);
    if (data.status) statusById.set(data.id, data.status);
    unitByRel.set(rel, { id: data.id, status: data.status });
  }
  records.push({ rel, file, body, data });
}

function lifecycleAllowed(record, target) {
  if (asList(record.data.superseded_by).includes(target)) return true;
  if (asList(record.data.supersedes).includes(target)) return true;
  return false;
}

// A link expressed as a bare id (frontmatter `links:` or a body [[id]]).
function checkId(record, target, where) {
  if (!TYPED_ID_RE.test(target)) return; // free-form, ignore
  linkCount += 1;
  if (!declared.has(target)) {
    errors.push(`${record.rel}: broken wiki link ${where} [[${target}]] does not resolve to a declared unit id.`);
    return;
  }
  if (record.data.status === "active" && RETIRED_STATUSES.has(statusById.get(target)) && !lifecycleAllowed(record, target)) {
    errors.push(
      `${record.rel}: active unit links ${where} to ${statusById.get(target)} unit [[${target}]]. ` +
        `Re-point it at a live unit, or declare the edge in frontmatter (superseded_by/supersedes).`,
    );
  }
}

// A link expressed as a relative markdown link [label](href).
function checkMarkdownLink(record, href) {
  let target = (href || "").trim();
  if (!target || /^(https?:|mailto:|tel:|#)/i.test(target)) return; // external / anchor
  target = target.split("#")[0];
  if (!target.endsWith(".md")) return; // directory or non-md link: navigation, not a unit edge
  const abs = path.resolve(path.dirname(record.file), target);
  const underWiki = abs === WIKI_DIR || abs.startsWith(WIKI_DIR + path.sep);
  if (!fs.existsSync(abs)) {
    // Only a link that points into wiki/ is a unit-graph error; a stray link to
    // a missing doc elsewhere is the author's concern, not this lint's.
    if (underWiki) errors.push(`${record.rel}: broken link [${target}] does not resolve to an existing file.`);
    return;
  }
  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  const unit = unitByRel.get(rel);
  if (!unit) return; // resolves to a real non-unit file (e.g. a doc) — fine
  linkCount += 1;
  if (record.data.status === "active" && RETIRED_STATUSES.has(unit.status) && !lifecycleAllowed(record, unit.id)) {
    errors.push(
      `${record.rel}: active unit links to ${unit.status} unit [${target}] (${unit.id}). ` +
        `Re-point it at a live unit, or declare the edge in frontmatter (superseded_by/supersedes).`,
    );
  }
}

for (const record of records) {
  for (const target of asList(record.data.links)) checkId(record, target, "(frontmatter links)");
  for (const line of record.body.split("\n")) {
    for (const m of line.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const target = m[1].trim();
      if (ALLOW_WIKILINKS) {
        checkId(record, target, ""); // opted in: still resolved as a typed link
      } else {
        errors.push(
          `${record.rel}: Obsidian-only [[${target}]] link ships as dead text on GitHub. ` +
            `Use a relative markdown link, e.g. [Label](../jobs/the-slug.md). ` +
            `To keep [[…]], set "allow_wikilinks": true in product-wiki.json.`,
        );
      }
    }
    for (const m of line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      checkMarkdownLink(record, m[1]);
    }
  }
}

if (errors.length) {
  console.error(`wiki-link-lint failed with ${errors.length} issue(s):`);
  for (const issue of errors) console.error(`- ${issue}`);
  process.exit(1);
}
console.log(`wiki-link-lint passed: ${linkCount} typed link(s) resolve.`);
