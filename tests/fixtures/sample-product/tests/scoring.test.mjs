// Covers ac.option-scoring.options-within-60s: scoreOptions returns the options
// sorted by score (highest first) and does not mutate the caller's input.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreOptions } from "../src/scoring.js";

test("ac.option-scoring.options-within-60s", () => {
  const input = [
    { id: "a", score: 2 },
    { id: "b", score: 5 },
    { id: "c", score: 3 },
  ];
  const input_snapshot = JSON.stringify(input);

  const ranked = scoreOptions(input);

  // Sorted by score, highest first.
  assert.deepEqual(
    ranked.map((o) => o.id),
    ["b", "c", "a"],
  );
  for (let i = 1; i < ranked.length; i += 1) {
    assert.ok(ranked[i - 1].score >= ranked[i].score, "scores must be non-increasing");
  }

  // The caller's input list is left unchanged.
  assert.equal(JSON.stringify(input), input_snapshot, "input must not be mutated");
});
