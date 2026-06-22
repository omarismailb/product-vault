#!/usr/bin/env node

// Product Wiki installer CLI.
//
// One-command install/upgrade, no global install needed:
//
//   npx product-wiki@latest init      install into the current repo
//   npx product-wiki@latest sync      re-sync managed files (upgrade)
//   npx product-wiki@latest init --dry-run   preview without writing
//
// It wraps scripts/sync-managed.mjs (the ownership-aware copy) and then runs the
// harness checks, so the documented install is one line instead of a temp-dir dance.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = process.cwd();
const argv = process.argv.slice(2);
const cmd = argv[0] || "help";
const dryRun = argv.includes("--dry-run");

function run(script, args = []) {
  return spawnSync(process.execPath, [path.join(PKG_ROOT, "scripts", script), ...args], {
    cwd: TARGET,
    stdio: "inherit",
  });
}

if (cmd === "help" || argv.includes("--help") || argv.includes("-h")) {
  console.log(`Product Wiki: install or upgrade the harness in the current repo.

Usage (no global install needed):
  npx product-wiki@latest init         install into the current directory
  npx product-wiki@latest sync         re-sync managed files (upgrade)
  npx product-wiki@latest init --dry-run   preview the plan, write nothing
  npx product-wiki@2.3.1 init          pin the published npm version

Run from the root of the repo you want to add Product Wiki to.
For a tamper-evident source install, use a 40-character GitHub commit SHA:
  npx github:omarismailb/product-wiki#<40-char-commit-sha> init`);
  process.exit(0);
}

if (cmd !== "init" && cmd !== "sync") {
  console.error(`Unknown command: ${cmd}\nRun with --help for usage.`);
  process.exit(1);
}

if (PKG_ROOT === TARGET) {
  console.error("Refusing to install Product Wiki into its own source repo. Run this from your product repo.");
  process.exit(1);
}

console.log(`Product Wiki: ${dryRun ? "previewing install for" : (cmd === "sync" ? "upgrading" : "installing into")} ${TARGET}`);

const sync = run("sync-managed.mjs", ["--target", TARGET, ...(dryRun ? [] : ["--write"])]);
if (sync.status !== 0) process.exit(sync.status || 1);

if (dryRun) {
  console.log("\nDry run only. Re-run without --dry-run to apply.");
  process.exit(0);
}

console.log("\nVerifying install...");
const check = run("product-wiki-check.mjs");
const doctor = run("doctor.mjs");

if (check.status === 0 && doctor.status === 0) {
  console.log("\nProduct Wiki installed and verified. Next: open Claude Code or Codex in this repo");
  console.log("and describe the feature you want to build, and it will route through a proposal first.");
  console.log("\nIf you installed inside an existing agent session, restart it so the turn-end loop");
  console.log("(the Stop hook) is registered, because agents read hook config at session start.");
  process.exit(0);
}

console.log("\nProduct Wiki installed, but the checks above reported issues. Review them before continuing.");
process.exit(1);
