# Security

Product Wiki is an open-source agent harness.
It includes hooks and scripts that can influence agent behaviour inside a repo, so security issues should be handled carefully.

## Reporting a vulnerability

Please report security issues privately by emailing hi@omarismail.com.

Include:

- What you found.
- How to reproduce it.
- Which files or hooks are affected.
- Any suggested mitigation.

Please do not open a public issue for vulnerabilities that could put users, credentials, repositories, or agent sessions at risk.

## Scope

In scope:

- Unsafe hooks.
- Commands that could alter or delete user data unexpectedly.
- Guardrails that claim to block an action but do not.
- Instructions that could cause agents to expose secrets or overwrite local project rules.

Out of scope:

- General prompt-injection discussions without a repo-specific exploit path.
- Product feature requests that are not security issues.
- Security issues in Claude Code, Codex, GitHub, or other upstream tools.

## Trust boundary: executable checks and routines

`checks/manifest.json` and `routines/manifest.json` contain `command` strings that the harness runs (`pw:checks-run`, the routine runner, and the Stop-hook loop). Treat these manifests as **trusted, reviewed code**, because anyone who can change them can run a command in your environment.

To reduce that risk, commands are not run through a shell:

- They are tokenised and executed with `shell: false` (see `scripts/lib/safe-exec.mjs`). Shell metacharacters (`&&`, `;`, `|`, redirects, globs, `$(...)`, backticks) are rejected, so a manifest entry cannot chain or inject commands.
- The executable (the first token) must be on an allow-list of test runners, package managers, compilers, and language runtimes. Shells are not on the list. Extend it for unusual stacks with `PRODUCT_WIKI_ALLOWED_COMMANDS` (comma-separated executable names).
- `checks-lint` validates every command at lint time, so an unsafe or non-allow-listed command fails `npm run check`, not just `--run`.

This does not make an arbitrary command safe; it constrains commands to single, allow-listed program invocations. Still review manifest changes in pull requests as you would any code, and prefer running `pw:checks-run` yourself after reviewing a contributor's change to `checks/`.

### Residual risk: manifest commands are reviewed code

The allow-list is a list of trusted programs, not a list of safe behaviours. By default the executor also rejects the ways an allow-listed runtime runs code that is not the reviewed file it names: inline eval (`node -e`/`--eval`/`-p`/`--print`, `python -c`, `deno eval`), preload and loader injection (`node -r`/`--require`/`--loader`/`--experimental-loader`/`--import`/`--preload`), running a module by name (`python -m`, `npx`, `make`, `ts-node`, `tsx`), and control characters that could smuggle a second command. A file-referencing interpreter (node, bun, python) must name an existing file inside the repository, and a symlink whose target escapes the repository does not satisfy that requirement.

What remains is deliberate. A repository can opt a specific executable back in with `PRODUCT_WIKI_ALLOWED_COMMANDS`, which removes these guards for that one program, and the shell metacharacter and expansion rejection always applies. So the trust boundary is unchanged in principle: a manifest `command` is code that runs on the machine of anyone who runs the checks, including the Stop-hook loop. Review changes to `checks/` and `routines/` manifests as carefully as any other code, and keep the opt-in list small and intentional.

## Install integrity

Product Wiki is published to the npm registry (`product-wiki`), and `npx product-wiki@<version> init` is the canonical install. A registry version is convenient but a version tag and a git tag are both mutable, so neither is tamper-evident on its own.

The published package currently ships with the standard npm registry signature but **without npm provenance attestation**. Until provenance is published, the strongest reproducible, tamper-evident install is a pinned commit SHA from source:

```bash
npx github:omarismailb/product-wiki#<40-char-commit-sha> init
```

Review the changes the installer stages before accepting them. Recommended hardening on the roadmap: publish the registry release with npm provenance (`npm publish --provenance` from CI), so a registry install can be verified back to the source commit and build, and SHA-pinning becomes a convenience rather than a requirement.
