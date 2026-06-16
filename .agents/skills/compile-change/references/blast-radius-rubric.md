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

## Stop conditions

Stop and ask before writing code if:

- The approved proposal does not identify acceptance criteria.
- The change appears to duplicate an existing capability.
- A refactor is needed before the feature can be added safely.
- The change crosses a trust boundary without a security decision.
- Data migration or backward compatibility is unclear.
- No executable or manual verification path exists.
