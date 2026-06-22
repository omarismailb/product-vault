---
id: ac.option-scoring.options-within-60s
type: acceptance-criterion
status: active
updated: 2026-06-16
links: [capability.option-scoring]
---

# Options returned highest score first

## What it does for you

When you ask for options you get the list back ranked, with the strongest choice
first, so you never have to compare every option by hand.

## How it works

The scoring path for [capability.option-scoring](../capabilities/option-scoring.md) returns the options sorted by
score in descending order, and it leaves the caller's input list unchanged.
