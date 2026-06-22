#!/usr/bin/env node
// wiki-retired-link-lint: a live unit must not depend on a retired one.
//
// Retired/superseded/rejected units are history, not current product behaviour.
// The connectivity lint proves every unit is reachable; it does not stop a live
// unit from keeping a retired unit in its machine-readable `links:` graph. This
// lint closes that gap: if an active unit still lists a retired unit as a link,
// that is either a stale dependency left behind by an incomplete removal, or a
// historical reference that belongs in prose, not in the dependency graph.
//
// The one sanctioned exception is the supersession pointer: a live unit that
// records `supersedes:`/`superseded_by:` for the retired id is correctly keeping
// the rationale chain, so that link is allowed. Prose links (Evidence/History
// sections) are not checked, so history can still be referenced there.

import path from "node:path";
import { walk, readText, parseFrontmatter, asList, TYPED_ID_RE, RETIRED_STATUSES } from "./lib/wiki.mjs";

const ROOT = process.cwd();
const WIKI = path.join(ROOT, "wiki");
const files = walk(WIKI, (f) => f.endsWith(".md"));

const statusById = new Map();
for (const file of files) {
  const { data } = parseFrontmatter(readText(file));
  if (data.id) statusById.set(data.id, data.status || "");
}

const errors = [];
let checked = 0;
for (const file of files) {
  const { data } = parseFrontmatter(readText(file));
  const id = data.id;
  if (!id) continue;
  // Only a LIVE unit's outbound links matter; a retired unit may link to current
  // units as history.
  if (RETIRED_STATUSES.has(data.status)) continue;

  const sanctioned = new Set([...asList(data.supersedes), ...asList(data.superseded_by)]);
  for (const link of asList(data.links)) {
    if (!TYPED_ID_RE.test(link) || !statusById.has(link)) continue; // unresolved links are wiki-link-lint's job
    checked += 1;
    if (RETIRED_STATUSES.has(statusById.get(link)) && !sanctioned.has(link)) {
      errors.push(
        `${path.relative(ROOT, file)}: active unit "${id}" lists ${statusById.get(link)} unit "${link}" in its frontmatter links. ` +
          `A live unit must not depend on history. Record the relationship as supersession (supersedes:/superseded_by:), ` +
          `or move the reference to prose under an Evidence/History section.`,
      );
    }
  }
}

if (errors.length) {
  console.error(`wiki-retired-link-lint failed with ${errors.length} issue(s):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log(`wiki-retired-link-lint passed: no live unit depends on a retired unit (${checked} live link(s) checked).`);
