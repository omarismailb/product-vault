#!/usr/bin/env node

// prose-lint: keep human-facing wiki prose in product language.
//
// The product wiki is meant to be readable top-down by non-technical people,
// but capability/decision prose tends to fill with implementation jargon
// ("injectable fetch", "pure and testable", "mixed-content failures"). This
// lint flags software-jargon terms that appear in the *product* prose of a unit,
// i.e. outside a "## How it works" / "## Implementation" section, and outside
// code. Jargon under the implementation heading is fine; that is its home.
//
// It is generic (a software-jargon dictionary, not words lifted from any one
// product) and section-keyed, and it ratchets: it fails only when the jargon
// count goes UP versus checks/prose-baseline.json, so existing units are not a
// wall of red and new units are held to the bar immediately.

import fs from "node:fs";
import path from "node:path";
import { walk, readText, parseFrontmatter, stripCode } from "./lib/wiki.mjs";

const ROOT = process.cwd();
const UPDATE_BASELINE = process.argv.includes("--update-baseline");
const BASELINE_PATH = path.join(ROOT, "checks/prose-baseline.json");

// Unit types whose body is product prose a non-engineer should be able to read.
// Glossary defines terms (jargon is the point); overview/index/log/design-system
// are structural or covered elsewhere.
const PROSE_TYPES = new Set(["actor", "job", "story", "acceptance-criterion", "rule", "journey", "capability", "outcome", "non-goal", "assumption", "decision"]);

// Generic software-jargon dictionary. Editable; not derived from any fixture.
const JARGON = [
  "injectable", "idempotent", "polymorphic", "monomorphic", "mutex", "semaphore",
  "middleware", "mixin", "polyfill", "transpile", "tokenizer", "parser",
  "serialize", "serialise", "deserialize", "deserialise", "nullable",
  "instantiate", "view model", "viewmodel", "DOM", "WebGL", "mixed-content",
  "payload", "deterministic", "stdout", "stderr", "callback",
];
const PATTERNS = JARGON.map((term) => ({
  term,
  re: new RegExp(`(?<![A-Za-z])${term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(?![A-Za-z])`, "gi"),
}));

// All body text except "## How it works" / "## Implementation*" sections.
function productProse(body) {
  const out = [];
  let skipping = false;
  for (const line of body.split("\n")) {
    if (/^##\s+/.test(line)) {
      const heading = line.replace(/^##\s+/, "").trim();
      skipping = /how it works|implementation/i.test(heading);
      continue;
    }
    if (!skipping) out.push(line);
  }
  return stripCode(out.join("\n"));
}

const byFile = {};
let total = 0;

for (const file of walk(path.join(ROOT, "wiki"), (f) => f.endsWith(".md"))) {
  const { data, body } = parseFrontmatter(readText(file));
  if (!PROSE_TYPES.has(data.type)) continue;
  if (data.status && data.status !== "active") continue;
  const prose = productProse(body);
  const hits = [];
  for (const { term, re } of PATTERNS) {
    const n = (prose.match(re) || []).length;
    if (n) hits.push(`${term}(${n})`);
    total += n;
  }
  if (hits.length) byFile[path.relative(ROOT, file)] = hits;
}

const current = { total, files: Object.keys(byFile).length };

if (UPDATE_BASELINE) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify({ ...current, byFile }, null, 2)}\n`);
  console.log(`prose-lint baseline written: ${total} jargon term(s) across ${current.files} unit(s).`);
  process.exit(0);
}

let baseline = null;
if (fs.existsSync(BASELINE_PATH)) {
  try {
    baseline = JSON.parse(readText(BASELINE_PATH));
  } catch (error) {
    console.error(`prose-lint: baseline is invalid JSON: ${error.message}`);
    process.exit(1);
  }
}

if (!baseline) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify({ ...current, byFile }, null, 2)}\n`);
  console.log(
    `prose-lint note: no baseline found; wrote checks/prose-baseline.json (${total} jargon term(s)). ` +
      `Commit it. Future units may not increase the count.`,
  );
  process.exit(0);
}

if (total > baseline.total) {
  console.error(
    `prose-lint failed: product-prose jargon increased from ${baseline.total} to ${total}. ` +
      `Move implementation terms under a "## How it works" heading, or rephrase in product language.`,
  );
  for (const [file, hits] of Object.entries(byFile)) {
    if (!baseline.byFile?.[file] || hits.join(",") !== baseline.byFile[file].join(",")) {
      console.error(`- ${file}: ${hits.join(", ")}`);
    }
  }
  process.exit(1);
}

const note = total < baseline.total ? ` (down from ${baseline.total}; run --update-baseline to lock in the improvement)` : "";
console.log(`prose-lint passed: ${total} jargon term(s) in product prose${note}.`);
