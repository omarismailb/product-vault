// managed-drift-lint: the installed harness enforcement files must match the
// digests recorded at install time. Editing an installed lint to make the gate
// pass is exactly the failure this catches. It no-ops in the source repo and in
// installs that predate digests, so it never breaks those.

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { tmpRepo, runScript, cleanup } from "./_helpers.mjs";

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const SCRIPT = "scripts/checks-lint.mjs";
const CONTENT = "// a managed harness script\nexport const x = 1;\n";

const installRecord = (digests) =>
  JSON.stringify({
    name: "product-wiki",
    version: "2.2.0",
    repository: "https://github.com/omarismailb/product-wiki",
    installed_at: "2026-06-20T00:00:00.000Z",
    ...(digests ? { managed_digests: digests } : {}),
  });

test("passes when a managed file matches its recorded digest", () => {
  const dir = tmpRepo({
    "product-wiki.json": installRecord({ [SCRIPT]: sha(CONTENT) }),
    [SCRIPT]: CONTENT,
  });
  try {
    const { status, out } = runScript("managed-drift-lint.mjs", dir);
    assert.equal(status, 0, out);
  } finally {
    cleanup(dir);
  }
});

test("fails when a managed file was edited after install", () => {
  const dir = tmpRepo({
    "product-wiki.json": installRecord({ [SCRIPT]: sha(CONTENT) }),
    [SCRIPT]: CONTENT + "// tampered: weakened a check\n",
  });
  try {
    const { status, out } = runScript("managed-drift-lint.mjs", dir);
    assert.equal(status, 1, out);
    assert.match(out, /scripts\/checks-lint\.mjs/, out);
    assert.match(out, /differ|modified/i, out);
  } finally {
    cleanup(dir);
  }
});

test("fails when a recorded managed file is missing", () => {
  const dir = tmpRepo({
    "product-wiki.json": installRecord({ [SCRIPT]: sha(CONTENT) }),
  });
  try {
    const { status, out } = runScript("managed-drift-lint.mjs", dir);
    assert.equal(status, 1, out);
    assert.match(out, /missing/i, out);
  } finally {
    cleanup(dir);
  }
});

test("no-ops in the source repo (ownership manifest, no digests)", () => {
  const dir = tmpRepo({
    "product-wiki.json": JSON.stringify({ name: "product-wiki", version: "2.2.0", ownership: { managed_core: [] } }),
  });
  try {
    const { status } = runScript("managed-drift-lint.mjs", dir);
    assert.equal(status, 0);
  } finally {
    cleanup(dir);
  }
});

test("no-ops on an install that predates digests", () => {
  const dir = tmpRepo({ "product-wiki.json": installRecord(null) });
  try {
    const { status } = runScript("managed-drift-lint.mjs", dir);
    assert.equal(status, 0);
  } finally {
    cleanup(dir);
  }
});
