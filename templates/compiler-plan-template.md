# Compiler Plan

Proposal:
Date:
Blast radius: low / medium / high

## Product decision

What the approved wiki change says the product must do.

## Blast radius

| Area | Files or wiki IDs | Risk |
|---|---|---:|
| Wiki units |  | low/medium/high |
| Code paths |  | low/medium/high |
| Tests/checks |  | low/medium/high |
| Data |  | low/medium/high |
| Security/privacy |  | low/medium/high |
| Design system |  | low/medium/high |

## Reuse or refactor

Existing capability to reuse:

Refactor needed before feature code:

Reason:

## Checks first

| Acceptance criterion | Check | Command |
|---|---|---|
| `ac.example.behaviour` | unit/integration/e2e/manual | `npm test ...` |

## Implementation steps

1. Add or update checks.
2. Run checks and confirm they fail for the expected reason where applicable.
3. Make the smallest coherent code change.
4. Run product checks and normal repo checks.
5. Reconcile wiki links and decision notes.

## Verification evidence

- Commands run.
- Results.
- Remaining risk.
