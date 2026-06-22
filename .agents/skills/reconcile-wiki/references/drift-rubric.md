# Drift Rubric

Use this during maintenance or after implementation.

## Drift categories

- Wiki claim without a check.
- Check without a wiki ID.
- Code path with no linked capability.
- Capability duplicated in two implementations.
- Rule contradicted by code.
- Decision contradicted by current architecture.
- Design-system rule not reflected in UI.
- Assumption that has become stale.
- Dependency added without a decision or capability link.

## Severity

| Severity | Meaning |
|---|---|
| Critical | The wiki is actively misleading about production behaviour |
| High | A future change is likely to break architecture or product behaviour |
| Medium | Important link or check is missing |
| Low | Hygiene issue or stale wording |

## Actions

- Auto-fix objective missing links when safe.
- Raise proposals for judgement calls.
- Do not silently rewrite product intent.
- Report code paths and wiki IDs together.
- Update `wiki/log.md` after meaningful reconciliation.
