#!/usr/bin/env node

// intent-lint: enforce the approval gate deterministically.
//
// 1. An acceptance criterion may only be `status: active` if an `approved` or
//    `implemented` proposal introduced it. Active criteria must trace back to
//    human approval before they can become pending compile or implemented
//    behaviour.
// 2. Every executable check (unit, integration, e2e) must cover at least one
//    acceptance criterion, so running code always traces to product intent.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { walk, readText, parseFrontmatter, sectionBody } from "./lib/wiki.mjs";
import { loadApprovers, matchesApprover, approvalLineAuthor } from "./lib/approval.mjs";

const ROOT = process.cwd();
const EXECUTABLE_KINDS = new Set(["unit", "integration", "e2e"]);
const approvers = loadApprovers(ROOT);
const errors = [];

// Verify the SHAPE of an approval. The allow-list membership check is a hard
// gate (only when an approvers list is configured). The git-blame author
// cross-check is ADVISORY only — it warns but never fails the gate, because PR
// review plus branch protection prove the human decision; the linter only
// proves structure plus allow-list membership.
function approvalIsTrustworthy(data, rel) {
  if (data.approved_by && approvers.length > 0 && !matchesApprover(data.approved_by, approvers)) {
    errors.push(
      `${rel}: approved_by "${data.approved_by}" is not in product-wiki.json "approvers" [${approvers.join(", ")}]. ` +
        `This proposal cannot satisfy the approval gate.`,
    );
    return false;
  }
  const author = approvalLineAuthor(ROOT, rel, spawnSync);
  if (author && approvers.length > 0 && !matchesApprover(author.name, approvers) && !matchesApprover(author.email, approvers)) {
    console.warn(
      `${rel}: WARN the approval was committed by "${author.name} <${author.email}>", who is not a declared approver. ` +
        `Provenance is advisory; PR review and branch protection enforce the human decision.`,
    );
  }
  return true;
}

const isMd = (file) => file.endsWith(".md");

// Only count acceptance-criteria ids declared under the proposal's
// "## Acceptance criteria" heading, never an id merely mentioned elsewhere
// (e.g. under "## Out of scope"), so the approval gate cannot be fooled by a
// passing reference. sectionBody (shared) provides exactly this scoping.

const activeCriteria = new Map(); // id -> file
const approvedCriteria = new Set(); // ac ids introduced by an approved/implemented proposal

for (const file of [...walk(path.join(ROOT, "wiki"), isMd), ...walk(path.join(ROOT, "intake/proposals"), isMd), ...walk(path.join(ROOT, "examples"), isMd)]) {
  const { data, body } = parseFrontmatter(readText(file));
  const rel = path.relative(ROOT, file);

  if (data.type === "acceptance-criterion" && data.status === "active" && data.id) {
    activeCriteria.set(data.id, rel);
  }
  if (data.type === "proposal" && ["approved", "implemented"].includes(data.status)) {
    if (!approvalIsTrustworthy(data, rel)) continue;
    const acSection = sectionBody(body, /acceptance criteria/i);
    for (const acId of acSection.match(/\bac\.[a-z0-9.-]+\b/g) || []) approvedCriteria.add(acId);
  }
}

for (const [id, rel] of activeCriteria) {
  if (!approvedCriteria.has(id)) {
    errors.push(
      `${rel}: acceptance criterion "${id}" is active but no approved or implemented proposal introduces it. ` +
        `Approval gate: add "${id}" to an approved proposal in intake/proposals/, or set the criterion status to draft.`,
    );
  }
}

const manifestPath = path.join(ROOT, "checks/manifest.json");
if (fs.existsSync(manifestPath)) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    console.error(`checks/manifest.json is invalid JSON: ${error.message}`);
    process.exit(1);
  }
  for (const check of manifest.checks || []) {
    if (!EXECUTABLE_KINDS.has(check.kind)) continue;
    const covered = (check.covers || []).some((id) => /^ac\./.test(id));
    if (!covered) {
      errors.push(
        `${check.id || "check"}: an executable check (kind ${check.kind}) must cover at least one acceptance criterion (an "ac.*" id).`,
      );
    }
  }
}

if (errors.length) {
  console.error(`intent-lint failed with ${errors.length} issue(s):`);
  for (const issue of errors) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`intent-lint passed: ${activeCriteria.size} active criterion/criteria traced to approval.`);
