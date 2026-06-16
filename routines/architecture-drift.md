# Architecture Drift Routine

Run this after several features or when a module starts absorbing unrelated behaviour.

## Checks

1. Duplicate capabilities.
2. Modules with mixed ownership.
3. Special-case branches that should be rules or capabilities.
4. Repeated implementation patterns that should be shared.
5. Decisions that no longer match the code.

## Output

- Refactor pressure: low, medium, high.
- Suggested preparatory refactors.
- Product wiki units affected.

