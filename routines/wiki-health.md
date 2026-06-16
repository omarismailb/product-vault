# Wiki Health Routine

Run this weekly or before a larger feature.

## Checks

1. Run `node scripts/wiki-lint.mjs`.
2. Find wiki files with `status: draft` older than 14 days.
3. Find active assumptions with no linked outcome or check.
4. Find decisions without a status or supersession trail.
5. Find glossary terms used inconsistently.

## Output

- Mechanical fixes made.
- Proposals needed.
- Stale claims.
- Questions for the user.

