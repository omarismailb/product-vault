# Product Wiki Constitution

This file records principles.
It is not enforcement.
Hard rules belong in hooks, scripts, CI, and permission settings.

## Principles

1. Product intent is source material.
   Code records implementation, but the product wiki records why the implementation exists.
   The wiki is natural language and holds no code; code links back to it by reference, through `PW:` anchors and executable checks, rather than living inside it.

2. Small units beat large documents.
   Jobs, stories, rules, journeys, capabilities, outcomes, and decisions should each have one job.

3. Behaviour must be executable.
   Acceptance criteria should compile into checks that run against the code.

4. Reuse before invention.
   A change should look for existing capabilities before adding new paths.

5. Refactor before layering.
   If the current architecture cannot absorb the change cleanly, raise a refactor proposal before adding special cases.

6. Human judgement stays in the loop.
   Product proposals, irreversible decisions, and high-risk architecture changes need explicit human approval.

7. The wiki must be maintained.
   Stale authoritative documentation is worse than ordinary stale documentation.
   Traceability loops must find missing links between wiki claims, tests, and code.

