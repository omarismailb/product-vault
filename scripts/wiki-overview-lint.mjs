#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { walk, readText, parseUnit } from "./lib/wiki.mjs";

const ROOT = process.cwd();
const WIKI = path.join(ROOT, "wiki");
const OVERVIEW = path.join(WIKI, "overview.md");
const INDEX = path.join(WIKI, "index.md");
const errors = [];

const requiredHeadings = [
  "## What this product is",
  "## Who it serves",
  "## Main journeys",
  "## Main capabilities",
  "## Rules that matter",
  "## Out of scope",
  "## Key decisions",
  "## Where to look next",
  "## Review notes",
];

const ignoredFreshnessTypes = new Set([
  "overview",
  "index",
  "log",
  "glossary",
  "design-system",
]);

function rel(file) {
  return path.relative(ROOT, file);
}

function isLater(a, b) {
  return /^\d{4}-\d{2}-\d{2}$/.test(a) && /^\d{4}-\d{2}-\d{2}$/.test(b) && a > b;
}

if (!fs.existsSync(OVERVIEW)) {
  errors.push("wiki/overview.md is missing");
} else {
  const text = readText(OVERVIEW);
  const parsed = parseUnit(text);
  if (parsed.error) errors.push(`wiki/overview.md: ${parsed.error}`);

  if (parsed.data.id !== "wiki.overview") errors.push("wiki/overview.md: id must be wiki.overview");
  if (parsed.data.type !== "overview") errors.push("wiki/overview.md: type must be overview");
  if (!["active", "draft"].includes(parsed.data.status)) {
    errors.push("wiki/overview.md: status must be active or draft");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.updated || "")) {
    errors.push("wiki/overview.md: updated must be YYYY-MM-DD");
  }

  for (const heading of requiredHeadings) {
    if (!text.includes(heading)) errors.push(`wiki/overview.md missing heading: ${heading}`);
  }

  if (!/\]\((?:\.\/)?index\.md\)|\[\[wiki\.index\]\]/.test(text)) {
    errors.push("wiki/overview.md should link to wiki/index.md");
  }

  if (parsed.data.updated) {
    for (const file of walk(WIKI, (f) => f.endsWith(".md"))) {
      if (file === OVERVIEW) continue;
      const unit = parseUnit(readText(file));
      if (unit.error) continue;
      if (ignoredFreshnessTypes.has(unit.data.type)) continue;
      if (["rejected", "superseded"].includes(unit.data.status)) continue;
      if (isLater(unit.data.updated, parsed.data.updated)) {
        errors.push(
          `wiki/overview.md is older than ${rel(file)} (${unit.data.updated}). ` +
            "Review the overview and update its date, even if the summary does not need prose changes.",
        );
      }
    }
  }
}

if (!fs.existsSync(INDEX)) {
  errors.push("wiki/index.md is missing");
} else {
  const index = fs.readFileSync(INDEX, "utf8");
  if (!/\]\((?:\.\/)?overview\.md\)|\[\[wiki\.overview\]\]/.test(index)) {
    errors.push("wiki/index.md should link to wiki/overview.md");
  }
}

if (errors.length > 0) {
  console.error(`wiki-overview-lint failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("wiki-overview-lint passed.");
