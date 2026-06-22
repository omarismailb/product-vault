#!/usr/bin/env node
// wiki-connectivity-lint: every product unit must be reachable.
//
// Unit-level inbound edges come from three generic, data-model-driven sources:
// a body relative markdown link to a unit file ([..](../jobs/x.md)), a body
// `[[type.slug]]` link (back-compat), and the frontmatter `links:` array.
// Directory links (`](capabilities/)`) are resolved but are NOT a blanket
// inbound exemption — wiki/index.md links every family directory, which would
// make this lint vacuous. They are used only to distinguish "the whole family
// lives in an unlinked directory" from "the unit sits in a discoverable family
// but nothing points at it", so the two failure messages are clear.
//
// Roots that never need an inbound link: the index/overview/log types plus the
// glossary and design-system reference families (mirrors wiki-overview-lint's
// ignoredFreshnessTypes), the two entry ids, and any unit that opts out with
// frontmatter `no-inbound: true`. Retired/superseded/rejected units are off the
// live graph.
import path from "node:path";
import { walk, readText, parseFrontmatter, asList, TYPED_ID_RE } from "./lib/wiki.mjs";

const ROOT = process.cwd();
const WIKI = path.join(ROOT, "wiki");
const ROOT_TYPES = new Set(["index", "overview", "log", "glossary", "design-system"]);

function truthy(v) {
  if (v === true) return true;
  if (typeof v === "string") return /^(true|yes|1)$/i.test(v.trim());
  return false;
}

const files = walk(WIKI, (f) => f.endsWith(".md"));
const units = new Map();
const idsByDir = new Map();
for (const file of files) {
  const { data } = parseFrontmatter(readText(file));
  if (!data.id) continue;
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const dir = path.relative(WIKI, path.dirname(file)).split(path.sep).join("/");
  units.set(data.id, {
    rel,
    type: data.type || "",
    status: data.status || "",
    noInbound: truthy(data["no-inbound"]),
    dir,
  });
  if (!idsByDir.has(dir)) idsByDir.set(dir, new Set());
  idsByDir.get(dir).add(data.id);
}

// Reverse map so a body relative markdown link (a file path) resolves to the id.
const idByRel = new Map();
for (const [id, u] of units) idByRel.set(u.rel, id);

const inbound = new Set();
const linkedDirs = new Set();
for (const file of files) {
  const text = readText(file);
  const { data, body } = parseFrontmatter(text);
  const selfId = data.id;
  // A unit pointing at itself is not "reachable from elsewhere"; only count
  // inbound edges from some OTHER unit (mirrors design-lint's self-ref guard).
  for (const t of asList(data.links)) {
    if (TYPED_ID_RE.test(t) && units.has(t) && t !== selfId) inbound.add(t);
  }
  for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const t = m[1].trim();
    if (TYPED_ID_RE.test(t) && units.has(t) && t !== selfId) inbound.add(t);
  }
  // Relative markdown links to a unit file resolve to that unit's id (canonical).
  for (const m of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = m[1].trim().split("#")[0];
    if (!href.endsWith(".md")) continue;
    const rel = path.relative(ROOT, path.resolve(path.dirname(file), href)).split(path.sep).join("/");
    const targetId = idByRel.get(rel);
    if (targetId && targetId !== selfId) inbound.add(targetId);
  }
  for (const m of body.matchAll(/\]\(\.?\/?([a-z0-9-]+)\/\)/g)) {
    linkedDirs.add(m[1]);
  }
}

const errors = [];
for (const [id, unit] of [...units.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (ROOT_TYPES.has(unit.type)) continue;
  if (id === "wiki.index" || id === "wiki.overview") continue;
  if (unit.noInbound) continue;
  if (["retired", "superseded", "rejected"].includes(unit.status)) continue;
  if (inbound.has(id)) continue;
  if (unit.dir && !linkedDirs.has(unit.dir)) {
    errors.push(
      `${unit.rel}: unit "${id}" is unreachable. Its directory "${unit.dir}/" is not linked from wiki/index.md or wiki/overview.md, and no unit links to it. Link the directory from an entry page or add a typed link to this unit.`,
    );
  } else {
    errors.push(
      `${unit.rel}: unit "${id}" has no inbound typed link. Nothing in the wiki points at it, so it cannot be reached by following links. Link it from a parent unit, or set frontmatter "no-inbound: true" if it is a genuine top-level unit.`,
    );
  }
}

if (errors.length) {
  console.error(`wiki-connectivity-lint failed with ${errors.length} issue(s):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`wiki-connectivity-lint passed: ${units.size} unit(s), all non-root units reachable.`);
