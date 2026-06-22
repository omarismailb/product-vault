#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { runCommand, validateCommand } from "./lib/safe-exec.mjs";
import { walk, readText, parseFrontmatter, sectionBody, RETIRED_STATUSES } from "./lib/wiki.mjs";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "checks/manifest.json");
const RUN = process.argv.includes("--run");
const KINDS = new Set(["unit", "integration", "e2e", "lint", "typecheck", "manual", "eval"]);
// Kinds whose command must actually exercise a test file (anti "test theatre").
const EXECUTABLE_KINDS = new Set(["unit", "integration", "e2e"]);

// Flags that run an inline program instead of a test file. An executable check
// that uses any of these proves nothing (e.g. `node -e "process.exit(0)"`).
const INLINE_PROGRAM_FLAGS = new Set(["-e", "--eval", "-p", "--print", "-c"]);

const isMd = (file) => file.endsWith(".md");

// Parse a markdown unit, returning null when it carries no frontmatter so the
// caller can skip it (preserves the original control flow). sectionBody (shared)
// scopes the approval gate to ids declared *under* the Acceptance criteria
// heading, not any ac.* id mentioned anywhere in the proposal.
function frontmatter(text) {
  if (!/^---\n/.test(text.replace(/\r\n/g, "\n"))) return null;
  return parseFrontmatter(text);
}

function acIdsIn(text) {
  return text.match(/\bac\.[a-z0-9.-]+\b/g) || [];
}

function testNamePattern(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--test-name-pattern=")) return argv[i].slice("--test-name-pattern=".length);
    if (argv[i] === "--test-name-pattern" && argv[i + 1]) return argv[i + 1];
  }
  return null;
}

// Best-effort parse of a test-runner summary to detect a run that executed
// ZERO tests. Returns the count when a recognised summary is found, otherwise
// null (unknown runner — never fail). CRLF- and ANSI-tolerant.
function testsRun(output) {
  const text = (output || "").replace(/\[[0-9;]*m/g, "").replace(/\r\n/g, "\n");
  let m;
  if ((m = text.match(/^(?:#|ℹ)?\s*tests\s+(\d+)\s*$/m))) return Number(m[1]); // node --test (TAP or spec)
  if (/\bno tests ran\b/i.test(text)) return 0;                                   // pytest
  if ((m = text.match(/collected\s+(\d+)\s+items?/i))) return Number(m[1]);        // pytest
  if (/\bNo test (files|suites) found\b/i.test(text) || /\bno tests found\b/i.test(text)) return 0; // vitest/jest
  if ((m = text.match(/Tests:[^\n]*?(\d+)\s+total/i))) return Number(m[1]);        // jest
  if ((m = text.match(/(\d+)\s+passing\b/i))) return Number(m[1]);                 // mocha
  return null;
}

function collectIds() {
  const ids = new Set();
  const approvedCriteria = new Set();
  const implementedCriteria = new Set();
  const activeWikiCriteria = new Set();
  // Current wiki status of each acceptance-criterion unit, so a criterion that
  // was retired/superseded after an older proposal implemented it drops out of
  // required coverage (the same rule ratchet-lint applies). Without this, a
  // clean feature removal could not pass the gate.
  const wikiCriterionStatus = new Map();
  const files = [
    ...walk(path.join(ROOT, "wiki"), isMd),
    ...walk(path.join(ROOT, "intake/proposals"), isMd),
    ...walk(path.join(ROOT, "examples"), isMd),
  ];

  for (const file of files) {
    const parsed = frontmatter(readText(file));
    if (!parsed) continue;
    if (parsed.data.id) ids.add(parsed.data.id);
    const acIds = acIdsIn(parsed.body);
    for (const acId of acIds) {
      ids.add(acId);
    }
    if (parsed.data.type === "acceptance-criterion" && parsed.data.id) {
      wikiCriterionStatus.set(parsed.data.id, parsed.data.status || "");
      if (parsed.data.status === "active") activeWikiCriteria.add(parsed.data.id);
    }
    // Approval/implementation only counts criteria declared under the
    // "## Acceptance criteria" heading, never an id merely mentioned elsewhere
    // in the proposal body.
    if (parsed.data.type === "proposal" && (parsed.data.status === "approved" || parsed.data.status === "implemented")) {
      const sectionAcIds = acIdsIn(sectionBody(parsed.body, /acceptance criteria/i));
      const target = parsed.data.status === "approved" ? approvedCriteria : implementedCriteria;
      for (const acId of sectionAcIds) target.add(acId);
    }
  }

  // Lifecycle:
  // - approved proposal: ready for compile-change, checks may not exist yet.
  // - implemented proposal or active criterion outside a pending proposal: checks must exist.
  const criteriaRequiringCoverage = new Set(
    [...implementedCriteria].filter((id) => !RETIRED_STATUSES.has(wikiCriterionStatus.get(id))),
  );
  const pendingCompileCriteria = new Set();

  for (const acId of activeWikiCriteria) {
    if (implementedCriteria.has(acId)) {
      criteriaRequiringCoverage.add(acId);
    } else if (approvedCriteria.has(acId)) {
      pendingCompileCriteria.add(acId);
    } else {
      criteriaRequiringCoverage.add(acId);
    }
  }

  return { ids, criteriaRequiringCoverage, pendingCompileCriteria };
}

const errors = [];

if (!fs.existsSync(MANIFEST)) {
  console.error("checks/manifest.json is missing");
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
} catch (error) {
  console.error(`checks/manifest.json is invalid JSON: ${error.message}`);
  process.exit(1);
}

if (!manifest || !Array.isArray(manifest.checks)) {
  errors.push("checks/manifest.json must contain a checks array");
}

const ids = new Set();
const { ids: resolvableIds, criteriaRequiringCoverage, pendingCompileCriteria } = collectIds();
const coveredIds = new Set();

for (const check of manifest.checks || []) {
  if (!check || typeof check !== "object") {
    errors.push("each check must be an object");
    continue;
  }

  if (!check.id || !/^check\.[a-z0-9.-]+$/.test(check.id)) {
    errors.push("check id must look like check.some-id");
  } else if (ids.has(check.id)) {
    errors.push(`${check.id}: duplicate check id`);
  } else {
    ids.add(check.id);
  }

  if (!Array.isArray(check.covers) || check.covers.length === 0) {
    errors.push(`${check.id || "check"}: covers must be a non-empty array`);
  } else {
    for (const covered of check.covers) {
      if (typeof covered !== "string" || !/^[a-z0-9.-]+$/.test(covered)) {
        errors.push(`${check.id}: invalid covered id "${covered}"`);
      } else if (!resolvableIds.has(covered)) {
        errors.push(
          `${check.id}: covered id "${covered}" does not resolve. ` +
            `It must be a stable id declared in wiki/ (frontmatter id) or referenced in a proposal.`,
        );
      } else {
        coveredIds.add(covered);
      }
    }
  }

  if (!KINDS.has(check.kind)) {
    errors.push(`${check.id || "check"}: invalid kind "${check.kind}"`);
  }
  if (!check.command || typeof check.command !== "string") {
    errors.push(`${check.id || "check"}: command is required`);
  } else {
    const verdict = validateCommand(check.command);
    if (!verdict.ok) {
      errors.push(`${check.id || "check"}: ${verdict.error}`);
    } else if (EXECUTABLE_KINDS.has(check.kind)) {
      const argv = verdict.argv;

      // Anti "test theatre", applied to EVERY executable kind regardless of runner.
      // 1. Reject inline-program flags (node -e/-p, deno eval, python -c, ...).
      const inlineFlag = argv.slice(1).find((a) => INLINE_PROGRAM_FLAGS.has(a));
      if (inlineFlag) {
        errors.push(
          `${check.id}: ${check.kind} check uses inline-program flag "${inlineFlag}" ` +
            `("${check.command}"). An executable check must run a real test file, not inline code. ` +
            `Test theatre: a check that runs nothing proves nothing.`,
        );
      }
      // 2. Require a reference to an existing test file (runner-agnostic).
      const fileArgs = argv
        .slice(1)
        .filter((a) => /(^|\/)tests?\//.test(a) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(a) || /_test\.py$/.test(a) || /(^|\/)test_[^/]*\.py$/.test(a));
      const existing = fileArgs.filter((a) => fs.existsSync(path.join(ROOT, a)));
      if (fileArgs.length === 0) {
        errors.push(
          `${check.id}: ${check.kind} check must reference a test file under test/ or tests/ ` +
            `or a *.test.* / *.spec.* file (none in "${check.command}"). ` +
            `Test theatre: a check that runs nothing proves nothing.`,
        );
      } else if (existing.length === 0) {
        errors.push(`${check.id}: referenced test file(s) do not exist: ${fileArgs.join(", ")}`);
      }
      // 3. node --test only: --test-name-pattern must name every covered criterion.
      const usesNodeTest = path.basename(argv[0]).replace(/\.[^.]+$/, "") === "node" && argv.includes("--test");
      if (usesNodeTest) {
        const pattern = testNamePattern(argv);
        if (pattern && Array.isArray(check.covers)) {
          let re = null;
          try {
            re = new RegExp(pattern);
          } catch {
            errors.push(`${check.id}: invalid --test-name-pattern regex: ${pattern}`);
          }
          if (re) {
            for (const covered of check.covers) {
              if (/^ac\./.test(covered) && !re.test(covered)) {
                errors.push(
                  `${check.id}: --test-name-pattern '${pattern}' does not match covered criterion ` +
                    `'${covered}'. The pattern must name the criterion the check claims to cover.`,
                );
              }
            }
          }
        }
      }
    }
  }
  if (check.evidence_path && !fs.existsSync(path.join(ROOT, check.evidence_path))) {
    errors.push(`${check.id || "check"}: evidence_path does not exist: ${check.evidence_path}`);
  }
}

for (const id of criteriaRequiringCoverage) {
  if (!coveredIds.has(id)) {
    errors.push(`active acceptance criterion is not covered by checks/manifest.json: ${id}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (RUN) {
  for (const check of manifest.checks) {
    console.log(`running ${check.id}: ${check.command}`);
    const capture = EXECUTABLE_KINDS.has(check.kind);
    const result = runCommand(check.command, capture ? { cwd: ROOT, encoding: "utf8" } : { cwd: ROOT, stdio: "inherit" });
    if (capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    if (result.status !== 0) {
      console.error(`${check.id}: command failed with exit ${result.status}`);
      process.exit(result.status || 1);
    }
    if (capture) {
      const ran = testsRun(`${result.stdout || ""}\n${result.stderr || ""}`);
      if (ran === 0) {
        console.error(`${check.id}: ${check.kind} check ran 0 tests. Test theatre: a green run that executes nothing proves nothing.`);
        process.exit(1);
      }
    }
  }
}

const pending = [...pendingCompileCriteria].filter((id) => !coveredIds.has(id));
if (pending.length) {
  console.log(
    `checks-lint passed: ${manifest.checks.length} check(s), ${pending.length} approved criterion/criteria pending compile.`,
  );
  console.log(`pending compile coverage: ${pending.join(", ")}`);
} else {
  console.log(`checks-lint passed: ${manifest.checks.length} check(s).`);
}
