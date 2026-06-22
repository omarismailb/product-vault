#!/usr/bin/env node

import path from "node:path";
import { walk, readText, parseFrontmatter, sectionBody } from "./lib/wiki.mjs";

const ROOT = process.cwd();

const isMd = (file) => file.endsWith(".md");

function proposalBody(text) {
  const parsed = parseFrontmatter(text);
  if (parsed.data.type !== "proposal") return null;
  return parsed.body;
}

const section = (body, heading) => sectionBody(body, new RegExp(`^${heading}$`, "i"));

const files = [
  ...walk(path.join(ROOT, "intake/proposals"), isMd),
  ...walk(path.join(ROOT, "examples"), isMd),
];

const errors = [];
let checked = 0;

for (const file of files) {
  const body = proposalBody(readText(file));
  if (!body) continue;
  checked += 1;

  const rel = path.relative(ROOT, file);
  const acSection = section(body, "Acceptance criteria");
  const checksSection = section(body, "Checks to generate") || section(body, "Checks");
  const acIds = [...new Set(acSection.match(/\bac\.[a-z0-9.-]+\b/g) || [])];

  if (acIds.length && !checksSection.trim()) {
    errors.push(`${rel}: acceptance criteria need a "## Checks to generate" section`);
    continue;
  }

  for (const id of acIds) {
    if (!checksSection.includes(id)) {
      errors.push(`${rel}: ${id} is not referenced in checks`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`proposal-traceability-lint passed: ${checked} proposal file(s).`);
