#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { runCommand } from "./lib/safe-exec.mjs";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "routines/manifest.json");
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const LIST = args.includes("--list");
const ALL = args.includes("--all");
const routineIndex = args.indexOf("--routine");
const routineId = routineIndex >= 0 ? args[routineIndex + 1] : null;
const errors = [];

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) {
    errors.push("routines/manifest.json is missing");
    return { routines: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch (error) {
    errors.push(`routines/manifest.json is invalid JSON: ${error.message}`);
    return { routines: [] };
  }
}

function validate(manifest) {
  if (!Array.isArray(manifest.routines)) {
    errors.push("routines/manifest.json must contain a routines array");
    return [];
  }

  const seen = new Set();
  for (const routine of manifest.routines) {
    if (!routine.id || !/^routine\.[a-z0-9.-]+$/.test(routine.id)) {
      errors.push("routine id must look like routine.some-id");
    } else if (seen.has(routine.id)) {
      errors.push(`${routine.id}: duplicate routine id`);
    } else {
      seen.add(routine.id);
    }

    if (!routine.name) errors.push(`${routine.id || "routine"}: name is required`);
    if (!["deterministic", "agent-review"].includes(routine.mode)) {
      errors.push(`${routine.id || "routine"}: mode must be deterministic or agent-review`);
    }
    if (!routine.playbook || !fs.existsSync(path.join(ROOT, routine.playbook))) {
      errors.push(`${routine.id || "routine"}: playbook does not exist`);
    }
    if (!Array.isArray(routine.commands)) {
      errors.push(`${routine.id || "routine"}: commands must be an array`);
      continue;
    }
    if (routine.mode === "deterministic" && routine.commands.length === 0) {
      errors.push(`${routine.id}: deterministic routines need at least one command`);
    }
  }

  return manifest.routines;
}

function usage() {
  console.log(`Usage:
  node scripts/routine-runner.mjs --check
  node scripts/routine-runner.mjs --list
  node scripts/routine-runner.mjs --all
  node scripts/routine-runner.mjs --routine routine.traceability-drift

Routine reports are written to .product-wiki/routine-runs/ and should not be committed.`);
}

function writeReport(report) {
  const dir = path.join(ROOT, ".product-wiki/routine-runs");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `${stamp}.json`);
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  return path.relative(ROOT, file);
}

const manifest = loadManifest();
const routines = validate(manifest);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (CHECK || (!LIST && !ALL && !routineId)) {
  console.log(`routine-runner check passed: ${routines.length} routine(s).`);
  process.exit(0);
}

if (LIST) {
  for (const routine of routines) {
    console.log(`${routine.id} [${routine.mode}] ${routine.cadence}`);
  }
  process.exit(0);
}

const selected = ALL ? routines : routines.filter((routine) => routine.id === routineId);
if (selected.length === 0) {
  usage();
  console.error(`Unknown routine: ${routineId || "(none)"}`);
  process.exit(1);
}

const report = {
  at: new Date().toISOString(),
  routines: [],
};
let failed = false;

for (const routine of selected) {
  console.log(`\n== ${routine.id}: ${routine.name} ==`);
  console.log(routine.purpose);

  const result = {
    id: routine.id,
    mode: routine.mode,
    commands: [],
    agent_follow_up: routine.agent_follow_up,
  };

  if (routine.mode === "agent-review") {
    console.log(`agent review needed: ${routine.agent_follow_up}`);
    report.routines.push(result);
    continue;
  }

  for (const command of routine.commands) {
    console.log(`running: ${command}`);
    const run = runCommand(command, {
      cwd: ROOT,
      encoding: "utf8",
    });
    if (run.stdout) process.stdout.write(run.stdout);
    if (run.stderr) process.stderr.write(run.stderr);

    result.commands.push({
      command,
      status: run.status,
    });

    if (run.status !== 0) failed = true;
  }

  report.routines.push(result);
}

const reportPath = writeReport(report);
console.log(`\nroutine report: ${reportPath}`);

if (failed) {
  console.error("One or more routines failed. Use reconcile-wiki to turn failures into fixes or proposals.");
  process.exit(1);
}

console.log("routine-runner passed.");
