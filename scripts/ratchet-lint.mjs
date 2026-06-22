#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { walk, readText, parseFrontmatter, WIKI_ID_RE, enumerateAnchors } from "./lib/wiki.mjs";

const ROOT = process.cwd();
const UPDATE_BASELINE = process.argv.includes("--update-baseline");
const CI = process.argv.includes("--ci");
const ALLOW_DECREASE = process.argv.includes("--allow-baseline-decrease");
// Tracked, committed path. The old .product-wiki/ location was gitignored, so
// the baseline never reached CI or other machines and the ratchet was inert.
const BASELINE_PATH = path.join(ROOT, "checks/ratchet-baseline.json");
const LEGACY_BASELINE_PATH = path.join(ROOT, ".product-wiki/ratchet-baseline.json");
const BASELINE_REL = "checks/ratchet-baseline.json";
const RATCHETED_METRICS = ["check_coverage_ratio", "covered_acceptance_criteria"];

const isMd = (file) => file.endsWith(".md");

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
    ...walk(path.join(ROOT, "wiki"), isMd),
    ...walk(path.join(ROOT, "intake/proposals"), isMd),
    ...walk(path.join(ROOT, "examples"), isMd),
  ];

  // Criteria are the ACTIVE acceptance-criterion units only. We deliberately do
  // not scan proposal prose for `ac.*` tokens: that counted ids a proposal merely
  // mentions (e.g. "the six ac.x.* criteria", or a removal proposal naming the
  // criteria it RETIRES), which inflated the denominator and dropped coverage on
  // a clean change. A retired criterion (status != active) correctly drops out.
  for (const file of markdownFiles) {
    const parsed = parseFrontmatter(readText(file));
    if (parsed.data.type === "acceptance-criterion" && parsed.data.status === "active" && parsed.data.id) {
      criteria.add(parsed.data.id);
    }
  }

  const manifestPath = path.join(ROOT, "checks/manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readText(manifestPath));
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
  for (const file of walk(path.join(ROOT, "wiki"), isMd)) {
    const text = readText(file);
    const parsed = parseFrontmatter(text);
    if (parsed.data.id) ids.add(parsed.data.id);
    for (const match of text.matchAll(WIKI_ID_RE)) ids.add(match[0]);
  }
  return ids.size;
}

function anchorCount() {
  return enumerateAnchors(ROOT).length;
}

// The baseline as committed at HEAD. Used to reject a working-tree edit that
// lowers the ratchet floor (defense-in-depth; git-dependent, see residual note).
function committedBaseline() {
  const head = spawnSync("git", ["show", `HEAD:${BASELINE_REL}`], { cwd: ROOT, encoding: "utf8" });
  if (head.status !== 0) return { available: false, committed: null };
  try {
    return { available: true, committed: JSON.parse(head.stdout) };
  } catch {
    return { available: false, committed: null };
  }
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
const baselineFile = fs.existsSync(BASELINE_PATH)
  ? BASELINE_PATH
  : fs.existsSync(LEGACY_BASELINE_PATH)
    ? LEGACY_BASELINE_PATH
    : null;
if (baselineFile) {
  try {
    baseline = JSON.parse(readText(baselineFile));
  } catch (error) {
    errors.push(`ratchet baseline is invalid JSON: ${error.message}`);
  }
} else if (!UPDATE_BASELINE) {
  // With no committed baseline the ratchet has nothing to ratchet against. In
  // CI that is a hard failure; locally it is a note so a fresh install is not
  // blocked before its first baseline is written.
  const message =
    "no committed ratchet baseline at checks/ratchet-baseline.json. " +
    "Run `node scripts/ratchet-lint.mjs --update-baseline` and commit the file so coverage cannot slip backwards.";
  if (CI) errors.push(message);
  else console.log(`ratchet-lint note: ${message}`);
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

// Baseline tamper guard: reject an uncommitted working-tree change that lowers a
// ratcheted metric below its committed (HEAD) value — that relaxes the floor in
// the same change that typically drops coverage. A legitimate decrease passes
// --allow-baseline-decrease and is expected to be committed on its own.
if (baseline && baselineFile === BASELINE_PATH && !UPDATE_BASELINE && !ALLOW_DECREASE) {
  const { available, committed } = committedBaseline();
  if (available && committed) {
    const lowered = RATCHETED_METRICS.filter((m) => Number(baseline[m]) < Number(committed[m]));
    if (lowered.length) {
      errors.push(
        `${BASELINE_REL} lowers ${lowered.join(", ")} below the committed baseline (HEAD) in an uncommitted change. ` +
          `Lowering the ratchet floor must be a reviewed, separate decision. ` +
          `If this decrease is intentional, re-run with --allow-baseline-decrease (and commit the baseline change on its own).`,
      );
    }
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
