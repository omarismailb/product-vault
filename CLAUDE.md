# CLAUDE.md

Read `AGENTS.md` first.
It is the portable agent contract for this repo.

Claude Code should use the same workflow as Codex:

- Use skills from `.claude/skills`.
- Use reviewer subagents from `.claude/agents` only when separate context helps.
- Read `wiki/overview.md` before drilling into smaller wiki units.
- Do not write code for non-trivial product requests until the product wiki proposal is approved.
- When searching code, check `PW:` wiki anchors first, then use normal search.
- Use hooks and scripts for deterministic checks.

If `AGENTS.md` and this file diverge, ask the user which contract is current before making changes.
