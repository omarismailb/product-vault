#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const WRITE_REPORT = process.argv.includes("--write-report");
const REPORT_PATH = path.join(ROOT, ".product-wiki/source-map.json");
const WIKI_ID_RE = /\b(?:actor|job|story|ac|rule|journey|capability|outcome|non-goal|assumption|glossary|decision|wiki|proposal)\.[a-z0-9.-]+\b/g;
const ANCHOR_RE = /\bPW:([a-z0-9][a-z0-9.-]*)\b/g;
const CODE_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".clj",
  ".cpp",
  ".cs",
  ".css",
  ".go",
  ".h",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".kt",
  ".mjs",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sql",
  ".svelte",
  ".swift",
  ".ts",
  ".tsx",
  ".vue",
]);

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
  "wiki/",
];

function run(command, args) {
  return spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    if (entry.isDirectory()) out.push(...walk(full));
    if (entry.isFile()) out.push(full);
  }
  return out;
}

function committableFiles() {
  const git = run("git", ["ls-files", "--cached", "--others", "--exclude-standard"]);
  if (git.status === 0) {
    return git.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((rel) => path.join(ROOT, rel));
  }
  return walk(ROOT);
}

function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return {};
  const data = {};
  for (const raw of match[1].split("\n")) {
    const line = raw.trim();
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!parts) continue;
    data[parts[1]] = parts[2].replace(/^["']|["']$/g, "");
  }
  return data;
}

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
const anchors = [];
const errors = [];

for (const file of committableFiles().filter(shouldScan)) {
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
    if (!knownIds.has(id)) {
      errors.push(`${rel}:${anchor.line}: PW:${id} does not match a known product wiki id`);
    }
  }
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
