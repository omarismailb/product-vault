#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { walk, readText, parseFrontmatter } from "./lib/wiki.mjs";
import { loadApprovers, matchesApprover, approvalLineAuthor } from "./lib/approval.mjs";

const ROOT = process.cwd();
const STATUS = new Set(["draft", "awaiting-approval", "approved", "rejected", "implemented"]);
const APPROVAL_STATUS = new Set(["awaiting-approval", "approved", "rejected"]);

const isMd = (file) => file.endsWith(".md");

const PROPOSAL_DIRS = [path.join(ROOT, "intake/proposals"), path.join(ROOT, "examples")];
const files = PROPOSAL_DIRS.flatMap((dir) => walk(dir, isMd)).filter((file) => path.basename(file) !== "template.md");
const INTAKE_DIR = path.join(ROOT, "intake/proposals");
const approvers = loadApprovers(ROOT);

const errors = [];
let count = 0;
let noAllowlistAdvised = false;
// Normalized request -> proposal files that claim it. Two non-rejected
// proposals for the same request split the lineage; flagged after the loop.
const requestOwners = new Map();

for (const file of files) {
  const text = readText(file);
  const parsed = parseFrontmatter(text);
  const rel = path.relative(ROOT, file);

  // A proposal is identified by living directly in intake/proposals/, OR by an
  // id shaped like proposal.*, OR by explicit type: proposal. README/prose
  // under examples/ is skipped. A file in a proposal location that looks like a
  // proposal but is missing/!= proposal type is an ERROR, not a silent skip.
  const inIntake = path.dirname(file) === INTAKE_DIR;
  const looksLikeProposal = inIntake || parsed.data.type === "proposal" || /^proposal\.[a-z0-9.-]+$/.test(parsed.data.id || "");
  if (!looksLikeProposal) continue;
  if (parsed.data.type !== "proposal") {
    errors.push(
      `${rel}: proposal file has type "${parsed.data.type || "(missing)"}" — must be type: proposal. ` +
        `A file in a proposal location cannot opt out of the proposal gates by dropping its type.`,
    );
    count += 1;
    continue;
  }
  count += 1;

  // Collect request lineage for the duplicate-proposal check. A rejected
  // proposal is excluded, so iterating "v1 rejected -> v2 approved" is fine.
  if (inIntake && parsed.data.status !== "rejected" && parsed.data.request) {
    const key = String(parsed.data.request).trim().toLowerCase().replace(/\s+/g, " ");
    if (!requestOwners.has(key)) requestOwners.set(key, []);
    requestOwners.get(key).push(rel);
  }

  const required = ["id", "type", "status", "request", "updated", "approval_status"];
  for (const key of required) {
    if (!parsed.data[key]) errors.push(`${rel}: missing frontmatter key "${key}"`);
  }

  if (parsed.data.id && !/^proposal\.[a-z0-9.-]+$/.test(parsed.data.id)) {
    errors.push(`${rel}: proposal id must look like proposal.some-id`);
  }
  if (parsed.data.status && !STATUS.has(parsed.data.status)) {
    errors.push(`${rel}: invalid status "${parsed.data.status}"`);
  }
  if (parsed.data.approval_status && !APPROVAL_STATUS.has(parsed.data.approval_status)) {
    errors.push(`${rel}: invalid approval_status "${parsed.data.approval_status}"`);
  }
  if (parsed.data.updated && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.updated)) {
    errors.push(`${rel}: updated must be YYYY-MM-DD`);
  }

  if (["approved", "implemented"].includes(parsed.data.status)) {
    if (parsed.data.approval_status !== "approved") {
      errors.push(`${rel}: approved or implemented proposals need approval_status: approved`);
    }
    if (!parsed.data.approved_by) errors.push(`${rel}: approved proposal missing approved_by`);
    if (!parsed.data.approved_at) errors.push(`${rel}: approved proposal missing approved_at`);

    // Allow-list membership is a HARD gate, but only when an approvers list is
    // configured. Without one, approval is advisory (warn-only).
    if (parsed.data.approved_by) {
      if (approvers.length === 0) {
        // Advisory, emitted at most once per run (not once per proposal): the
        // allow-list is optional and the real gate is PR review + branch
        // protection. Configure "approvers" in product-wiki.json to also enforce
        // approved_by in the lint.
        if (!noAllowlistAdvised) {
          console.warn(
            `note: product-wiki.json declares no "approvers", so approved_by is not enforced here. ` +
              `Approval is enforced by your PR review and branch protection; add "approvers" to also enforce it in the lint.`,
          );
          noAllowlistAdvised = true;
        }
      } else if (!matchesApprover(parsed.data.approved_by, approvers)) {
        errors.push(
          `${rel}: approved_by "${parsed.data.approved_by}" is not in product-wiki.json "approvers" [${approvers.join(", ")}]. ` +
            `A proposal may only be approved by a declared approver.`,
        );
      }
    }
    // Git-author cross-check is advisory: warn only when an allow-list exists and
    // the commit that introduced the approval is by someone outside it. The
    // not-a-git-repo / uncommitted case is left silent (doctor's git guard covers
    // the former; the latter resolves on commit) so the lint is not noisy.
    if (approvers.length > 0) {
      const author = approvalLineAuthor(ROOT, rel, spawnSync);
      if (author && !matchesApprover(author.name, approvers) && !matchesApprover(author.email, approvers)) {
        console.warn(
          `${rel}: WARN the approval was committed by "${author.name} <${author.email}>", who is not a declared approver. ` +
            `Provenance is advisory; PR review and branch protection enforce the human decision.`,
        );
      }
    }
  }

  if (!/##\s+Acceptance criteria/i.test(parsed.body)) {
    errors.push(`${rel}: missing "## Acceptance criteria" section`);
  }
  if (!/##\s+Open questions/i.test(parsed.body) && parsed.data.status === "awaiting-approval") {
    errors.push(`${rel}: awaiting proposals should include "## Open questions"`);
  }

  const requiredSections = [
    "Request",
    "Why now",
    "Request type and risk",
    "Product wiki impact",
    "Proposed wiki changes",
    "Acceptance criteria",
    "Checks to generate",
    "Reuse or refactor question",
    "Out of scope",
    "Self-review",
  ];

  for (const section of requiredSections) {
    const pattern = new RegExp(`##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    if (!pattern.test(parsed.body)) errors.push(`${rel}: missing "## ${section}" section`);
  }

  const unitFamilies = [
    "Actor",
    "Job",
    "Story",
    "Journey",
    "Capability",
    "Rule",
    "Acceptance criterion",
    "Outcome",
    "Non-goal",
    "Assumption",
    "Glossary",
    "Decision",
  ];

  if (/##\s+Product wiki impact/i.test(parsed.body)) {
    const impactSection = parsed.body.split(/##\s+Product wiki impact/i)[1]?.split(/\n##\s+/)[0] || "";
    for (const unit of unitFamilies) {
      if (!impactSection.includes(unit)) {
        errors.push(`${rel}: product wiki impact missing unit family "${unit}"`);
      }
    }
  }

  if (/\b(TBD|TODO|fill in|replace with)\b/i.test(parsed.body)) {
    errors.push(`${rel}: contains unresolved placeholder text`);
  }
}

for (const [request, owners] of requestOwners) {
  if (owners.length > 1) {
    errors.push(
      `duplicate proposals target the same request "${request}": ${owners.join(", ")}. ` +
        `Only one non-rejected proposal should own a request lineage. Reject or supersede the older one, or merge them.`,
    );
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`proposal-lint passed: ${count} proposal file(s).`);
