// Regression for the checks-lint / ratchet-lint retirement inconsistency.
//
// ratchet-lint only counts active acceptance-criterion units, so a retired
// criterion correctly drops out. checks-lint, however, seeded required coverage
// from every criterion ever declared under an *implemented* proposal's
// "## Acceptance criteria" heading, with no retirement subtraction. The result:
// retiring a criterion and removing its check failed the gate, so a clean
// feature removal was impossible without editing the harness. This is the golden
// removal test: it must stay green, and the bite on active criteria must remain.

import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpRepo, runScript, cleanup, PASSING_TEST_FILE } from "./_helpers.mjs";

const KEPT = `---
id: ac.feature.kept
type: acceptance-criterion
status: active
updated: 2026-06-20
links: []
---
# Kept
`;

const proposalWith = (goneStatus) => ({
  "checks/manifest.json": JSON.stringify({
    checks: [
      {
        id: "check.feature.kept",
        covers: ["ac.feature.kept"],
        kind: "unit",
        command: "node --test --test-name-pattern='^ac.feature.kept$' tests/feature.test.mjs",
      },
    ],
  }),
  "tests/feature.test.mjs": PASSING_TEST_FILE,
  "wiki/acceptance-criteria/kept.md": KEPT,
  "wiki/acceptance-criteria/gone.md": `---
id: ac.feature.gone
type: acceptance-criterion
status: ${goneStatus}
updated: 2026-06-20
links: []
---
# Gone
`,
  // An implemented proposal that historically declared BOTH criteria. The
  // overlap feature was removed, so ac.feature.gone is now retired in the wiki,
  // but the historical proposal still names it.
  "intake/proposals/feature.md": `---
id: proposal.feature
type: proposal
status: implemented
approval_status: approved
request: build the feature
updated: 2026-06-20
---
## Acceptance criteria
- ac.feature.kept
- ac.feature.gone
`,
});

test("a retired criterion from an implemented proposal does not require a check", () => {
  const dir = tmpRepo(proposalWith("retired"));
  try {
    const { status, out } = runScript("checks-lint.mjs", dir);
    assert.equal(status, 0, `expected pass after retirement, got:\n${out}`);
  } finally {
    cleanup(dir);
  }
});

test("an active criterion with no check still fails (the bite is preserved)", () => {
  const dir = tmpRepo(proposalWith("active"));
  try {
    const { status, out } = runScript("checks-lint.mjs", dir);
    assert.equal(status, 1, `expected failure for an uncovered active criterion, got:\n${out}`);
    assert.match(out, /not covered.*ac\.feature\.gone/, out);
  } finally {
    cleanup(dir);
  }
});
