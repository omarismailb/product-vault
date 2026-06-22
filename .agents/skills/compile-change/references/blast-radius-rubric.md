# Blast Radius Rubric

Use this before compiling an approved wiki change into code.

## Light path

Use for:

- Copy changes.
- Small visual tweaks with no product behaviour change.
- Mechanical renames.
- Test-only changes that do not alter product intent.

Expected flow:

1. Make the edit.
2. Run relevant checks.
3. Report evidence.

## Full path

Use for anything that affects:

- User behaviour.
- Product rules.
- Data shape or persistence.
- Permissions, auth, billing, privacy, or trust boundaries.
- Multiple modules.
- Public API contracts.
- Design system conventions.
- Existing capabilities that may need reuse or refactor.

Expected flow:

1. Confirm approved wiki change.
2. Locate blast radius.
3. Decide reuse or refactor.
4. Add or link executable checks.
5. Implement smallest coherent change.
6. Run checks.
7. Reconcile wiki links, check manifest, and decisions.

## Executable check commands

When you register a runnable command for each acceptance criterion:

- Put product tests under `tests/` (the directory the harness ships). An executable check's command must name a real test file, e.g. `node --test --test-name-pattern='^ac.your-id$' tests/your.test.mjs`.
- Single-quote any `--test-name-pattern` that contains a regex anchor such as `$`. The command runner rejects an unquoted `$` as a shell expansion, so `'^ac.your-id$'` works and `^ac.your-id$` does not.
- If you add a repo `test` script, use a glob (`node --test tests/*.test.mjs`), not the bare directory form (`node --test tests/`), which fails on some Node versions.

## Design system lint cascade

Adding ANY UI file (`.html`, `.css`, `.tsx`, and so on) turns on `design-lint` and `design-token-lint`.

From that point every `wiki/design-system/` unit must be real, meaning not the shipped scaffold, at least ~120 characters, and referenced by a journey, capability, or component.

Any CSS custom property you document in `wiki/design-system/tokens.md` must also appear in the CSS.

Budget for filling in the design system when you introduce UI, or keep the change UI-free.

## Stop conditions

Stop and ask before writing code if:

- The approved proposal does not identify acceptance criteria.
- The change appears to duplicate an existing capability.
- A refactor is needed before the feature can be added safely.
- The change crosses a trust boundary without a security decision.
- Data migration or backward compatibility is unclear.
- No executable or manual verification path exists.
