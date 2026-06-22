#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { committableFiles } from "./lib/wiki.mjs";

const ROOT = process.cwd();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Local machine paths leaking into committed files. THIS machine's home dir is a
// hard error (a real, non-portable leak). A generic foreign absolute home path
// is an error in code/config (where a hardcoded path is a real bug) but only a
// warning elsewhere (docs and examples legitimately quote home paths). The
// patterns are described in prose here rather than written as a literal example
// so this scan does not flag its own source file.
const OWN_HOME_PATTERN = new RegExp(escapeRegExp(os.homedir()) + "(/|\\\\|$)");
const FOREIGN_HOME_PATTERNS = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//,
  /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/,
];
const CODE_CONFIG_EXTENSIONS = new Set([
  ".c", ".cc", ".clj", ".cpp", ".cs", ".css", ".go", ".h", ".html", ".java",
  ".js", ".jsx", ".kt", ".mjs", ".cjs", ".php", ".py", ".rb", ".rs", ".scss",
  ".sql", ".svelte", ".swift", ".ts", ".tsx", ".vue", ".json", ".jsonc",
  ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf", ".sh", ".bash", ".zsh",
]);

// Format-keyed secret detectors. Each matches a structurally distinctive token
// SHAPE (prefix + charset + min length), never a value lifted from a fixture, so
// it generalises to any real credential of that format.
const SECRET_PATTERNS = [
  [/\bAQ\.A[A-Za-z0-9_-]{8,}/, "Anthropic-style key (AQ.A...)"],
  [/\bsk-(?:ant-)?[A-Za-z0-9_-]{16,}/, "secret key (sk-...)"],
  [/\bAIza[A-Za-z0-9_-]{20,}/, "Google API key (AIza...)"],
  [/\bghp_[A-Za-z0-9]{20,}/, "GitHub personal access token (ghp_...)"],
  [/\bgho_[A-Za-z0-9]{20,}/, "GitHub OAuth token (gho_...)"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, "Slack token (xox...)"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key id (AKIA...)"],
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, "private key block"],
];

// VCS/dependency/staging plus common build/output dirs. Skipped by doctor's own
// walk() and dropped from the committable scan (which covers the lib-walk
// fallback outside a git repo) so generated artifacts are never scanned.
const IGNORED_DIRS = new Set([
  ".git", "node_modules", ".product-wiki", ".next", "dist", "build",
  "coverage", ".turbo", ".cache", "tmp", ".vercel", ".svelte-kit", "out",
]);
function inIgnoredDir(rel) {
  return rel.split(/[\\/]/).some((segment) => IGNORED_DIRS.has(segment));
}

const ROUTING_MARKER = "product-wiki-routing:start";
const errors = [];
const warnings = [];
const validated = [];
let scanned = 0;

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch (error) {
    errors.push(`${rel}: invalid or unreadable JSON (${error.message})`);
    return null;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (IGNORED_DIRS.has(entry.name)) continue;
    if (entry.isDirectory()) out.push(...walk(full));
    if (entry.isFile()) out.push(full);
    if (entry.isSymbolicLink()) {
      try {
        if (fs.statSync(full).isFile()) out.push(full);
      } catch {
        warnings.push(`${path.relative(ROOT, full)}: broken symlink`);
      }
    }
  }
  return out;
}

const commonRequired = [
  "AGENTS.md",
  "CLAUDE.md",
  "CONSTITUTION.md",
  "product-wiki.json",
  ".agents/skills/propose-change/SKILL.md",
  ".agents/skills/import-codebase/SKILL.md",
  ".agents/skills/compile-change/SKILL.md",
  ".agents/skills/apply-wiki-change/SKILL.md",
  ".agents/skills/generate-checks/SKILL.md",
  ".agents/skills/reconcile-wiki/SKILL.md",
  ".agents/skills/review-architecture/SKILL.md",
  "checks/manifest.json",
  "scripts/wiki-lint.mjs",
  "scripts/wiki-overview-lint.mjs",
  "scripts/wiki-anchor-lint.mjs",
  "scripts/proposal-lint.mjs",
  "scripts/proposal-traceability-lint.mjs",
  "scripts/checks-lint.mjs",
  "scripts/lifecycle-lint.mjs",
  "scripts/intent-lint.mjs",
  "scripts/ratchet-lint.mjs",
  "scripts/skill-lint.mjs",
  "scripts/template-lint.mjs",
  "scripts/wiki-link-lint.mjs",
  "scripts/import-coverage.mjs",
  "scripts/eval-golden.mjs",
  "scripts/hook-loop.mjs",
  "scripts/plugin-lint.mjs",
  "scripts/product-wiki-check.mjs",
  "scripts/repair-contracts.mjs",
  "scripts/routine-runner.mjs",
  "scripts/sync-managed.mjs",
  "scripts/doctor.mjs",
  "templates/proposal-template.md",
  "templates/wiki-overview-template.md",
  "templates/wiki-unit-template.md",
  "templates/compiler-plan-template.md",
  "templates/import-inventory-template.md",
  "templates/import-proposal-template.md",
  "templates/check-manifest-entry.json",
  "templates/checks-manifest-starter.json",
  "routines/manifest.json",
  "wiki/index.md",
  "wiki/overview.md",
  "wiki/log.md",
];

const sourceRequired = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "SUPPORT.md",
  "VERSION",
  "CHANGELOG.md",
  ".codex-plugin/plugin.json",
  "package.json",
];

const manifest = readJson("product-wiki.json");
const isSourceRepo = Boolean(manifest?.ownership);
const required = isSourceRepo ? [...commonRequired, ...sourceRequired] : commonRequired;

for (const rel of required) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}
validated.push(`${required.length} required harness file(s) present`);

if (manifest) {
  if (isSourceRepo) {
    const versionFile = exists("VERSION") ? fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim() : null;
    if (versionFile && manifest.version !== versionFile) {
      errors.push(`VERSION (${versionFile}) does not match product-wiki.json (${manifest.version})`);
    }
    for (const pluginRel of [".claude-plugin/plugin.json", ".codex-plugin/plugin.json"]) {
      const plugin = exists(pluginRel) ? readJson(pluginRel) : null;
      if (versionFile && plugin && plugin.version !== versionFile) {
        errors.push(`${pluginRel} version (${plugin.version}) does not match VERSION (${versionFile})`);
      }
    }
    for (const section of ["managed_core", "merge_required", "create_if_missing", "user_owned", "source_only"]) {
      if (!Array.isArray(manifest.ownership?.[section])) {
        errors.push(`product-wiki.json missing ownership.${section} array`);
        continue;
      }
      for (const rel of manifest.ownership[section]) {
        if (rel === "application code" || rel === "application tests") continue;
        if (!exists(rel)) errors.push(`product-wiki.json ownership.${section} path does not exist: ${rel}`);
      }
    }
    validated.push("product-wiki.json ownership manifest shape verified");
  } else {
    for (const key of ["name", "version", "repository", "installed_at"]) {
      if (!manifest[key]) errors.push(`installed product-wiki.json missing ${key}`);
    }
    if (exists("AGENTS.md")) {
      const agentsText = fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8");
      const hasFullContract = agentsText.includes("This repo is a product-wiki harness");
      const hasRoutingBlock = agentsText.includes(ROUTING_MARKER);
      if (!hasFullContract && !hasRoutingBlock) {
        errors.push("AGENTS.md does not activate Product Wiki routing");
      }
    }
    if (exists("CLAUDE.md")) {
      const claudeText = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
      const hasFullContract = claudeText.includes("Claude Code should use the same workflow as Codex");
      const hasRoutingBlock = claudeText.includes(ROUTING_MARKER);
      if (!hasFullContract && !hasRoutingBlock) {
        errors.push("CLAUDE.md does not activate Product Wiki routing");
      }
    }
    if (!Array.isArray(manifest.approvers) || manifest.approvers.length === 0) {
      warnings.push(
        'product-wiki.json has no "approvers": proposal approval is advisory, so any identity can self-approve. ' +
          'Add an "approvers" list (a name or email) to enforce approver identity in proposal-lint.',
      );
    }
    validated.push("installed product-wiki.json + routing activation verified");
  }
}

if (readJson("checks/manifest.json")) validated.push("checks/manifest.json parses as JSON");
if (exists("package.json") && readJson("package.json")) validated.push("package.json parses as JSON");

// git-required guard: many modes (Stop-hook loop, ratchet baseline, wiki-anchor
// git mode) assume git. Outside git the path/secret scans fall back to a full
// filesystem walk with no .gitignore scoping; warn (don't fail) so a fresh
// checkout before `git init` and CI shallow checkouts still pass.
const gitProbe = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: ROOT, encoding: "utf8" });
const isGitRepo = gitProbe.status === 0 && String(gitProbe.stdout).trim() === "true";
if (!isGitRepo) {
  warnings.push(
    "not a git repository (or git is unavailable). The Stop-hook loop, ratchet baseline, and wiki-anchor git mode depend on git; the path/secret scans fall back to a full filesystem walk and may miss .gitignore scoping. Run `git init` and commit.",
  );
} else {
  validated.push("git repository detected");
}

// Only scan files that would actually be committed (tracked or untracked but
// not git-ignored). This avoids false positives on local scratch and reports,
// and falls back to a full walk outside a git repo. Generated build dirs are
// dropped (inIgnoredDir) so the out-of-git fallback does not scan artifacts.
for (const file of committableFiles(ROOT)) {
  const rel = path.relative(ROOT, file);
  if (rel.startsWith(".product-wiki/") || inIgnoredDir(rel)) continue;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.includes("\u0000")) continue; // skip binary files (a byte sequence can false-match a path)
  scanned += 1;
  if (OWN_HOME_PATTERN.test(text)) {
    errors.push(`${rel}: contains this machine's home path (local machine path leak)`);
  } else if (FOREIGN_HOME_PATTERNS.some((pattern) => pattern.test(text))) {
    const ext = path.extname(rel).toLowerCase();
    if (CODE_CONFIG_EXTENSIONS.has(ext)) errors.push(`${rel}: contains a hardcoded absolute home path`);
    else warnings.push(`${rel}: quotes an absolute home path (ok in docs, verify it is intentional)`);
  }
  const base = path.basename(rel);
  const isEnvSecret = base === ".env" || (base.startsWith(".env.") && base !== ".env.example");
  if (!isEnvSecret) {
    for (const [pattern, label] of SECRET_PATTERNS) {
      if (pattern.test(text)) {
        errors.push(`${rel}: contains what looks like a committed secret (${label})`);
        break;
      }
    }
  }
}
validated.push(`${scanned} committable file(s) scanned for local paths and secrets`);

// Engine drift: warn (don't fail) when the running Node major is below the
// declared minimum, so an opaque test failure becomes a clear message instead.
if (exists("package.json")) {
  const pkg = readJson("package.json");
  const engineRange = pkg?.engines?.node;
  const min = engineRange && /(\d+)/.exec(engineRange)?.[1];
  const runningMajor = Number(process.version.replace(/^v/, "").split(".")[0]);
  if (min && runningMajor < Number(min)) {
    warnings.push(`Node ${process.version} is below the declared engines.node "${engineRange}"; results may be unreliable.`);
  }
}

// Gate-script integrity: whichever gate script(s) exist (check and/or pw:check)
// must invoke scripts/product-wiki-check.mjs, and at least one must exist. A
// clobbered `check: "echo skip"` (e.g. from a bad merge/sync) silently disables
// the harness's headline guarantee.
if (exists("package.json")) {
  const scripts = readJson("package.json")?.scripts || {};
  const gateScripts = ["check", "pw:check"].filter((name) => name in scripts);
  if (gateScripts.length === 0) errors.push('package.json defines no "check" or "pw:check" script to run the gate.');
  for (const name of gateScripts) {
    if (!/product-wiki-check\.mjs/.test(scripts[name])) {
      errors.push(`package.json "${name}" script does not run scripts/product-wiki-check.mjs (got: ${scripts[name]}).`);
    }
  }
  if (gateScripts.length) validated.push(`gate script(s) [${gateScripts.join(", ")}] point at product-wiki-check.mjs`);
}

// Pending managed updates: sync stages upstream versions of merge-required files
// under .product-wiki/incoming/ for review. Warn so they are not forgotten
// (e.g. removed hooks left active in .claude/settings.json after an upgrade).
const incomingDir = path.join(ROOT, ".product-wiki/incoming");
if (fs.existsSync(incomingDir)) {
  const pending = walk(incomingDir);
  if (pending.length) {
    warnings.push(
      `${pending.length} managed update(s) staged in .product-wiki/incoming/ are not merged. ` +
        `Review and reconcile them with your active files (e.g. .claude/settings.json).`,
    );
  }
}

// Every `npm run <script>` referenced in a CI workflow must resolve to a real
// package.json script. This catches the installer-name mismatch where a synced
// workflow runs `npm run check` but the target only exposes `pw:check`.
const workflowsDir = path.join(ROOT, ".github/workflows");
if (fs.existsSync(workflowsDir) && exists("package.json")) {
  const scripts = readJson("package.json")?.scripts || {};
  for (const wf of walk(workflowsDir).filter((f) => /\.ya?ml$/.test(f))) {
    // Ignore YAML comment lines so a comment that mentions "npm run x" is not
    // mistaken for a real step.
    const text = fs.readFileSync(wf, "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");
    for (const match of text.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)) {
      if (!scripts[match[1]]) {
        errors.push(`${path.relative(ROOT, wf)}: runs "npm run ${match[1]}" but package.json has no such script.`);
      }
    }
  }
  validated.push("CI workflow `npm run` references resolve to package.json scripts");
}

const claudeSkills = fs.existsSync(path.join(ROOT, ".claude/skills"))
  ? fs.readdirSync(path.join(ROOT, ".claude/skills"))
  : [];

for (const name of claudeSkills) {
  const rel = `.claude/skills/${name}`;
  const full = path.join(ROOT, rel);
  const stat = fs.lstatSync(full);
  if (!stat.isSymbolicLink() && !exists(`${rel}/SKILL.md`)) {
    warnings.push(`${rel}: expected symlink or skill directory`);
  }
}

// Run the full gate, unless doctor is itself a step inside the gate (the
// umbrella check sets PRODUCT_WIKI_IN_CHECK to prevent infinite re-entry).
if (!process.env.PRODUCT_WIKI_IN_CHECK) {
  const check = spawnSync(process.execPath, ["scripts/product-wiki-check.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (check.status !== 0) {
    errors.push("Product Wiki check failed");
    process.stderr.write(check.stderr || "");
    process.stdout.write(check.stdout || "");
  } else {
    validated.push("product-wiki-check gate passed");
  }
} else {
  validated.push("product-wiki-check gate (skipped: running inside the gate)");
}

if (warnings.length) {
  console.warn("Warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error("Doctor failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("product-wiki doctor passed. Validated:");
for (const item of validated) console.log(`- ${item}`);
