# Contributing

Product Wiki is an early, production-shaped release with a deliberately small surface area, hardening as it is used against real changes.
The goal is to keep the harness useful, reliable, and honest about what is enforced.

## Principles

- Prefer one clear workflow over many clever options.
- Keep skills as the main primitive.
- Use subagents only when separate context helps.
- Put hard rules in hooks, scripts, CI, or permissions.
- Keep examples grounded in checks that actually run.

## Before opening a pull request

Run:

```bash
npm run check
```

If you add a check to `checks/manifest.json`, make sure it passes with:

```bash
npm run checks:run
```

## Changing the wiki model

Changes to wiki units should update:

- `AGENTS.md`
- `schemas/`
- relevant skills in `.agents/skills/`
- examples that use the changed unit

## Changing agent support

Claude Code and Codex support should stay close to official documented features.
If a feature depends on a new or unstable agent capability, link the official source in the relevant public doc or pull request.
