// Shared helpers for the harness script unit tests.
//
// Each test builds a throwaway repo in a temp dir, runs a real harness script
// against it with cwd set to that dir (so the script's process.cwd() ROOT is the
// fixture), and asserts on the exit code and combined output. No mocks: the
// scripts run for real.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../scripts");

export function tmpRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pw-unit-"));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

export function runScript(script, dir, args = []) {
  const r = spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args], {
    cwd: dir,
    encoding: "utf8",
  });
  return { status: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

export function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// A real (passing) node:test file, so an executable check's anti-theatre guard
// (the referenced test file must exist) is satisfied without running it.
export const PASSING_TEST_FILE = `import { test } from "node:test";
import assert from "node:assert/strict";
test("ac.feature.kept", () => { assert.equal(1, 1); });
`;
