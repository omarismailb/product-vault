# Skill Architecture

Skills are the main workflow primitive in Product Wiki.
Subagents are optional reviewers.
Hooks are the native automation primitive for deterministic loops.

## Why skills first

Skills keep the flow natural.
The user can ask for a feature, bug fix, product change, or retrofit in normal language.
The agent routes into the right skill based on the skill description.

The user should not have to say "use the propose-change skill" every time.
Explicit skill names are an escape hatch when routing is unclear.

## Why not many agents

One reviewer per step creates ceremony and burns context.
Product Wiki uses only three reviewer agents:

- Architecture reviewer.
- Verification reviewer.
- Consistency reviewer.

The main agent owns the flow.
Reviewer agents are called when fresh context helps.

## Skill quality bar

Each production skill should have:

- A clear trigger description.
- A short workflow in `SKILL.md`.
- References for deep rubrics and examples.
- Templates for repeatable outputs.
- Deterministic scripts where validation matters.
- At least one golden eval case.

This follows the skill-creator pattern: keep `SKILL.md` lean, put detailed guidance in references, and use scripts for deterministic checks.

## Current skills

| Skill | Purpose |
|---|---|
| `import-codebase` | Draft a first product wiki from an existing repo, treating code as evidence rather than truth. |
| `propose-change` | Turn a normal request into a reviewable product wiki proposal. |
| `apply-wiki-change` | Apply an approved proposal to the wiki without editing application code. |
| `generate-checks` | Turn acceptance criteria, rules, and journeys into checks. |
| `compile-change` | Turn an approved wiki change into implementation, using the lightest safe path. |
| `review-architecture` | Check reuse, boundaries, data ownership, and refactor pressure. |
| `reconcile-wiki` | Read routine output, find drift between wiki/checks/design/architecture/code, fix safe links, and raise proposals. |

## Hook boundary

The native hooks do not make product decisions.
They run deterministic checks and tell the main agent when a reconciliation skill should be used.
