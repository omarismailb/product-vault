#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, ".codex-plugin/plugin.json");
const errors = [];

function fail(message) {
  errors.push(message);
}

if (!fs.existsSync(MANIFEST)) {
  console.log("plugin-lint skipped: .codex-plugin/plugin.json is not installed in this repo.");
  process.exit(0);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
} catch (error) {
  console.error(`.codex-plugin/plugin.json is invalid JSON: ${error.message}`);
  process.exit(1);
}

if (!manifest.name || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(manifest.name)) {
  fail("plugin name must be kebab-case and 1-64 characters");
}

if (!manifest.version || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(manifest.version)) {
  fail("plugin version must be semver");
}

if (!manifest.description || manifest.description.length > 160) {
  fail("plugin description is required and should be concise");
}

if (!manifest.license) fail("plugin license is required");
if (!manifest.repository || !/^https:\/\/github\.com\//.test(manifest.repository)) {
  fail("plugin repository must be a GitHub https URL");
}

if (!manifest.author?.name) fail("plugin author.name is required");

if (manifest.skills) {
  if (typeof manifest.skills !== "string" || !manifest.skills.startsWith("./")) {
    fail("plugin skills path must be a ./-prefixed relative path");
  } else {
    const skillsPath = path.resolve(ROOT, manifest.skills);
    if (!skillsPath.startsWith(ROOT) || !fs.existsSync(skillsPath)) {
      fail(`plugin skills path does not exist inside repo: ${manifest.skills}`);
    }
  }
}

const ui = manifest.interface || {};
for (const key of ["displayName", "shortDescription", "longDescription", "developerName", "category"]) {
  if (!ui[key]) fail(`plugin interface.${key} is required`);
}

if (Array.isArray(ui.defaultPrompt) && ui.defaultPrompt.length > 3) {
  fail("plugin interface.defaultPrompt should include at most 3 prompts");
}

for (const prompt of ui.defaultPrompt || []) {
  if (prompt.length > 128) fail("plugin default prompts must be 128 characters or fewer");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("plugin-lint passed.");
