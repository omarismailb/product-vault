#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STATUS = new Set(["draft", "awaiting-approval", "approved", "rejected", "implemented"]);
const APPROVAL_STATUS = new Set(["awaiting-approval", "approved", "rejected"]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;

  const data = {};
  for (const raw of match[1].split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!parts) continue;
    data[parts[1]] = parts[2].replace(/^["']|["']$/g, "");
  }
  return { data, body: text.slice(match[0].length) };
}

const files = [
  ...walk(path.join(ROOT, "intake/proposals")),
  ...walk(path.join(ROOT, "examples")),
];

const errors = [];
let count = 0;

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const parsed = frontmatter(text);
  if (!parsed || parsed.data.type !== "proposal") continue;
  count += 1;

  const rel = path.relative(ROOT, file);
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
  }

  if (!/##\s+Acceptance criteria/i.test(parsed.body)) {
    errors.push(`${rel}: missing "## Acceptance criteria" section`);
  }
  if (!/##\s+Open questions/i.test(parsed.body) && parsed.data.status === "awaiting-approval") {
    errors.push(`${rel}: awaiting proposals should include "## Open questions"`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`proposal-lint passed: ${count} proposal file(s).`);
