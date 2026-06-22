#!/usr/bin/env node
// design-token-lint: documented design tokens must exist in the implemented CSS.
//
// Triple-gated skip: (a) no wiki/design-system/tokens.md; (b) the doc declares
// zero `--custom-properties` (a scaffold / prose-only intent — nothing
// machine-checkable to enforce); (c) no CSS is discovered. CSS discovery is
// generic, never hardcoded filenames: first any `*.css` path named in
// wiki/design-system/*.md (explicit traceability), then a walk of
// committableFiles() for `.css` outside documentation dirs. The presence test
// uses a trailing negative-lookahead boundary so `--color` does not spuriously
// match `--color-primary`. Only `--custom-properties` are enforced — the
// unambiguous, machine-checkable contract.
import path from "node:path";
import { walk, readText, parseFrontmatter, committableFiles } from "./lib/wiki.mjs";

const ROOT = process.cwd();
const WIKI = path.join(ROOT, "wiki");
const TOKENS_DOC = path.join(WIKI, "design-system", "tokens.md");
const NON_SOURCE = ["wiki/", "docs/", "templates/", "examples/", "schemas/", "intake/", "node_modules/", ".product-wiki/", ".git/"];
const relOf = (f) => path.relative(ROOT, f).split(path.sep).join("/");

function declaredTokens(text) {
  const n = new Set();
  for (const m of text.matchAll(/--[A-Za-z0-9][A-Za-z0-9_-]*/g)) n.add(m[0]);
  return n;
}

const tokensText = readText(TOKENS_DOC);
if (!tokensText) {
  console.log("design-token-lint skipped: no wiki/design-system/tokens.md.");
  process.exit(0);
}
const { body } = parseFrontmatter(tokensText);
const tokens = declaredTokens(body);
if (tokens.size === 0) {
  console.log("design-token-lint skipped: tokens doc declares no --custom-properties to enforce.");
  process.exit(0);
}

const cssFiles = new Set();
for (const file of walk(path.join(WIKI, "design-system"), (f) => f.endsWith(".md"))) {
  const t = readText(file);
  for (const m of t.matchAll(/[\w./-]+\.css\b/g)) {
    const c = path.resolve(ROOT, m[0]);
    if (readText(c)) cssFiles.add(c);
  }
}
for (const file of committableFiles(ROOT)) {
  if (path.extname(file) !== ".css") continue;
  const rel = relOf(file);
  if (NON_SOURCE.some((p) => rel.startsWith(p))) continue;
  cssFiles.add(file);
}
if (cssFiles.size === 0) {
  console.log("design-token-lint skipped: no UI detected (no .css source files).");
  process.exit(0);
}

let css = "";
for (const file of [...cssFiles].sort()) css += "\n" + readText(file);

const missing = [];
for (const token of [...tokens].sort()) {
  const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-z0-9_-])");
  if (!re.test(css)) missing.push(token);
}

if (missing.length) {
  const where = [...cssFiles].map(relOf).sort().join(", ");
  console.error(`design-token-lint failed with ${missing.length} documented token(s) absent from CSS (${where}):`);
  for (const t of missing) console.error(`- ${t}: declared in wiki/design-system/tokens.md but not found in any CSS.`);
  process.exit(1);
}
console.log(`design-token-lint passed: ${tokens.size} documented token(s) all present across ${cssFiles.size} CSS file(s).`);
