#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const write = args.includes("--write");
const help = args.includes("--help");
const offline = args.includes("--offline") || process.env.PRODUCT_WIKI_REPAIR_OFFLINE === "1";
const repoArg = valueAfter("--repo");
const refArg = valueAfter("--ref") || process.env.PRODUCT_WIKI_REPAIR_REF;
const DEFAULT_REPO = "https://github.com/omarismailb/product-wiki.git";

const contractFiles = [
  "templates/proposal-template.md",
  "templates/wiki-overview-template.md",
  "templates/wiki-unit-template.md",
  "templates/compiler-plan-template.md",
  "templates/import-inventory-template.md",
  "templates/import-proposal-template.md",
  "templates/check-manifest-entry.json",
  "templates/checks-manifest-starter.json",
  ".agents/skills/propose-change/SKILL.md",
  ".agents/skills/apply-wiki-change/SKILL.md",
  ".agents/skills/compile-change/SKILL.md",
  ".agents/skills/import-codebase/SKILL.md",
  ".agents/skills/generate-checks/SKILL.md",
  ".agents/skills/reconcile-wiki/SKILL.md",
  ".agents/skills/review-architecture/SKILL.md",
  "scripts/wiki-anchor-lint.mjs",
  "scripts/wiki-overview-lint.mjs",
  "scripts/ratchet-lint.mjs",
];

if (help) {
  console.log(`Usage:
  node scripts/repair-contracts.mjs
  node scripts/repair-contracts.mjs --write

Options:
  --repo <url>    Product Wiki upstream repo. Defaults to ${DEFAULT_REPO}
  --ref <ref>     Optional upstream ref, tag, branch, or commit
  --offline       Never clone upstream. Repair only from local sources (.product-wiki/incoming and git HEAD); fail if insufficient.

Dry run is the default. Add --write to restore missing managed contracts.
The script does not edit application code, tests, wiki product units, proposals, or check manifests.

NETWORK NOTICE:
  When local sources (.product-wiki/incoming and git HEAD) cannot restore the
  managed contracts, the script clones the upstream repo over the network. That
  clone path is NOT hermetic. Pass --offline (or set PRODUCT_WIKI_REPAIR_OFFLINE=1)
  to forbid the clone: local-only repair still runs, and the script exits non-zero
  instead of reaching the network when local sources are insufficient.`);
  process.exit(0);
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    cwd: options.cwd || ROOT,
    encoding: "utf8",
    stdio: options.stdio || "pipe",
  });
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch {
    return null;
  }
}

function lintStatus() {
  const template = run(process.execPath, ["scripts/template-lint.mjs"]);
  const skill = run(process.execPath, ["scripts/skill-lint.mjs"]);
  return { template, skill };
}

function printResult(label, result) {
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  if (result.status !== 0) console.error(`${label} failed with exit ${result.status}.`);
}

function missingContracts() {
  return contractFiles.filter((rel) => !exists(rel));
}

function copyFromIncoming(rel, repaired) {
  const incoming = path.join(ROOT, ".product-wiki/incoming", rel);
  const target = path.join(ROOT, rel);
  if (!fs.existsSync(incoming) || fs.existsSync(target)) return false;
  if (!write) return true;

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(incoming, target);
  repaired.push(`${rel} <- .product-wiki/incoming/${rel}`);
  return true;
}

function restoreFromHead(rel, repaired) {
  if (exists(rel)) return false;
  const inside = run("git", ["rev-parse", "--is-inside-work-tree"]);
  if (inside.status !== 0) return false;

  const cat = run("git", ["cat-file", "-e", `HEAD:${rel}`]);
  if (cat.status !== 0) return false;
  if (!write) return true;

  const show = run("git", ["show", `HEAD:${rel}`]);
  if (show.status !== 0) return false;
  const target = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, show.stdout);
  repaired.push(`${rel} <- git HEAD`);
  return true;
}

function cloneAndSync(manifest, repaired) {
  const repo = repoArg || manifest?.repository || DEFAULT_REPO;
  if (offline) {
    console.error(
      "repair-contracts --offline: local sources are insufficient and the network clone is disabled. " +
        "Restore the missing contracts from a Product Wiki package, or re-run without --offline to clone " +
        `${repo} over the network.`,
    );
    return false;
  }
  console.log(
    `repair-contracts: NETWORK STEP — cloning ${repo}${refArg ? ` at ${refArg}` : ""} over the network ` +
      `because local sources (incoming + git HEAD) could not restore the managed contracts. Pass --offline to forbid this.`,
  );
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "product-wiki-repair-"));
  const cloneArgs = ["clone", "--depth=1"];
  if (refArg) cloneArgs.push("--branch", refArg);
  cloneArgs.push(repo, temp);

  if (!write) {
    console.log(`Would clone ${repo}${refArg ? ` at ${refArg}` : ""} and run sync-managed into ${ROOT}.`);
    return true;
  }

  const clone = run("git", cloneArgs, { cwd: os.tmpdir() });
  if (clone.status !== 0) {
    printResult("git clone", clone);
    return false;
  }

  const sync = run(process.execPath, [path.join(temp, "scripts/sync-managed.mjs"), "--target", ROOT, "--write"]);
  if (sync.status !== 0) {
    printResult("sync-managed", sync);
    return false;
  }

  repaired.push(`managed contracts <- ${repo}${refArg ? ` (${refArg})` : ""}`);
  return true;
}

const manifest = readJson("product-wiki.json");
const isSourceRepo = Boolean(manifest?.ownership);
const missingBefore = missingContracts();
const lintBefore = lintStatus();
const needsRepair = missingBefore.length > 0 || lintBefore.template.status !== 0 || lintBefore.skill.status !== 0;

if (!needsRepair) {
  console.log("Product Wiki contracts are healthy. No repair needed.");
  process.exit(0);
}

console.log("Product Wiki contract repair needed.");
if (missingBefore.length) {
  console.log("Missing managed contract file(s):");
  for (const rel of missingBefore) console.log(`- ${rel}`);
}

if (!write) {
  console.log("\nDry run only. Re-run with --write to repair managed contracts.");
  if (!isSourceRepo) {
    cloneAndSync(manifest, []);
  }
  process.exit(1);
}

const repaired = [];
for (const rel of missingBefore) copyFromIncoming(rel, repaired);

const missingAfterIncoming = missingContracts();
if (isSourceRepo) {
  for (const rel of missingAfterIncoming) restoreFromHead(rel, repaired);
} else if (missingAfterIncoming.length || lintBefore.template.status !== 0 || lintBefore.skill.status !== 0) {
  cloneAndSync(manifest, repaired);
}

const lintAfter = lintStatus();
if (lintAfter.template.status !== 0 || lintAfter.skill.status !== 0) {
  console.error("Product Wiki contract repair could not restore a valid contract.");
  printResult("template-lint", lintAfter.template);
  printResult("skill-lint", lintAfter.skill);
  process.exit(1);
}

if (repaired.length) {
  console.log("Repaired managed contract file(s):");
  for (const item of repaired) console.log(`- ${item}`);
} else {
  console.log("No files were changed, but contracts now validate.");
}

console.log("Product Wiki contract repair passed.");
