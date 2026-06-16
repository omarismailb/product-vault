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
