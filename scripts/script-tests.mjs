#!/usr/bin/env node
// script-tests: run the harness's own script unit tests (tests/unit/*.test.mjs).
//
// Source-repo-only: tests/unit is source_only and is not synced into installed
// repos, so this is a clean no-op there (like self-test). It does its real work
// only in the product-wiki source repo and in CI, where it guards the lint
// behaviour these tests pin (retirement coverage, managed-drift, retired-link,
// duplicate-proposal, install record).

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(ROOT, "tests/unit");

if (!fs.existsSync(dir)) {
  console.log("script-tests skipped: no tests/unit (present only in the product-wiki source repo).");
  process.exit(0);
}

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".test.mjs"))
  .sort()
  .map((f) => path.join("tests/unit", f));

if (files.length === 0) {
  console.log("script-tests skipped: no *.test.mjs under tests/unit.");
  process.exit(0);
}

const result = spawnSync(process.execPath, ["--test", ...files], { cwd: ROOT, stdio: "inherit" });
process.exit(result.status || 0);
