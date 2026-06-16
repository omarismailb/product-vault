# Golden eval: weekend flight change

This fixture checks whether the canonical greenfield example keeps the expected proposal shape.

It is not a model benchmark yet.
It is a deterministic regression check for the harness itself:

- the request is preserved
- the proposal contains the expected wiki units
- acceptance criteria are explicit
- each acceptance criterion has a check strategy

Run:

```bash
npm run eval
```
