#!/usr/bin/env node
// managed-drift-lint: the installed Product Wiki harness must not be edited in
// place.
//
// At install/upgrade time, sync-managed records a sha256 of every managed_core
// file in the installed product-wiki.json under "managed_digests". This lint
// recomputes those hashes and fails if any managed file has changed. The point
// is to surface the failure mode the evolution test found: an agent silently
// patching a harness lint (e.g. checks-lint.mjs) to make a red gate go green.
// The harness enforcement is meant to come from upstream, not be rewritten in
// the product repo.
//
// It is intentionally a no-op in two cases so it never breaks legitimate repos:
// - the source repo (product-wiki.json carries the full "ownership" manifest and
//   no install digests);
// - an install that predates digests (older product-wiki.json with no
//   "managed_digests").
//
// Limitation: a determined agent could also edit this file or the recorded
// digests. Both edits land in committed, reviewable files (the digest map lives
// in product-wiki.json), so the tampering is visible in a diff. The goal is to
// surface drift, not to be cryptographically tamper-proof.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const file = path.join(ROOT, "product-wiki.json");

if (!fs.existsSync(file)) {
  console.log("managed-drift-lint skipped: no product-wiki.json.");
  process.exit(0);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(file, "utf8"));
} catch {
  console.log("managed-drift-lint skipped: product-wiki.json is not valid JSON.");
  process.exit(0);
}

if (manifest.ownership || !manifest.managed_digests) {
  console.log("managed-drift-lint skipped: no managed digests recorded (source repo or pre-digest install).");
  process.exit(0);
}

const digests = manifest.managed_digests;
const errors = [];
let verified = 0;

for (const [rel, expected] of Object.entries(digests)) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    errors.push(`${rel}: managed harness file is missing (it was present at install).`);
    continue;
  }
  const actual = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  if (actual !== expected) {
    errors.push(`${rel}: managed harness file differs from the installed ${manifest.version} version.`);
  } else {
    verified += 1;
  }
}

if (errors.length) {
  console.error("managed-drift-lint failed: the installed Product Wiki harness has been modified.");
  for (const e of errors) console.error(`- ${e}`);
  console.error(
    "Harness enforcement files are managed by Product Wiki and should not be edited in your repo. " +
      "If you found a harness bug, report or upgrade it upstream (re-run the installer's sync), do not patch the installed copy. " +
      "After an intentional upgrade, sync re-records these digests.",
  );
  process.exit(1);
}

console.log(`managed-drift-lint passed: ${verified} managed harness file(s) match the installed ${manifest.version}.`);
