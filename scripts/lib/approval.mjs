#!/usr/bin/env node
// Shared approval helpers.
//
// A markdown linter can verify the SHAPE of an approval (the fields are present
// and name a declared approver), not the human decision itself. The real
// human-approval boundary is PR review plus branch protection plus the local
// approve/edit/reject workflow. These helpers give the lints just enough to
// reject a self-asserted approval that names nobody on the allow-list, while the
// git-author cross-check is advisory provenance, not a cryptographic gate.
//
// loadApprovers(root)      -> string[] from product-wiki.json "approvers" (or [])
// matchesApprover(c, list) -> case-insensitive containment match (name or email)
// approvalLineAuthor(...)  -> { name, email } of the commit that introduced the
//                             approval line, or null when not in git / uncommitted.

import fs from "node:fs";
import path from "node:path";

export function loadApprovers(root) {
  const file = path.join(root, "product-wiki.json");
  if (!fs.existsSync(file)) return [];
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
  const list = Array.isArray(parsed?.approvers) ? parsed.approvers : [];
  return [...new Set(list.map((s) => String(s || "").trim()).filter(Boolean))];
}

// Exact (case-insensitive, trimmed) match only. We deliberately do NOT do
// substring matching: an unanchored "contains" lets a forged approved_by like
// "omarismailb-impostor" (or a 1-char "b") satisfy a configured allow-list.
// List the exact identity used in approved_by (a full email is best).
export function matchesApprover(candidate, approvers) {
  const c = String(candidate || "").trim().toLowerCase();
  if (!c) return false;
  return approvers.some((a) => String(a).trim().toLowerCase() === c);
}

// Find the frontmatter approval line (approved_by preferred, else the
// status: approved/implemented line) and use `git blame` to return the
// {name,email} of the commit that introduced it. Returns null when blame is
// unavailable (not a git repo, git missing) or the line is uncommitted, so the
// caller can degrade to an advisory warning rather than a hard failure.
export function approvalLineAuthor(root, relPath, runner) {
  const abs = path.join(root, relPath);
  let text;
  try {
    text = fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let lineNo = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^approved_by\s*:/.test(lines[i])) {
      lineNo = i + 1;
      break;
    }
  }
  if (lineNo === -1) {
    for (let i = 0; i < lines.length; i += 1) {
      if (/^status\s*:\s*(approved|implemented)\b/.test(lines[i].trim())) {
        lineNo = i + 1;
        break;
      }
    }
  }
  if (lineNo === -1) return null;
  const blame = runner("git", ["blame", "--porcelain", "-L", `${lineNo},${lineNo}`, "--", relPath], {
    cwd: root,
    encoding: "utf8",
  });
  if (!blame || blame.status !== 0 || typeof blame.stdout !== "string") return null;
  const out = blame.stdout.replace(/\r\n/g, "\n");
  if (/^0{40}\b/.test(out.split("\n")[0] || "")) return null; // not committed yet
  const nameMatch = out.match(/^author (.*)$/m);
  const emailMatch = out.match(/^author-mail <?([^>\n]*)>?$/m);
  const name = nameMatch ? nameMatch[1].trim() : "";
  const email = emailMatch ? emailMatch[1].trim() : "";
  if (/^Not Committed Yet$/i.test(name)) return null;
  if (!name && !email) return null;
  return { name, email };
}
