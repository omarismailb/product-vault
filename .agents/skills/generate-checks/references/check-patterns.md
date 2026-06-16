# Check Patterns

Use this when turning product wiki claims into checks.

## Check types

| Kind | Use when | Example |
|---|---|---|
| unit | Pure business logic or rule | fare difference threshold |
| integration | Multiple modules or data path | booking change creates payment intent |
| e2e | User journey matters | traveller changes flight in browser |
| lint | Structural repo rule | wiki IDs have frontmatter |
| typecheck | Interface contract | public SDK types compile |
| eval | LLM or agent output quality | import proposal contains confidence per unit |
| manual | Human judgement is required | UX copy approved by owner |

## Good checks

- Cover one wiki ID or a small related set.
- Run with a command.
- Fail clearly when the behaviour regresses.
- Link back to stable product wiki IDs.
- Are added to `checks/manifest.json` when they matter to the harness.

## Bad checks

- Only repeat the requirement in prose.
- Depend on a happy-path screenshot without assertions.
- Test implementation details unrelated to product behaviour.
- Have no command, owner, or evidence path.

## Acceptance criteria conversion

For each acceptance criterion, ask:

1. What observable behaviour proves this?
2. What is the smallest check that can observe it?
3. Is the check already present?
4. What command runs it?
5. Where should evidence be recorded?
