#!/usr/bin/env node
// self-test: prove the content lints are not vacuous on a near-empty wiki.
//
// Runs wiki-anchor-lint, wiki-link-lint and intent-lint with cwd set to a small
// committed fixture product wiki and asserts the integer count each lint reports
// is at or above a floor (>=1). The assertion parses the count the lint prints,
// never the fixture's contents, so it is generic and the fixture can grow freely.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPTS_DIR, "..");
const FIXTURE = path.join(ROOT, "tests/fixtures/sample-product");

// The fixture wiki ships only with the product-wiki source repo (it is
// source-only and is not synced into installed repos). In an installed repo the
// fixture is absent and there is nothing to keep honest, so self-test is a clean
// no-op there. It does its real, non-vacuous work only in the source repo.
if (!fs.existsSync(FIXTURE)) {
  console.log(
    `self-test skipped: no fixture wiki at ${path.relative(ROOT, FIXTURE) || "tests/fixtures/sample-product"} ` +
      `(present only in the product-wiki source repo).`,
  );
  process.exit(0);
}
const probes = [
  { label: "wiki-anchor-lint", script: "wiki-anchor-lint.mjs", countRe: /passed:\s*(\d+)\s*PW anchor/i, min: 1, noun: "PW anchor(s)" },
  { label: "wiki-link-lint", script: "wiki-link-lint.mjs", countRe: /passed:\s*(\d+)\s*typed link/i, min: 1, noun: "typed link(s)" },
  { label: "intent-lint", script: "intent-lint.mjs", countRe: /passed:\s*(\d+)\s*active criterion/i, min: 1, noun: "active criterion/criteria" },
];

const errors = [];
for (const probe of probes) {
  const result = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, probe.script)], { cwd: FIXTURE, encoding: "utf8" });
  const out = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0) {
    errors.push(`${probe.label} failed (exit ${result.status}) on the fixture:\n${out.trim()}`);
    continue;
  }
  const match = out.match(probe.countRe);
  if (!match) {
    errors.push(`${probe.label}: could not parse a ${probe.noun} count from output:\n${out.trim()}`);
    continue;
  }
  const count = Number(match[1]);
  if (count < probe.min) {
    errors.push(`${probe.label}: fixture exercised only ${count} ${probe.noun}, expected at least ${probe.min}. The lint may have gone inert.`);
    continue;
  }
  console.log(`self-test ${probe.label}: ${count} ${probe.noun} on fixture (>= ${probe.min}).`);
}

// The fixture ships a worked "wiki + checks + src" sample, so its own
// checks/manifest.json must pass the harness's central gate when the fixture is
// treated as a standalone repo. Run checks-lint --run with cwd at the fixture so
// the manifest command (node --test ...) actually executes against the fixture's
// src/ and tests/. This keeps the worked sample coherent and stops the
// "check references a test file that doesn't exist" incoherence from silently
// returning.
{
  const result = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, "checks-lint.mjs"), "--run"], {
    cwd: FIXTURE,
    encoding: "utf8",
  });
  const out = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0) {
    errors.push(`checks-lint --run failed (exit ${result.status}) on the fixture:\n${out.trim()}`);
  } else if (!/checks-lint passed:/.test(out)) {
    errors.push(`checks-lint --run: could not confirm a pass from output:\n${out.trim()}`);
  } else {
    console.log(`self-test checks-lint: fixture manifest passes the gate and its checks run green.`);
  }
}

if (errors.length) {
  console.error(`self-test failed with ${errors.length} issue(s):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log("self-test passed: content lints exercise the fixture wiki.");
