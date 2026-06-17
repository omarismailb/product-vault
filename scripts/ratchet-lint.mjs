#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const UPDATE_BASELINE = process.argv.includes("--update-baseline");
const BASELINE_PATH = path.join(ROOT, ".product-wiki/ratchet-baseline.json");
const WIKI_ID_RE = /\b(?:actor|job|story|ac|rule|journey|capability|outcome|non-goal|assumption|glossary|decision|wiki|proposal)\.[a-z0-9.-]+\b/g;
const ANCHOR_RE = /\bPW:([a-z0-9][a-z0-9.-]*)\b/g;
const CODE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".clj",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".mjs",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sql",
  ".svelte",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
]);

function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === ".product-wiki") continue;
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    if (entry.isFile() && predicate(full)) out.push(full);
  }
  return out;
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: text };
  const data = {};
  for (const raw of match[1].split("\n")) {
    const line = raw.trim();
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!parts) continue;
    data[parts[1]] = parts[2].replace(/^["']|["']$/g, "");
  }
  return { data, body: text.slice(match[0].length) };
}

function run(label, args) {
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
  });
  return {
    label,
    status: result.status || 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function manifestCoverage() {
  const criteria = new Set();
  const covered = new Set();
  const markdownFiles = [
    ...walk(path.join(ROOT, "wiki"), (file) => file.endsWith(".md")),
    ...walk(path.join(ROOT, "intake/proposals"), (file) => file.endsWith(".md")),
    ...walk(path.join(ROOT, "examples"), (file) => file.endsWith(".md")),
  ];

  for (const file of markdownFiles) {
    const parsed = frontmatter(read(file));
    if (parsed.data.type === "acceptance-criterion" && parsed.data.status === "active" && parsed.data.id) {
      criteria.add(parsed.data.id);
    }
    if (parsed.data.type === "proposal" && parsed.data.status === "implemented") {
      for (const match of parsed.body.matchAll(/\bac\.[a-z0-9.-]+\b/g)) criteria.add(match[0]);
    }
  }

  const manifestPath = path.join(ROOT, "checks/manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(read(manifestPath));
      for (const check of manifest.checks || []) {
        for (const id of check.covers || []) {
          if (criteria.has(id)) covered.add(id);
        }
      }
    } catch {
      // checks-lint reports invalid JSON. Keep metrics best-effort here.
    }
  }

  return {
    criteria: criteria.size,
    covered: covered.size,
    ratio: criteria.size ? covered.size / criteria.size : 1,
  };
}

function wikiIdCount() {
  const ids = new Set();
  for (const file of walk(path.join(ROOT, "wiki"), (candidate) => candidate.endsWith(".md"))) {
    const text = read(file);
    const parsed = frontmatter(text);
    if (parsed.data.id) ids.add(parsed.data.id);
    for (const match of text.matchAll(WIKI_ID_RE)) ids.add(match[0]);
  }
  return ids.size;
}

function anchorCount() {
  let count = 0;
  const files = walk(ROOT, (file) => {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    return (
      CODE_EXTENSIONS.has(path.extname(file)) &&
      !rel.startsWith("wiki/") &&
      !rel.startsWith("intake/") &&
      !rel.startsWith("docs/") &&
      !rel.startsWith("examples/") &&
      !rel.startsWith("templates/")
    );
  });
  for (const file of files) {
    count += [...read(file).matchAll(ANCHOR_RE)].length;
  }
  return count;
}

function metrics() {
  const coverage = manifestCoverage();
  return {
    at: new Date().toISOString(),
    wiki_ids: wikiIdCount(),
    acceptance_criteria: coverage.criteria,
    covered_acceptance_criteria: coverage.covered,
    check_coverage_ratio: Number(coverage.ratio.toFixed(4)),
    wiki_anchors: anchorCount(),
  };
}

const gates = [
  run("checks-lint", ["scripts/checks-lint.mjs"]),
  run("wiki-anchor-lint", ["scripts/wiki-anchor-lint.mjs"]),
  run("intent-lint", ["scripts/intent-lint.mjs"]),
];

const errors = [];
for (const gate of gates) {
  if (gate.status !== 0) {
    errors.push(`${gate.label} failed`);
    if (gate.stdout.trim()) console.log(gate.stdout.trim());
    if (gate.stderr.trim()) console.error(gate.stderr.trim());
  }
}

const current = metrics();
let baseline = null;
if (fs.existsSync(BASELINE_PATH)) {
  try {
    baseline = JSON.parse(read(BASELINE_PATH));
  } catch (error) {
    errors.push(`ratchet baseline is invalid JSON: ${error.message}`);
  }
}

if (baseline) {
  if (current.check_coverage_ratio < baseline.check_coverage_ratio) {
    errors.push(
      `check coverage ratio decreased from ${baseline.check_coverage_ratio} to ${current.check_coverage_ratio}`,
    );
  }
  if (current.covered_acceptance_criteria < baseline.covered_acceptance_criteria) {
    errors.push(
      `covered acceptance criteria decreased from ${baseline.covered_acceptance_criteria} to ${current.covered_acceptance_criteria}`,
    );
  }
}

if (UPDATE_BASELINE && errors.length === 0) {
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
}

if (errors.length) {
  console.error(`ratchet-lint failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const baselineSuffix = UPDATE_BASELINE ? ` Baseline written to ${path.relative(ROOT, BASELINE_PATH)}.` : "";
console.log(
  `ratchet-lint passed: ${current.covered_acceptance_criteria}/${current.acceptance_criteria} active criterion/criteria covered, ${current.wiki_anchors} wiki anchor(s).${baselineSuffix}`,
);
