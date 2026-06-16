#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const EVENT = args.includes("--event") ? args[args.indexOf("--event") + 1] : "manual";
const reportDir = path.join(ROOT, ".product-wiki/hook-loops");

function command(cmd, options = {}) {
  return spawnSync(cmd, {
    cwd: ROOT,
    shell: true,
    encoding: "utf8",
    ...options,
  });
}

function gitChangedFiles() {
  const result = command("git status --porcelain");
  if (result.status !== 0) return [];

  return result.stdout
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const raw = line.slice(3);
      const renamed = raw.split(" -> ");
      return renamed[renamed.length - 1];
    })
    .filter((file) => file && !file.startsWith(".product-wiki/"));
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
  if (wikiChanged || proposalChanged || checksChanged || appOrProductChanged) routines.push("routine.traceability-drift");
  if (checksChanged) routines.push("routine.verification");

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
  const result = command("node scripts/routine-runner.mjs --check");
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status || 0);
}

if (!fs.existsSync(path.join(ROOT, "routines/manifest.json"))) {
  process.exit(0);
}

const changedFiles = gitChangedFiles();
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
  const result = command(`node scripts/routine-runner.mjs --routine ${routineId}`);
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
