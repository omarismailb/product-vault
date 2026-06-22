#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const args = process.argv.slice(2);

const HELP = `Usage: hook-loop.mjs [options]

Runs the Product Wiki Stop-hook loop: selects routines based on git-changed files and runs them, writing a report under .product-wiki/hook-loops/.

Options:
  --check            Validate routines/manifest.json (no loop, no report).
  --event <name>     Label the report with the triggering event (default: manual).
  -h, --help         Show this help and exit (no side effects).
`;
if (args.includes("-h") || args.includes("--help")) {
  process.stdout.write(HELP);
  process.exit(0);
}
const KNOWN_FLAGS = new Set(["--check", "--event", "-h", "--help"]);
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--event") {
    i += 1;
    continue;
  }
  if (a.startsWith("-")) {
    if (!KNOWN_FLAGS.has(a)) {
      process.stderr.write(`hook-loop: unknown option "${a}".\n\n${HELP}`);
      process.exit(2);
    }
  } else {
    process.stderr.write(`hook-loop: unexpected argument "${a}".\n\n${HELP}`);
    process.exit(2);
  }
}

const CHECK = args.includes("--check");
const EVENT = args.includes("--event") ? args[args.indexOf("--event") + 1] : "manual";
const reportDir = path.join(ROOT, ".product-wiki/hook-loops");

// Internal, trusted invocations only (git + this repo's own scripts), run with
// argv arrays and shell: false so filenames and routine ids can never inject a
// shell command. Manifest-defined commands are never run here; they go through
// routine-runner, which uses the allow-listed safe executor.
function run(bin, args, options = {}) {
  return spawnSync(bin, args, {
    cwd: ROOT,
    shell: false,
    encoding: "utf8",
    ...options,
  });
}

// Returns a discriminated result so the caller can tell a clean tree (ok, empty
// files) from a git failure (not a repo / git missing => exit 128 or spawn
// error). Uses NUL-delimited porcelain (-z), which never C-quotes paths and uses
// NUL as the field/record separator, so spaces, unicode, and embedded " -> " in
// filenames are preserved. For R/C records the next NUL field is the old path,
// which is consumed and discarded.
function gitChangedFiles() {
  const result = run("git", ["status", "--porcelain", "-z"]);
  if (result.error || typeof result.status !== "number" || result.status !== 0) {
    const detail = (result.stderr || result.error?.message || "").trim();
    return {
      ok: false,
      status: typeof result.status === "number" ? result.status : null,
      error: detail || `git status failed (exit ${result.status})`,
    };
  }
  const records = result.stdout.split("\0");
  const files = [];
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (!record) continue;
    const status = record.slice(0, 2);
    const target = record.slice(3);
    if (status[0] === "R" || status[0] === "C") i += 1; // skip the source-path field
    if (target && !target.startsWith(".product-wiki/")) files.push(target);
  }
  return { ok: true, status: 0, files };
}

function unique(values) {
  return [...new Set(values)];
}

function shouldIgnoreForProduct(file) {
  return (
    file.startsWith("docs/") ||
    file.startsWith(".github/") ||
    file === "README.md" ||
    file === "CHANGELOG.md" ||
    file === "CONTRIBUTING.md" ||
    file === "CODE_OF_CONDUCT.md" ||
    file === "SUPPORT.md" ||
    file === "SECURITY.md" ||
    file === "LICENSE"
  );
}

function routinesFor(files) {
  const routines = [];
  const wikiChanged = files.some((file) => file.startsWith("wiki/"));
  const proposalChanged = files.some((file) => file.startsWith("intake/proposals/") || file.startsWith("examples/"));
  const checksChanged = files.some((file) => file.startsWith("checks/") || file.startsWith("tests/"));
  const routineChanged = files.some((file) => file.startsWith("routines/") || file === "scripts/routine-runner.mjs");
  const appOrProductChanged = files.some((file) => !shouldIgnoreForProduct(file));

  if (wikiChanged || routineChanged) routines.push("routine.wiki-health");
  if (wikiChanged || proposalChanged) routines.push("routine.overview-freshness");
  if (wikiChanged || proposalChanged || checksChanged || appOrProductChanged) routines.push("routine.traceability-drift");
  if (appOrProductChanged) routines.push("routine.source-map");
  if (wikiChanged || proposalChanged || checksChanged || appOrProductChanged) routines.push("routine.ratchet");
  // Run the executable checks whenever product code changes, not only when
  // checks/ or tests/ change, otherwise a src/ regression ends a turn green.
  if (checksChanged || appOrProductChanged) routines.push("routine.verification");

  return unique(routines);
}

function writeReport(report) {
  fs.mkdirSync(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(reportDir, `${stamp}.json`);
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  return path.relative(ROOT, file);
}

if (CHECK) {
  const result = run(process.execPath, ["scripts/routine-runner.mjs", "--check"]);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status || 0);
}

if (!fs.existsSync(path.join(ROOT, "routines/manifest.json"))) {
  process.exit(0);
}

const changed = gitChangedFiles();
if (!changed.ok) {
  const reportPath = writeReport({
    at: new Date().toISOString(),
    event: EVENT,
    status: "error",
    reason: "git status failed",
    git_status: changed.status,
    error: changed.error,
    changed_files: [],
    routines: [],
  });
  process.stderr.write(
    `Product Wiki loop error: could not read git status (${changed.error}). Run inside a git repository. Report: ${reportPath}.\n`,
  );
  process.exit(1);
}
const changedFiles = changed.files;
if (changedFiles.length === 0) {
  const reportPath = writeReport({
    at: new Date().toISOString(),
    event: EVENT,
    status: "skipped",
    reason: "no changed files",
    changed_files: [],
    routines: [],
  });
  console.log(`Product Wiki loop skipped: no changed files (${reportPath}).`);
  process.exit(0);
}

const routines = routinesFor(changedFiles);
const report = {
  at: new Date().toISOString(),
  event: EVENT,
  changed_files: changedFiles,
  routines: [],
  follow_up: [],
};

let failed = false;
for (const routineId of routines) {
  const result = run(process.execPath, ["scripts/routine-runner.mjs", "--routine", routineId]);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  report.routines.push({
    id: routineId,
    status: result.status,
  });
  if (result.status !== 0) failed = true;
}

const productChanged = changedFiles.some((file) => !shouldIgnoreForProduct(file));
if (productChanged) {
  report.follow_up.push("If these changes alter product intent or implementation behaviour, run reconcile-wiki before finishing.");
}

const reportPath = writeReport(report);
console.log(`Product Wiki hook loop report: ${reportPath}`);

if (report.follow_up.length) {
  for (const item of report.follow_up) console.log(`Product Wiki follow-up: ${item}`);
}

if (failed) process.exit(1);
