// proposal-lint duplicate guard: two non-rejected proposals must not target the
// same request. A duplicate proposal for the same request (the evolution test
// produced two for "warn when overlapping") splits the lineage and confuses
// which proposal is authoritative. A rejected proposal is excluded, so the
// normal "v1 rejected, v2 approved" iteration is fine.

import { test } from "node:test";
import assert from "node:assert/strict";
import { tmpRepo, runScript, cleanup } from "./_helpers.mjs";

const proposal = (id, status, request) => `---
id: ${id}
type: proposal
status: ${status}
approval_status: ${status === "approved" || status === "implemented" ? "approved" : "awaiting-approval"}
${status === "approved" || status === "implemented" ? "approved_by: someone\napproved_at: 2026-06-20\n" : ""}request: ${request}
updated: 2026-06-20
---
## Request
${request}
## Why now
n
## Request type and risk
normal
## Product wiki impact
Actor Job Story Journey Capability Rule Acceptance criterion Outcome Non-goal Assumption Glossary Decision
## Proposed wiki changes
n
## Acceptance criteria
- ac.x.y
## Checks to generate
n
## Reuse or refactor question
n
## Out of scope
n
## Open questions
n
## Self-review
n
`;

test("fails when two non-rejected proposals share the same request", () => {
  const dir = tmpRepo({
    "intake/proposals/v1.md": proposal("proposal.v1", "implemented", "warn when overlapping"),
    "intake/proposals/v2.md": proposal("proposal.v2", "awaiting-approval", "warn when overlapping"),
  });
  try {
    const { status, out } = runScript("proposal-lint.mjs", dir);
    assert.equal(status, 1, out);
    assert.match(out, /duplicate|same request/i, out);
  } finally {
    cleanup(dir);
  }
});

test("passes when the earlier duplicate was rejected", () => {
  const dir = tmpRepo({
    "intake/proposals/v1.md": proposal("proposal.v1", "rejected", "warn when overlapping"),
    "intake/proposals/v2.md": proposal("proposal.v2", "approved", "warn when overlapping"),
  });
  try {
    const { status, out } = runScript("proposal-lint.mjs", dir);
    assert.equal(status, 0, out);
  } finally {
    cleanup(dir);
  }
});

test("passes when proposals have distinct requests", () => {
  const dir = tmpRepo({
    "intake/proposals/a.md": proposal("proposal.a", "implemented", "create one-off event"),
    "intake/proposals/b.md": proposal("proposal.b", "implemented", "show events by day"),
  });
  try {
    const { status, out } = runScript("proposal-lint.mjs", dir);
    assert.equal(status, 0, out);
  } finally {
    cleanup(dir);
  }
});
