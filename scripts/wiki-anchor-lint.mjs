#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  walk,
  readText,
  parseFrontmatter,
  sectionBody,
  committableFiles,
  WIKI_ID_RE,
  CODE_EXTENSIONS,
  ANCHOR_RE,
  RETIRED_STATUSES,
} from "./lib/wiki.mjs";

const ROOT = process.cwd();
const WRITE_REPORT = process.argv.includes("--write-report");
const REPORT_PATH = path.join(ROOT, ".product-wiki/source-map.json");

const IGNORED_PREFIXES = [
  ".git/",
  ".next/",
  ".product-wiki/",
  "coverage/",
  "dist/",
  "docs/",
  "examples/",
  "intake/",
  "node_modules/",
  "schemas/",
  "templates/",
  "tests/",
  "wiki/",
];

const frontmatter = (text) => parseFrontmatter(text).data;

// Wiki unit lifecycle, used to (a) reject anchors that bind code to a
// retired/superseded unit, and (b) require active code units to be anchored.
function collectWikiUnits() {
  const byId = new Map();
  for (const file of collectMarkdownFiles("wiki")) {
    const data = frontmatter(readText(file));
    if (!data.id) continue;
    byId.set(data.id, {
      type: data.type,
      status: data.status,
      noCode: data["no-code"] === "true" || data.no_code === "true",
      rel: path.relative(ROOT, file),
    });
  }
  return byId;
}

// Unit types that represent a code path and so must carry at least one anchor.
const CODE_UNIT_TYPES = new Set(["capability", "rule"]);

function collectMarkdownFiles(relDir) {
  return walk(path.join(ROOT, relDir)).filter((file) => file.endsWith(".md"));
}

function collectKnownIds() {
  const ids = new Map();
  const sources = [
    ...collectMarkdownFiles("wiki"),
    ...collectMarkdownFiles("intake/proposals"),
    ...collectMarkdownFiles("examples"),
  ];

  for (const file of sources) {
    const rel = path.relative(ROOT, file);
    const text = readText(file);
    const data = frontmatter(text);
    if (data.id) ids.set(data.id, rel);
    for (const match of text.matchAll(WIKI_ID_RE)) {
      if (!ids.has(match[0])) ids.set(match[0], rel);
    }
  }

  return ids;
}

// An active capability/rule may opt out of the required-anchor check with
// `no-code: true`, but only when an approved/implemented proposal names the unit
// id under a "## No-code" heading. A bare self-asserted no-code flag is never
// self-evident for a code-path unit type. sectionBody scopes the exemption so a
// passing mention elsewhere in the proposal cannot launder it.
function collectApprovedNoCodeIds() {
  const ids = new Set();
  for (const file of collectMarkdownFiles("intake/proposals")) {
    const { data, body } = parseFrontmatter(readText(file));
    if (data.type !== "proposal") continue;
    if (!["approved", "implemented"].includes(data.status)) continue;
    const section = sectionBody(body, /no.?code/i);
    for (const match of section.matchAll(WIKI_ID_RE)) ids.add(match[0]);
  }
  return ids;
}

function shouldScan(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  if (IGNORED_PREFIXES.some((prefix) => rel.startsWith(prefix))) return false;
  if (rel === "package-lock.json" || rel === "pnpm-lock.yaml" || rel === "yarn.lock") return false;
  return CODE_EXTENSIONS.has(path.extname(file));
}

function lineFor(text, index) {
  return text.slice(0, index).split("\n").length;
}

const knownIds = collectKnownIds();
const wikiUnits = collectWikiUnits();
const approvedNoCode = collectApprovedNoCodeIds();
const anchors = [];
const anchoredIds = new Set();
const errors = [];

for (const file of committableFiles(ROOT).filter(shouldScan)) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const text = readText(file);
  for (const match of text.matchAll(ANCHOR_RE)) {
    const id = match[1];
    const anchor = {
      id,
      file: rel,
      line: lineFor(text, match.index || 0),
    };
    anchors.push(anchor);
    anchoredIds.add(id);
    if (!knownIds.has(id)) {
      errors.push(`${rel}:${anchor.line}: PW:${id} does not match a known product wiki id`);
    } else if (RETIRED_STATUSES.has(wikiUnits.get(id)?.status)) {
      errors.push(
        `${rel}:${anchor.line}: PW:${id} anchors code to a ${wikiUnits.get(id).status} unit. ` +
          `Remove the anchor as part of retiring the unit, or the code claims to implement something the wiki says is gone.`,
      );
    }
  }
}

// Symmetric direction: an active capability/rule represents a code path, so it
// must carry at least one PW: anchor (or opt out with `no-code: true`).
// Otherwise the intent->implementation link can be deleted silently.
for (const [id, unit] of [...wikiUnits].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (unit.status !== "active") continue;
  if (!CODE_UNIT_TYPES.has(unit.type)) continue;
  if (anchoredIds.has(id)) continue;
  if (unit.noCode && approvedNoCode.has(id)) continue;
  if (unit.noCode && !approvedNoCode.has(id)) {
    errors.push(
      `${unit.rel}: active ${unit.type} "${id}" sets no-code: true but no approved proposal exempts it. ` +
        `An approved/implemented proposal in intake/proposals/ must name "${id}" under a "## No-code" heading, ` +
        `or add a PW:${id} anchor at its implementation.`,
    );
    continue;
  }
  errors.push(
    `${unit.rel}: active ${unit.type} "${id}" has no PW: anchor in code. ` +
      `Add a PW:${id} anchor at its implementation, or set no-code: true backed by an approved proposal if it has none.`,
  );
}

if (WRITE_REPORT) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  const byId = {};
  for (const anchor of anchors) {
    byId[anchor.id] ||= [];
    byId[anchor.id].push({ file: anchor.file, line: anchor.line });
  }
  fs.writeFileSync(
    REPORT_PATH,
    `${JSON.stringify(
      {
        at: new Date().toISOString(),
        anchor_count: anchors.length,
        by_id: byId,
      },
      null,
      2,
    )}\n`,
  );
}

if (errors.length) {
  console.error(`wiki-anchor-lint failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const reportSuffix = WRITE_REPORT ? ` Report written to ${path.relative(ROOT, REPORT_PATH)}.` : "";
console.log(`wiki-anchor-lint passed: ${anchors.length} PW anchor(s).${reportSuffix}`);
