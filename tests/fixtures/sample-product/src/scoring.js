// PW:capability.option-scoring
export function scoreOptions(options) {
  return [...options].sort((a, b) => b.score - a.score);
}
