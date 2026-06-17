# Lifecycle

Product Wiki treats the product wiki as a living source layer, not a disposable spec.

## Request lifecycle

1. A normal request arrives, such as a new feature, bug report, or workflow change.
2. The request becomes a small proposed change to the product wiki.
3. The human approves, edits, or rejects that wiki change.
4. The approved wiki change says what should happen, who it affects, what must stay true, and how to know it works.
5. The compiler skill turns the wiki change into design decisions, checks, implementation steps, code, and verification.
6. Important code and tests get `PW:` anchors that point back to the relevant wiki IDs.
7. Native hooks and routine runner execute deterministic loops.
8. Reconcile skill links implementation evidence back to the wiki and raises proposals for judgement calls.

The user can still speak normally.
The harness is what changes the route: product request, product wiki change, checks, code, reconciliation.

## Artifact lifecycle

| Artifact | Owner | Update rule |
|---|---|---|
| Product wiki | Product repo | Edited through proposals |
| Proposals | Product repo | Historical review trail |
| Check manifest | Product repo | Updated as behaviours get checks |
| Wiki anchors | Product repo | Added to important code and test boundaries |
| Skills | Product Wiki | Updated through explicit upgrade |
| Schemas/scripts/hooks | Product Wiki | Updated through explicit upgrade |
| Routine manifest | Product Wiki | Updated through explicit upgrade |
| AGENTS/CLAUDE/settings | Shared | Managed routing block plus reviewable incoming files |

## Spec persistence model

Product Wiki uses a living-spec model for the product wiki.
The wiki is the contract that future changes read first.

Proposals are the audit trail.
The wiki remains current.
Implementation plans and task lists can be regenerated or revised as the product changes.

## Automation boundary

Skills guide the model.
Scripts, hooks, CI, and checks enforce deterministic parts.

Product Wiki should only claim determinism where a command runs and can fail.
Everything else is a review workflow.
