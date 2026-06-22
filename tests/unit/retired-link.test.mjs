// wiki-retired-link-lint: a live unit must not declare a live dependency on a
// retired/superseded/rejected unit in its frontmatter `links:` graph, unless the
// link is the sanctioned supersession pointer. Retired units are history; an
// active unit that still lists one as a machine-readable link is either stale or
// should record the relationship as supersession (or as prose history, which
// this lint does not check). This catches the gap the connectivity lint leaves:
// connectivity proves a unit is reachable, not that a live unit is free of
// retired dependencies.

import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpRepo, runScript, cleanup } from "./_helpers.mjs";

const unit = (id, type, status, extra = "") => `---
id: ${id}
type: ${type}
status: ${status}
updated: 2026-06-20
${extra}links: []
---
# ${id}
`;

test("fails when an active unit links to a retired unit", () => {
  const dir = tmpRepo({
    "wiki/capabilities/a.md": `---
id: capability.a
type: capability
status: active
updated: 2026-06-20
links: [rule.b]
---
# A
`,
    "wiki/rules/b.md": unit("rule.b", "rule", "retired"),
  });
  try {
    const { status, out } = runScript("wiki-retired-link-lint.mjs", dir);
    assert.equal(status, 1, out);
    assert.match(out, /capability\.a/, out);
    assert.match(out, /rule\.b/, out);
  } finally {
    cleanup(dir);
  }
});

test("passes when the link is a sanctioned supersession pointer", () => {
  const dir = tmpRepo({
    "wiki/rules/new.md": `---
id: rule.new
type: rule
status: active
updated: 2026-06-20
supersedes: assumption.old
links: [assumption.old]
---
# New
`,
    "wiki/assumptions/old.md": unit("assumption.old", "assumption", "superseded"),
  });
  try {
    const { status, out } = runScript("wiki-retired-link-lint.mjs", dir);
    assert.equal(status, 0, out);
  } finally {
    cleanup(dir);
  }
});

test("passes when a retired unit links to an active unit (history is allowed)", () => {
  const dir = tmpRepo({
    "wiki/rules/old.md": `---
id: rule.old
type: rule
status: retired
updated: 2026-06-20
links: [capability.live]
---
# Old
`,
    "wiki/capabilities/live.md": unit("capability.live", "capability", "active"),
  });
  try {
    const { status, out } = runScript("wiki-retired-link-lint.mjs", dir);
    assert.equal(status, 0, out);
  } finally {
    cleanup(dir);
  }
});

test("passes when active units link only to active units", () => {
  const dir = tmpRepo({
    "wiki/capabilities/a.md": `---
id: capability.a
type: capability
status: active
updated: 2026-06-20
links: [rule.b]
---
# A
`,
    "wiki/rules/b.md": unit("rule.b", "rule", "active"),
  });
  try {
    const { status, out } = runScript("wiki-retired-link-lint.mjs", dir);
    assert.equal(status, 0, out);
  } finally {
    cleanup(dir);
  }
});
