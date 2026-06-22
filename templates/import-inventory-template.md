# Import inventory

Complete map of the codebase for a Product Wiki retrofit. One line per candidate
capability. Tick `[x]` once it has an import proposal. The retrofit is done only when
every box is ticked and `node scripts/import-coverage.mjs` reports 0 pending.

Status: pending = `[ ]`, imported = `[x]`.

## Import progress

- Total capabilities discovered: 0
- Imported: 0
- Pending: 0
- Current batch: 1
- Batch size: 3-5 capabilities, smaller when a capability is risky or unclear.
- Next resume point: first unchecked item under "Capabilities to import".

## Product surfaces discovered

- routes / endpoints: <list>
- CLI / jobs / queues / cron: <list>
- UI pages: <list>

## Capabilities to import

- [ ] capability.<id> — batch: 1 — code paths: `src/...`, `src/...` — confidence: high|medium|low
- [ ] capability.<id> — batch: 1 — code paths: `...` — confidence: ...
<!-- add one line per capability discovered across the WHOLE codebase -->

## Batch plan

Each batch should be small enough for a human to review.
For every batch, import the next unchecked capabilities, run coverage, and write the next resume point.

| Batch | Capabilities | Goal | Status |
|---|---|---|---|
| 1 | `capability.example` | First reviewable slice | pending |

## Cross-cutting concerns (capture as rules or decisions)

- [ ] auth / permissions — code paths: `...`
- [ ] money / billing — code paths: `...`
- [ ] data ownership / tenancy — code paths: `...`
- [ ] observability — code paths: `...`

## Deliberately out of scope (non-goals)

- <code area> — reason: <why it is not product intent worth modelling>
