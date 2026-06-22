#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { parseUnit } from "./lib/wiki.mjs";

const ROOT = process.cwd();
const SKILL_ROOT = path.join(ROOT, ".agents/skills");
const errors = [];
const warnings = [];

// Parse a SKILL.md's frontmatter, reporting "missing YAML frontmatter" when the
// file has none (the shared parser is silent and returns empty data instead).
function parseFrontmatter(text, rel) {
  const { data, error } = parseUnit(text);
  if (error) {
    errors.push(`${rel}: missing YAML frontmatter`);
    return {};
  }
  return data;
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

if (!fs.existsSync(SKILL_ROOT)) {
  errors.push("missing .agents/skills");
} else {
  const entries = fs
    .readdirSync(SKILL_ROOT, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    const rel = `.agents/skills/${name}/SKILL.md`;
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
      errors.push(`${rel}: missing skill file`);
      continue;
    }

    const text = fs.readFileSync(full, "utf8");
    const frontmatter = parseFrontmatter(text, rel);

    if (frontmatter.name !== name) {
      errors.push(`${rel}: frontmatter name must match directory name "${name}"`);
    }

    if (!frontmatter.description) {
      errors.push(`${rel}: missing description`);
    } else {
      if (!frontmatter.description.startsWith("Use when")) {
        errors.push(`${rel}: description should start with "Use when" and describe trigger conditions only`);
      }
      if (/\b(turns|applies|updates|generates|runs|compiles|drafts)\b/i.test(frontmatter.description)) {
        warnings.push(`${rel}: description may summarize workflow instead of trigger conditions`);
      }
    }

    const claudeSkill = `.claude/skills/${name}`;
    if (!exists(claudeSkill)) {
      errors.push(`${rel}: missing mirrored Claude skill at ${claudeSkill}`);
    }

    const referencedPaths = [...text.matchAll(/`((?:references|templates|schemas|scripts)\/[^`]+?\.(?:md|json|mjs))`/g)]
      .map((match) => match[1])
      .filter((value) => !value.includes(" "));

    for (const referenced of referencedPaths) {
      const resolved = referenced.startsWith("references/")
        ? `.agents/skills/${name}/${referenced}`
        : referenced;
      if (!exists(resolved)) {
        errors.push(`${rel}: referenced path does not exist: ${referenced} (resolved ${resolved})`);
      }
    }
  }
}

if (warnings.length) {
  console.warn("Warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error(`skill-lint failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("skill-lint passed.");
