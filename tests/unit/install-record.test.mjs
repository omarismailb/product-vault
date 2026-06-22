// Integration test for what `sync-managed --write` records in the installed
// product-wiki.json, exercised end to end against a fresh temp target:
// - approvers seeded from the target's git identity, so the approval gate is
//   enforced by default instead of advisory (the empty-approvers weakness);
// - managed_digests recorded, so managed-drift-lint can verify the install and
//   catch in-place harness edits;
// - the npm-default `test` placeholder replaced so `npm test` exits 0 at
//   baseline.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function freshTarget() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-install-"));
  const git = (...a) => spawnSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.name", "Test Approver");
  git("config", "user.email", "approver@example.com");
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "demo", version: "1.0.0", scripts: { test: 'echo "Error: no test specified" && exit 1' } }, null, 2),
  );
  return dir;
}

function sync(dir) {
  return spawnSync(process.execPath, [path.join(SOURCE, "scripts/sync-managed.mjs"), "--target", dir, "--write"], {
    encoding: "utf8",
  });
}

test("install seeds approvers from git identity and records managed digests", () => {
  const dir = freshTarget();
  try {
    const r = sync(dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const record = JSON.parse(fs.readFileSync(path.join(dir, "product-wiki.json"), "utf8"));

    assert.deepEqual(record.approvers, ["Test Approver"], "approvers should be seeded from git user.name");
    assert.ok(record.managed_digests, "managed_digests should be recorded");
    assert.ok(
      typeof record.managed_digests["scripts/checks-lint.mjs"] === "string",
      "a known managed file should be digested",
    );

    // managed-drift-lint passes on the clean install...
    const clean = spawnSync(process.execPath, [path.join(SOURCE, "scripts/managed-drift-lint.mjs")], { cwd: dir, encoding: "utf8" });
    assert.equal(clean.status, 0, clean.stdout + clean.stderr);

    // ...and fails the moment a managed enforcement file is edited.
    const target = path.join(dir, "scripts/checks-lint.mjs");
    fs.appendFileSync(target, "\n// sneaky weakening edit\n");
    const drifted = spawnSync(process.execPath, [path.join(SOURCE, "scripts/managed-drift-lint.mjs")], { cwd: dir, encoding: "utf8" });
    assert.equal(drifted.status, 1, "drift after editing a managed file should fail");
    assert.match(drifted.stdout + drifted.stderr, /checks-lint\.mjs/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("install replaces the npm-default test placeholder so npm test exits 0", () => {
  const dir = freshTarget();
  try {
    sync(dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    assert.doesNotMatch(pkg.scripts.test, /no test specified/, "the npm-default placeholder should be replaced");
    const r = spawnSync("npm", ["test"], { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, `npm test should exit 0 at baseline:\n${r.stdout}${r.stderr}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
