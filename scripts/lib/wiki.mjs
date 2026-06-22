#!/usr/bin/env node
// Shared helpers for the product-wiki lint scripts.
//
// The lints historically each re-implemented walk(), a frontmatter parser, the
// wiki-id regex, the code-extension set, and a section extractor, with subtle
// drift between copies. New scripts import these instead. (Older scripts are
// being migrated onto this module incrementally.)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const STATUSES = new Set(["draft", "proposed", "active", "retired", "superseded", "rejected"]);

// Statuses that take a unit off the live graph: it is history, not current
// product behaviour. Such a unit needs no inbound link, requires no executable
// check, and must not be a live dependency of an active unit. Single source of
// truth so the lints cannot drift on "what counts as retired".
export const RETIRED_STATUSES = new Set(["retired", "superseded", "rejected"]);

// The unit types. Single source of truth, because two of them are hyphenated
// (non-goal, design-system): a naive `^[a-z0-9]+\.` first segment silently fails
// to recognise their ids, so every id/link regex is derived from this list.
export const UNIT_TYPES = [
  "actor", "job", "story", "ac", "rule", "journey", "capability", "outcome",
  "non-goal", "assumption", "glossary", "decision", "design-system", "wiki", "proposal",
];

// Scan form: every typed id mentioned anywhere in a blob (global).
export const WIKI_ID_RE = new RegExp(`\\b(?:${UNIT_TYPES.join("|")})\\.[a-z0-9.-]+\\b`, "g");

// Anchored single-token form: true when a string IS a typed unit id (e.g. used
// to decide whether a [[link]] is a typed link or free-form). Matches the
// hyphenated types, which the old `^[a-z0-9]+(?:\.[a-z0-9-]+)+$` did not.
export const TYPED_ID_RE = new RegExp(`^(?:${UNIT_TYPES.join("|")})\\.[a-z0-9.-]+$`);

export const CODE_EXTENSIONS = new Set([
  ".c", ".cc", ".clj", ".cpp", ".cs", ".css", ".go", ".h", ".html", ".java",
  ".js", ".jsx", ".kt", ".mjs", ".php", ".py", ".rb", ".rs", ".scss", ".sql",
  ".svelte", ".swift", ".ts", ".tsx", ".vue",
]);

// Extensions that imply a rendered user interface (used to gate design checks).
export const UI_EXTENSIONS = new Set([".html", ".css", ".scss", ".jsx", ".tsx", ".vue", ".svelte"]);

// Directory names that are always VCS/build/dependency noise. Skipped by walk()
// and (via the committableFiles() non-git fallback) so lints never scan
// generated artifacts, which would produce false positives outside a git
// checkout. Inside a git repo committableFiles() honours .gitignore instead.
export const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".product-wiki",
  ".next",
  "dist",
  "build",
  "coverage",
  "out",
  ".turbo",
  ".cache",
]);

// Recursively list files under dir, sorted for deterministic output, skipping
// VCS/build noise.
export function walk(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (entry.isFile() && predicate(full)) out.push(full);
  }
  return out;
}

export function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

// Parse YAML-ish frontmatter. CRLF-tolerant. Inline arrays ("[a, b]") become
// JS arrays; everything else is a trimmed, unquoted string. Returns
// { data, body }.
export function parseFrontmatter(text) {
  const normalized = (text || "").replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: normalized };
  const data = {};
  for (const raw of match[1].split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!parts) continue;
    const [, key, rawValue] = parts;
    const value = rawValue.trim();
    if (/^\[.*\]$/.test(value)) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return { data, body: normalized.slice(match[0].length) };
}

// Strict frontmatter parse for lints that must report *why* a unit is invalid
// rather than silently treating malformed frontmatter as "no frontmatter".
// CRLF-tolerant. Returns { data, body, error } where error is one of
// "missing frontmatter" (no opening fence) or "unterminated frontmatter"
// (opening fence with no closing fence), else null. On error, data is {} and
// body is the normalized text. This is the single source of truth the lints
// adopt instead of each re-implementing a (drifting) strict parser.
export function parseUnit(text) {
  const normalized = (text || "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { data: {}, body: normalized, error: "missing frontmatter" };
  }
  if (normalized.indexOf("\n---", 4) === -1) {
    return { data: {}, body: normalized, error: "unterminated frontmatter" };
  }
  const parsed = parseFrontmatter(normalized);
  return { data: parsed.data, body: parsed.body, error: null };
}

// Coerce a frontmatter value that may be an inline array ("[a, b]"), a real
// array, or a single scalar into a string array. Unlike a bare array check this
// also captures a single non-bracketed id (links: capability.x), which is a
// real link the older inline-only parsers silently dropped.
export function asList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  const v = String(value).trim();
  if (!v) return [];
  if (/^\[.*\]$/.test(v)) {
    return v
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return [v.replace(/^["']|["']$/g, "")];
}

// Body of a single "## Heading" section (heading text matched by pattern),
// up to the next "## " heading or end of unit.
export function sectionBody(body, headingPattern) {
  const out = [];
  let capturing = false;
  for (const line of (body || "").split("\n")) {
    if (/^##\s+/.test(line)) {
      if (capturing) break;
      capturing = headingPattern.test(line.replace(/^##\s+/, "").trim());
      continue;
    }
    if (capturing) out.push(line);
  }
  return out.join("\n");
}

// Files that could be committed (tracked or new, honouring .gitignore). Falls
// back to a filesystem walk outside a git repo.
export function committableFiles(root) {
  const git = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
  });
  if (git.status === 0) {
    return git.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((rel) => path.join(root, rel));
  }
  return walk(root);
}

// Strip fenced code blocks and inline `code` so prose checks ignore code samples.
export function stripCode(text) {
  return (text || "").replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");
}

// The shape of a PW: source anchor. Single source of truth so wiki-anchor-lint
// and ratchet-lint cannot drift on "what is an anchor".
export const ANCHOR_RE = /\bPW:([a-z0-9][a-z0-9.-]*)\b/g;

// Path prefixes that hold documentation/spec/fixture content, never the product
// code that PW: anchors live in. enumerateAnchors() excludes them so a PW:
// anchor inside a committed fixture (tests/) or a doc example is not counted as
// a real product anchor.
const NON_CODE_PREFIXES = ["wiki/", "intake/", "docs/", "examples/", "templates/", "tests/"];

// Enumerate every PW: anchor in the repo's code (deterministic, sorted walk).
// Returns { id, file, line } records. Shared by wiki-anchor-lint (regex) and
// ratchet-lint (count) so the anchor metric stays in lockstep.
export function enumerateAnchors(root) {
  const out = [];
  const files = walk(root, (file) => {
    if (!CODE_EXTENSIONS.has(path.extname(file))) return false;
    const rel = path.relative(root, file).split(path.sep).join("/");
    return !NON_CODE_PREFIXES.some((p) => rel.startsWith(p));
  });
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    const text = readText(file);
    for (const match of text.matchAll(ANCHOR_RE)) {
      const before = text.slice(0, match.index || 0);
      out.push({ id: match[1], file: rel, line: before.split("\n").length });
    }
  }
  return out;
}
