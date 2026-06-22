#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SOURCE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const write = args.includes("--write");
const targetIndex = args.indexOf("--target");
const targetArg = targetIndex >= 0 ? args[targetIndex + 1] : null;

if (!targetArg || args.includes("--help")) {
  console.log(`Usage:
  node scripts/sync-managed.mjs --target <repo>
  node scripts/sync-managed.mjs --target <repo> --write

Default mode is a dry run.
The script copies managed Product Wiki files, creates missing starter files, and stages merge-required files under .product-wiki/incoming when a target already exists.`);
  process.exit(targetArg ? 0 : 1);
}

const TARGET = path.resolve(targetArg);
if (!fs.existsSync(TARGET) || !fs.statSync(TARGET).isDirectory()) {
  console.error(`Target does not exist or is not a directory: ${TARGET}`);
  process.exit(1);
}

const initiallyExisting = new Set(
  ["AGENTS.md", "CLAUDE.md"].filter((rel) => fs.existsSync(path.join(TARGET, rel))),
);

if (write && TARGET === SOURCE) {
  console.error("Refusing to sync Product Wiki into itself. Use a different --target.");
  process.exit(1);
}

const manifestPath = path.join(SOURCE, "product-wiki.json");
if (!fs.existsSync(manifestPath)) {
  console.error("product-wiki.json not found. Run this from the Product Wiki source repo.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const planned = [];

const ROUTING_BLOCKS = {
  "AGENTS.md": `<!-- product-wiki-routing:start -->
## Product Wiki Routing

For non-trivial product requests, feature ideas, bug reports, workflow changes, product questions, and retrofit tasks, route through Product Wiki before implementation.

- Create or update a proposal in \`intake/proposals/\`.
- Do not write application code until the proposal is approved.
- After approval, apply the wiki change, then compile it into checks, implementation, and verification.
- Use repo skills from \`.agents/skills\`: \`propose-change\`, \`apply-wiki-change\`, \`compile-change\`, \`generate-checks\`, \`reconcile-wiki\`, \`import-codebase\`, and \`review-architecture\`.
- Read \`wiki/overview.md\` before drilling into smaller wiki units.
- Link units with relative markdown links (\`[Label](../type/slug.md)\`), not \`[[wikilinks]]\`, so they render on GitHub too.
- The wiki is natural language and holds no code; code traces back to it via \`PW:<id>\` anchors, \`.product-wiki/source-map.json\`, and \`checks/manifest.json\`.
- When searching code, check \`PW:\` wiki anchors first, then use normal search.
- Before finishing, run \`node scripts/product-wiki-check.mjs\` and the repo's normal test command.

The user should not need to name Product Wiki or a skill for ordinary product work.
<!-- product-wiki-routing:end -->`,
  "CLAUDE.md": `<!-- product-wiki-routing:start -->
## Product Wiki Routing

Follow the Product Wiki routing block in \`AGENTS.md\`.
For non-trivial product requests, use the mirrored skills in \`.claude/skills\` and do not write application code until the product wiki proposal is approved.
Use reviewer subagents from \`.claude/agents\` only when separate context helps.
Read \`wiki/overview.md\` before drilling into smaller wiki units.
When searching code, check \`PW:\` wiki anchors first, then use normal search.
The wiki holds no code; code links back to it via \`PW:\` anchors and \`checks/manifest.json\`. Link units with relative markdown links, not \`[[wikilinks]]\`.
<!-- product-wiki-routing:end -->`,
};

const ROUTING_START = "<!-- product-wiki-routing:start -->";
const ROUTING_END = "<!-- product-wiki-routing:end -->";

// Greenfield routed docs: when AGENTS.md/CLAUDE.md do not yet exist in the
// target, we must NOT raw-copy the harness's own marker-less file (a later sync
// could then never maintain the routing block). Instead write a minimal
// user-owned stub plus the exact marked routing block, so every subsequent sync
// can keep the routing instructions current via upsertRoutingBlock.
const GREENFIELD_STUBS = {
  "AGENTS.md": "# AGENTS.md\n\nProject-specific agent instructions for this repo. Edit freely above the Product Wiki routing block below.\n",
  "CLAUDE.md": "# CLAUDE.md\n\nProject-specific Claude Code instructions for this repo. Edit freely above the Product Wiki routing block below.\n",
};
const ROUTED_DOCS = new Set(Object.keys(GREENFIELD_STUBS));

function listFiles(rel) {
  const full = path.join(SOURCE, rel);
  if (!fs.existsSync(full)) return [];
  const stat = fs.lstatSync(full);
  if (stat.isFile() || stat.isSymbolicLink()) return [rel];
  const out = [];
  const entries = fs.readdirSync(full, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const child = path.join(rel, entry.name);
    const childFull = path.join(SOURCE, child);
    const childStat = fs.lstatSync(childFull);
    if (childStat.isDirectory()) out.push(...listFiles(child));
    else out.push(child);
  }
  return out;
}

function sameFile(source, target) {
  if (!fs.existsSync(target)) return false;
  const srcStat = fs.lstatSync(source);
  const tgtStat = fs.lstatSync(target);
  if (srcStat.isSymbolicLink()) {
    return tgtStat.isSymbolicLink() && fs.readlinkSync(source) === fs.readlinkSync(target);
  }
  if (!srcStat.isFile() || !tgtStat.isFile()) return false;
  return fs.readFileSync(source).equals(fs.readFileSync(target));
}

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const sourceChild = path.join(sourceDir, entry.name);
    const targetChild = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourceChild, targetChild);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourceChild, targetChild);
    }
  }
}

function copyOne(rel, action) {
  const sourceRel = rel === "checks/manifest.json" && action === "create-starter"
    ? "templates/checks-manifest-starter.json"
    : rel;
  const source = path.join(SOURCE, sourceRel);
  const target = path.join(TARGET, rel);
  const sourceStat = fs.lstatSync(source);
  planned.push({ action, path: rel });
  if (!write) return;

  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (sourceStat.isSymbolicLink()) {
    const resolved = fs.realpathSync(source);
    const sourceReal = fs.realpathSync(SOURCE);
    // Never follow a symlink whose target escapes the package, since a tampered
    // package could otherwise place or delete files anywhere under the target.
    if (resolved !== sourceReal && !resolved.startsWith(sourceReal + path.sep)) {
      console.error(`Refusing to copy symlink whose target escapes the package: ${rel} -> ${resolved}`);
      process.exit(1);
    }
    if (fs.existsSync(target)) fs.rmSync(target, { force: true, recursive: true });
    if (fs.statSync(resolved).isDirectory()) {
      copyDirectory(resolved, target);
    } else {
      fs.symlinkSync(fs.readlinkSync(source), target);
    }
    return;
  }
  fs.copyFileSync(source, target);
}

function stageIncoming(rel) {
  const source = path.join(SOURCE, rel);
  const incoming = path.join(TARGET, ".product-wiki/incoming", rel);
  planned.push({ action: "merge-required", path: rel, incoming: path.relative(TARGET, incoming) });
  if (!write) return;

  fs.mkdirSync(path.dirname(incoming), { recursive: true });
  if (fs.lstatSync(source).isFile()) {
    fs.copyFileSync(source, incoming);
  }
}

function createGreenfieldRoutedDoc(rel) {
  const block = ROUTING_BLOCKS[rel];
  const stub = GREENFIELD_STUBS[rel];
  if (!block || !stub) { copyOne(rel, "create-merge-file"); return; }
  planned.push({ action: "create-routed-doc", path: rel });
  if (!write) return;
  const target = path.join(TARGET, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${stub.trimEnd()}\n\n${block}\n`);
}

function upsertRoutingBlock(rel) {
  if (!initiallyExisting.has(rel)) return;
  const target = path.join(TARGET, rel);
  const block = ROUTING_BLOCKS[rel];
  if (!block || !fs.existsSync(target)) return;

  const current = fs.readFileSync(target, "utf8");
  const start = current.indexOf(ROUTING_START);
  const end = current.indexOf(ROUTING_END);

  if (start !== -1 && end !== -1 && end > start) {
    const existingBlock = current.slice(start, end + ROUTING_END.length);
    if (existingBlock === block) {
      planned.push({ action: "routing-block-unchanged", path: rel });
      return;
    }

    planned.push({ action: "update-routing-block", path: rel });
    if (!write) return;

    const next = `${current.slice(0, start).trimEnd()}\n\n${block}\n${current.slice(end + ROUTING_END.length).trimStart()}`;
    fs.writeFileSync(target, next.endsWith("\n") ? next : `${next}\n`);
    return;
  }

  planned.push({ action: "activate-routing-block", path: rel });
  if (!write) return;

  const next = `${current.trimEnd()}\n\n${block}\n`;
  fs.writeFileSync(target, next);
}

function mergePackageScripts() {
  const target = path.join(TARGET, "package.json");
  if (!fs.existsSync(target)) {
    planned.push({ action: "skip-package-scripts: no package.json", path: "package.json" });
    return;
  }
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    planned.push({ action: "skip-package-scripts: invalid JSON", path: "package.json" });
    return;
  }
  // Collision-free namespace so we never clobber the repo's own scripts.
  const desired = {
    "pw:check": "node scripts/product-wiki-check.mjs",
    "pw:doctor": "node scripts/doctor.mjs",
    "pw:checks": "node scripts/checks-lint.mjs",
    "pw:checks-run": "node scripts/checks-lint.mjs --run",
    "pw:overview": "node scripts/wiki-overview-lint.mjs",
    "pw:lifecycle": "node scripts/lifecycle-lint.mjs",
    "pw:intent": "node scripts/intent-lint.mjs",
    "pw:wiki-anchors": "node scripts/wiki-anchor-lint.mjs",
    "pw:source-map": "node scripts/wiki-anchor-lint.mjs --write-report",
    "pw:ratchet": "node scripts/ratchet-lint.mjs",
    "pw:wiki-links": "node scripts/wiki-link-lint.mjs",
    "pw:wiki-retired-links": "node scripts/wiki-retired-link-lint.mjs",
    "pw:managed-drift": "node scripts/managed-drift-lint.mjs",
    "pw:import-coverage": "node scripts/import-coverage.mjs",
    "pw:routines": "node scripts/routine-runner.mjs --all",
    "pw:repair": "node scripts/repair-contracts.mjs --write",
    "pw:self-test": "node scripts/self-test.mjs",
  };
  pkg.scripts = pkg.scripts || {};
  const added = [];
  const conflicts = [];
  for (const [key, value] of Object.entries(desired)) {
    if (!(key in pkg.scripts)) {
      pkg.scripts[key] = value;
      added.push(key);
    } else if (pkg.scripts[key] !== value) {
      conflicts.push({ key, expected: value, actual: pkg.scripts[key] });
    }
  }
  for (const c of conflicts) {
    console.warn(
      `WARNING: package.json already defines "${c.key}" = ${JSON.stringify(c.actual)}, ` +
        `which differs from the Product Wiki command ${JSON.stringify(c.expected)}. ` +
        `Leaving the existing value untouched. The Product Wiki gate may be unwired. ` +
        `Reconcile this key (or run \`node scripts/doctor.mjs\` to cross-check) before relying on the gate.`,
    );
    planned.push({ action: `package-scripts-conflict: ${c.key}`, path: "package.json" });
  }
  // Replace the npm-default test placeholder (which exits 1) so `npm test` is
  // green at baseline. The first compile-change overwrites this with a real
  // `node --test` command. Only the exact npm-init placeholder is touched; a
  // real test script the repo already defines is left alone.
  const NPM_DEFAULT_TEST = 'echo "Error: no test specified" && exit 1';
  let testReplaced = false;
  if (pkg.scripts.test === NPM_DEFAULT_TEST) {
    pkg.scripts.test = "echo 'no product tests yet; the first compile-change adds them' && exit 0";
    testReplaced = true;
    planned.push({ action: "replace-default-test-script", path: "package.json" });
  }

  if (added.length === 0 && !testReplaced) {
    planned.push({ action: "package-scripts-unchanged", path: "package.json" });
    return;
  }
  if (added.length) planned.push({ action: `add-package-scripts: ${added.join(", ")}`, path: "package.json" });
  if (write) fs.writeFileSync(target, `${JSON.stringify(pkg, null, 2)}\n`);
}

// The target's declared committer, used to seed an approvers allow-list so the
// approval gate is enforced by default instead of advisory. Returns "" when git
// or a configured name is unavailable (then doctor warns that approval is
// advisory until approvers is set).
function gitUserName() {
  const r = spawnSync("git", ["config", "user.name"], { cwd: TARGET, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
}

// sha256 of every managed_core file actually on disk in the target, so
// managed-drift-lint can detect an in-place edit of a harness enforcement file.
// Keys are repo-relative posix paths.
function digestManagedCore() {
  const digests = {};
  const walkTarget = (rel) => {
    const abs = path.join(TARGET, rel);
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
      digests[rel] = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
      return;
    }
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(abs).sort()) {
        if (name === ".git" || name === "node_modules") continue;
        walkTarget(`${rel}/${name}`);
      }
    }
  };
  for (const rel of manifest.ownership.managed_core || []) walkTarget(rel);
  return digests;
}

// Upgrade migration: v1.6.0 added wiki/overview.md plus a lint requiring the
// user-owned wiki/index.md to link to it. A repo installed before 1.6.0 has an
// index without that link, so the documented upgrade would turn its check red.
// Append the link once (a minimal, guarded edit of the user-owned index).
function migrateIndexOverviewLink() {
  const index = path.join(TARGET, "wiki/index.md");
  const overview = path.join(TARGET, "wiki/overview.md");
  if (!fs.existsSync(index) || !fs.existsSync(overview)) return;
  const text = fs.readFileSync(index, "utf8");
  if (/\]\((?:\.\/)?overview\.md\)|\[\[wiki\.overview\]\]/.test(text)) return;
  planned.push({ action: "migrate-index-overview-link", path: "wiki/index.md" });
  if (!write) return;
  fs.writeFileSync(index, `${text.trimEnd()}\n\n- Overview: [[wiki.overview]]\n`);
}

function mirrorClaudeSkills() {
  // .claude/skills mirrors .agents/skills. The source uses symlinks, but npm
  // packaging (and some copy methods) strip symlinks, so always reconstruct the
  // mirror from .agents/skills (the real content), both on install and upgrade.
  const agentsSkills = path.join(SOURCE, ".agents/skills");
  if (!fs.existsSync(agentsSkills)) return;
  const entries = fs.readdirSync(agentsSkills, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    const sourceSkill = path.join(agentsSkills, name);
    const targetSkill = path.join(TARGET, ".claude/skills", name);
    if (sameTree(sourceSkill, targetSkill)) {
      planned.push({ action: "mirror-claude-skill-unchanged", path: `.claude/skills/${name}` });
      continue;
    }
    planned.push({ action: "mirror-claude-skill", path: `.claude/skills/${name}` });
    if (!write) continue;
    fs.rmSync(targetSkill, { force: true, recursive: true });
    copyDirectory(sourceSkill, targetSkill);
  }
}

function sameTree(sourceDir, targetDir) {
  if (!fs.existsSync(targetDir)) return false;
  let bailed = false;
  const listRegular = (dir) => {
    const out = [];
    const walkDir = (cur, rel) => {
      const dirents = fs.readdirSync(cur, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const d of dirents) {
        const childRel = rel ? `${rel}/${d.name}` : d.name;
        const childFull = path.join(cur, d.name);
        if (d.isDirectory()) walkDir(childFull, childRel);
        else if (d.isFile()) out.push(childRel);
        else { bailed = true; return; }
      }
    };
    try { walkDir(dir, ""); } catch { bailed = true; }
    return out;
  };
  const srcFiles = listRegular(sourceDir);
  const tgtFiles = listRegular(targetDir);
  if (bailed) return false;
  const srcSorted = [...srcFiles].sort();
  const tgtSorted = [...tgtFiles].sort();
  if (srcSorted.length !== tgtSorted.length) return false;
  for (let i = 0; i < srcSorted.length; i += 1) if (srcSorted[i] !== tgtSorted[i]) return false;
  for (const rel of srcSorted) {
    const a = fs.readFileSync(path.join(sourceDir, rel));
    const b = fs.readFileSync(path.join(targetDir, rel));
    if (!a.equals(b)) return false;
  }
  return true;
}

function syncPath(rel, mode) {
  for (const file of listFiles(rel)) {
    const source = path.join(SOURCE, file);
    const target = path.join(TARGET, file);
    if (mode === "replace") {
      if (!sameFile(source, target)) copyOne(file, fs.existsSync(target) ? "update-managed" : "create-managed");
      continue;
    }
    if (mode === "create_if_missing") {
      if (!fs.existsSync(target)) copyOne(file, "create-starter");
      else planned.push({ action: "skip-existing-user-owned", path: file });
      continue;
    }
    if (mode === "merge_required") {
      if (!fs.existsSync(target)) {
        if (ROUTED_DOCS.has(file)) createGreenfieldRoutedDoc(file);
        else copyOne(file, "create-merge-file");
      } else if (!sameFile(source, target)) {
        stageIncoming(file);
      } else {
        planned.push({ action: "unchanged", path: file });
      }
    }
  }
}

for (const rel of manifest.ownership.managed_core || []) syncPath(rel, "replace");
for (const rel of manifest.ownership.create_if_missing || []) syncPath(rel, "create_if_missing");
for (const rel of manifest.ownership.merge_required || []) syncPath(rel, "merge_required");
mirrorClaudeSkills();
migrateIndexOverviewLink();
upsertRoutingBlock("AGENTS.md");
upsertRoutingBlock("CLAUDE.md");
mergePackageScripts();

const installRecord = {
  name: manifest.name,
  version: manifest.version,
  repository: manifest.repository,
  installed_at: new Date().toISOString(),
  note: "Local product wiki, proposals, app code, and app tests remain owned by this repo.",
};

planned.push({ action: "write-install-record", path: "product-wiki.json" });
if (write) {
  const targetManifest = path.join(TARGET, "product-wiki.json");
  // Preserve a user-customized approvers list across upgrades; seed from the
  // git identity only on a first install (or when the list was cleared).
  let existing = null;
  try {
    existing = JSON.parse(fs.readFileSync(targetManifest, "utf8"));
  } catch {
    existing = null;
  }
  const approvers = Array.isArray(existing?.approvers) && existing.approvers.length
    ? existing.approvers
    : (gitUserName() ? [gitUserName()] : null);
  if (approvers) installRecord.approvers = approvers;
  installRecord.managed_digests = digestManagedCore();
  fs.writeFileSync(targetManifest, `${JSON.stringify(installRecord, null, 2)}\n`);
}

console.log(write ? "Product Wiki sync applied." : "Product Wiki sync plan.");
for (const item of planned) {
  const suffix = item.incoming ? ` -> ${item.incoming}` : "";
  console.log(`- ${item.action}: ${item.path}${suffix}`);
}

if (!write) {
  console.log("\nDry run only. Add --write to apply.");
}
