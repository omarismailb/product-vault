#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];
const cache = new Map();

const requiredTemplates = [
  "templates/proposal-template.md",
  "templates/wiki-overview-template.md",
  "templates/wiki-unit-template.md",
  "templates/compiler-plan-template.md",
  "templates/import-inventory-template.md",
  "templates/import-proposal-template.md",
  "templates/check-manifest-entry.json",
  "templates/checks-manifest-starter.json",
];

function read(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    errors.push(`missing template: ${rel}`);
    cache.set(rel, null);
    return null;
  }
  const text = fs.readFileSync(full, "utf8");
  cache.set(rel, text);
  return text;
}

for (const rel of requiredTemplates) read(rel);

const proposal = read("templates/proposal-template.md");
const proposalHeadings = [
  "## Request",
  "## Why now",
  "## Request type and risk",
  "## Product wiki impact",
  "## Approaches considered",
  "## Proposed wiki changes",
  "## Acceptance criteria",
  "## Checks to generate",
  "## Reuse or refactor question",
  "## Architecture and design notes",
  "## Out of scope",
  "## Open questions",
  "## Self-review",
  "## Approval",
];

if (proposal) {
  for (const heading of proposalHeadings) {
    if (!proposal.includes(heading)) errors.push(`proposal-template.md missing heading: ${heading}`);
  }
}

const unitTerms = [
  "Actor",
  "Job",
  "Story",
  "Journey",
  "Capability",
  "Rule",
  "Acceptance criterion",
  "Outcome",
  "Non-goal",
  "Assumption",
  "Glossary",
  "Decision",
];

if (proposal) {
  for (const term of unitTerms) {
    if (!proposal.includes(term)) errors.push(`proposal-template.md missing unit family: ${term}`);
  }
}

const wikiUnit = read("templates/wiki-unit-template.md");
if (wikiUnit) {
  for (const heading of ["## What it does for you", "## How it works", "## Unit guidance", "## Links", "## Evidence", "## Review notes"]) {
    if (!wikiUnit.includes(heading)) errors.push(`wiki-unit-template.md missing heading: ${heading}`);
  }
}

const wikiOverview = read("templates/wiki-overview-template.md");
if (wikiOverview) {
  for (const heading of [
    "## What this product is",
    "## Who it serves",
    "## Main journeys",
    "## Main capabilities",
    "## Rules that matter",
    "## Out of scope",
    "## Key decisions",
    "## Where to look next",
    "## Review notes",
  ]) {
    if (!wikiOverview.includes(heading)) errors.push(`wiki-overview-template.md missing heading: ${heading}`);
  }
}

const compilerPlan = read("templates/compiler-plan-template.md");
if (compilerPlan) {
  for (const heading of [
    "## Product decision",
    "## Wiki units being compiled",
    "## Blast radius",
    "## Reuse or refactor",
    "## Checks first",
    "## Wiki anchors",
    "## Architecture and implementation decision",
    "## Implementation steps",
    "## Verification evidence",
    "## Completion checklist",
  ]) {
    if (!compilerPlan.includes(heading)) errors.push(`compiler-plan-template.md missing heading: ${heading}`);
  }
}

const importInventory = read("templates/import-inventory-template.md");
if (importInventory) {
  for (const heading of [
    "## Import progress",
    "## Product surfaces discovered",
    "## Capabilities to import",
    "## Batch plan",
    "## Cross-cutting concerns",
    "## Deliberately out of scope",
  ]) {
    if (!importInventory.includes(heading)) errors.push(`import-inventory-template.md missing heading: ${heading}`);
  }
}

for (const rel of ["templates/check-manifest-entry.json", "templates/checks-manifest-starter.json"]) {
  try {
    const text = read(rel);
    if (text) JSON.parse(text);
  } catch (error) {
    errors.push(`${rel}: invalid JSON (${error.message})`);
  }
}

if (errors.length) {
  console.error(`template-lint failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`template-lint passed: ${requiredTemplates.length} template file(s).`);
