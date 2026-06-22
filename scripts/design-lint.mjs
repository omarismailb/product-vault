#!/usr/bin/env node

// design-lint: make the design system a real gate on UI-heavy products.
//
// The harness scaffolds wiki/design-system/*.md and ships a "design-drift"
// routine, but that routine is advisory, so a UI product could ship with an
// empty design system and still pass every check. This lint, gated on the
// presence of a real UI in the repo, fails when an active design-system unit is
// still an empty scaffold or an orphan. Non-UI products (CLIs, libraries) skip
// it, so the harness's own repo and headless products are unaffected.

import path from "node:path";
import {
  walk,
  readText,
  parseFrontmatter,
  committableFiles,
  sectionBody,
  stripCode,
  UI_EXTENSIONS,
} from "./lib/wiki.mjs";

const ROOT = process.cwd();
const NON_SOURCE = ["wiki/", "docs/", "templates/", "examples/", "schemas/", "intake/", "node_modules/", ".product-wiki/", ".git/"];
const MIN_PROSE_CHARS = 120;

function hasUi() {
  for (const file of committableFiles(ROOT)) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (NON_SOURCE.some((p) => rel.startsWith(p))) continue;
    if (UI_EXTENSIONS.has(path.extname(file))) return rel;
  }
  return null;
}

// A unit body with frontmatter already removed: drop heading lines and code, so
// we measure real prose, and detect the scaffold sentinels the installer ships.
function isScaffold(body) {
  if (/^##\s+Template\b/m.test(body)) return true;
  if (/\bDocument\b[^.\n]*\bhere\b/i.test(body)) return true;
  return false;
}

function proseLength(body) {
  const prose = stripCode(body)
    .split("\n")
    .filter((line) => !/^#{1,6}\s/.test(line) && !/^- (Audience|Product feel|Reusable|Accessibility|Content rules|Anti-patterns):/.test(line.trim()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return prose.length;
}

const units = [];
const referenced = new Set();

for (const file of walk(path.join(ROOT, "wiki"), (f) => f.endsWith(".md"))) {
  const text = readText(file);
  const { data, body } = parseFrontmatter(text);
  if (data.type === "design-system" && data.status === "active" && data.id) {
    units.push({ id: data.id, rel: path.relative(ROOT, file), data, body });
  }
  // Track inbound references to design-system ids (body links + frontmatter
  // links), never counting a unit's reference to itself.
  const selfId = data.id;
  for (const match of text.matchAll(/\[\[(design-system\.[a-z0-9.-]+)\]\]/g)) {
    if (match[1] !== selfId) referenced.add(match[1]);
  }
  for (const link of Array.isArray(data.links) ? data.links : []) {
    if (/^design-system\./.test(link) && link !== selfId) referenced.add(link);
  }
}

const uiFile = hasUi();
if (!uiFile) {
  console.log("design-lint skipped: no UI detected (no .html/.css/.tsx/... source files).");
  process.exit(0);
}

if (units.length === 0) {
  console.log("design-lint passed: no active design-system units to check.");
  process.exit(0);
}

const errors = [];
for (const unit of units) {
  if (isScaffold(unit.body)) {
    errors.push(`${unit.rel}: design-system unit is still an empty scaffold (contains the template placeholder). Fill it in for this UI product.`);
  } else if (proseLength(unit.body) < MIN_PROSE_CHARS) {
    errors.push(`${unit.rel}: design-system unit has almost no content (<${MIN_PROSE_CHARS} chars of prose). Document the real design intent.`);
  }
  if (!referenced.has(unit.id)) {
    errors.push(
      `${unit.rel}: design-system unit "${unit.id}" is an orphan (no inbound reference from any journey, capability, component, or other unit). ` +
        `A documented design-system unit must be referenced by the work it governs. ` +
        `Add a [[${unit.id}]] link (or a links: entry) from the journey/capability/component it applies to.`,
    );
  }
}

if (errors.length) {
  console.error(`design-lint failed with ${errors.length} issue(s) (UI detected at ${uiFile}):`);
  for (const issue of errors) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`design-lint passed: ${units.length} design-system unit(s) on a UI product.`);
