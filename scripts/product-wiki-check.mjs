#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const steps = [
  ["managed-drift-lint", ["scripts/managed-drift-lint.mjs"]],
  ["template-lint", ["scripts/template-lint.mjs"]],
  ["skill-lint", ["scripts/skill-lint.mjs"]],
  ["wiki-lint", ["scripts/wiki-lint.mjs"]],
  ["wiki-overview-lint", ["scripts/wiki-overview-lint.mjs"]],
  ["wiki-link-lint", ["scripts/wiki-link-lint.mjs"]],
  ["wiki-connectivity-lint", ["scripts/wiki-connectivity-lint.mjs"]],
  ["wiki-retired-link-lint", ["scripts/wiki-retired-link-lint.mjs"]],
  ["wiki-anchor-lint", ["scripts/wiki-anchor-lint.mjs"]],
  ["design-lint", ["scripts/design-lint.mjs"]],
  ["design-token-lint", ["scripts/design-token-lint.mjs"]],
  ["prose-lint", ["scripts/prose-lint.mjs"]],
  ["proposal-lint", ["scripts/proposal-lint.mjs"]],
  ["proposal-traceability-lint", ["scripts/proposal-traceability-lint.mjs"]],
  ["checks-lint", ["scripts/checks-lint.mjs"]],
  ["lifecycle-lint", ["scripts/lifecycle-lint.mjs"]],
  ["intent-lint", ["scripts/intent-lint.mjs"]],
  ["ratchet-lint", ["scripts/ratchet-lint.mjs"]],
  // Execute the acceptance-criteria checks against the code. This is the
  // harness's headline guarantee; without it the default gate only validates
  // prose structure and never runs a single test.
  ["checks-run", ["scripts/checks-lint.mjs", "--run"]],
  ["eval-golden", ["scripts/eval-golden.mjs"]],
  ["plugin-lint", ["scripts/plugin-lint.mjs"]],
  ["routine-runner", ["scripts/routine-runner.mjs", "--check"]],
  ["hook-loop", ["scripts/hook-loop.mjs", "--check"]],
  ["self-test", ["scripts/self-test.mjs"]],
  ["script-tests", ["scripts/script-tests.mjs"]],
  // doctor runs LAST. It re-runs the structural file/secret/integrity checks and,
  // via PRODUCT_WIKI_IN_CHECK, skips its own inner gate spawn to avoid recursion.
  ["doctor", ["scripts/doctor.mjs"]],
];

for (const [name, args] of steps) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, PRODUCT_WIKI_IN_CHECK: "1" },
  });

  if (result.status !== 0) {
    console.error(`product-wiki-check failed at ${name}`);
    process.exit(result.status || 1);
  }
}

console.log("product-wiki-check passed.");
