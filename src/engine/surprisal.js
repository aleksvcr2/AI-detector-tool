/* Zipf–Mandelbrot unigram surprisal: the local stand-in for perplexity.
   p(rank) = C / (rank + b)^s over a language's rank-ordered lexicon. */

const S = 1.07;
const B = 2.7;
let C = 0;
for (let r = 1; r <= 60000; r++) C += 1 / Math.pow(r + B, S);
C = 0.97 / C;

/** Effective rank for a token outside the reference lexicon, from its length. */
function oovRank(w) {
  const L = Math.max(3, Math.min(22, w.length));
  return Math.round(1200 * Math.pow(1.42, L - 4));
}

/** Surprisal in bits: −log₂ p(word) under the given language's rank map. */
export function surprisalIn(rank, word) {
  const w = word.toLowerCase();
  const r = rank.get(w) ?? oovRank(w);
  const p = C / Math.pow(r + B, S);
  return -Math.log2(Math.max(p, 1e-12));
}
