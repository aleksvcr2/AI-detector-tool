import { surprisalIn } from "./surprisal.js";
import { LANGUAGES, detectLanguage } from "./languages/index.js";

const yieldToUI = () => new Promise((r) => setTimeout(r, 0));

/* ------------------------------------------------------------------ */
/* Tokenizers                                                          */
/* ------------------------------------------------------------------ */

// Unicode-aware so accented and non-ASCII letters count as letters.
const WORD_RE = /[\p{L}][\p{L}'’]*/gu;
const HAS_LETTER = /\p{L}/u;

export function words(s) {
  return s.match(WORD_RE) || [];
}

/** Sentence segmentation with abbreviation, initial and decimal guards. */
function countNl(slice) {
  const lead = slice.match(/^\s*/)[0];
  return (lead.match(/\n/g) || []).length;
}

export function sentences(text, abbreviations = new Set()) {
  const out = [];
  const n = text.length;
  let start = 0;
  for (let i = 0; i < n; i++) {
    const c = text[i];
    if (c !== "." && c !== "!" && c !== "?" && c !== "…") continue;
    let j = i;
    while (j + 1 < n && ".!?…".includes(text[j + 1])) j++;
    // closing quotes / brackets belong to this sentence
    let k = j + 1;
    while (k < n && "\"'”’)]}»".includes(text[k])) k++;
    const after = text.slice(k, k + 3);
    const nextNonSpace = after.replace(/^[ \t]+/, "")[0];
    const gap = k < n && (text[k] === " " || text[k] === "\t" || text[k] === "\n" || k >= n);
    if (!gap && k < n) { i = j; continue; }
    if (c === ".") {
      const before = text.slice(Math.max(0, i - 14), i);
      const tok = (before.match(/[\p{L}.'’]+$/u) || [""])[0].replace(/\./g, "").toLowerCase();
      if (tok && abbreviations.has(tok)) { i = j; continue; }
      if (/\d$/.test(before) && /^\s*\d/.test(text.slice(k))) { i = j; continue; }
      if (nextNonSpace && /[\p{Ll},;:]/u.test(nextNonSpace) && !/\n/.test(text.slice(j + 1, k + 1))) { i = j; continue; }
    }
    const slice = text.slice(start, k);
    const seg = slice.trim();
    if (seg) out.push({ text: seg, offset: start, nl: countNl(slice) });
    start = k;
    i = j;
  }
  const tailSlice = text.slice(start);
  const tail = tailSlice.trim();
  if (tail) out.push({ text: tail, offset: start, nl: countNl(tailSlice) });
  return out.filter((s) => HAS_LETTER.test(s.text));
}

export function paragraphs(text) {
  let ps = text.split(/\n[ \t]*\n+/).map((p) => p.trim()).filter(Boolean);
  if (ps.length < 3 && /\n/.test(text)) {
    ps = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  }
  return ps;
}

/* ------------------------------------------------------------------ */
/* Small stats helpers                                                 */
/* ------------------------------------------------------------------ */

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
function sd(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}
function kurtosis(a) {
  if (a.length < 4) return 3;
  const m = mean(a), s = sd(a);
  if (!s) return 3;
  return a.reduce((acc, x) => acc + ((x - m) / s) ** 4, 0) / a.length;
}
function skew(a) {
  if (a.length < 3) return 0;
  const m = mean(a), s = sd(a);
  if (!s) return 0;
  return a.reduce((acc, x) => acc + ((x - m) / s) ** 3, 0) / a.length;
}
function entropy(counts) {
  const total = counts.reduce((x, y) => x + y, 0);
  if (!total) return 0;
  let h = 0;
  for (const c of counts) if (c > 0) { const p = c / total; h -= p * Math.log2(p); }
  return h;
}
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/* ------------------------------------------------------------------ */
/* Per-language grammar tables                                         */
/* ------------------------------------------------------------------ */
// Sentence openers are classified into six grammatical buckets so that
// "opener entropy" measures variety of construction, not variety of wording.
const OPENER_CLASSES = {
  en: {
    det: "the a an this that these those his her its their our my your".split(" "),
    pron: "i we you he she they it one someone everyone".split(" "),
    conj: "and but or so yet nor because although though while if when since as".split(" "),
  },
  es: {
    det: "el la los las un una unos unas este esta estos estas ese esa esos esas aquel aquella su sus mi mis tu tus nuestro nuestra".split(" "),
    // Spanish drops subject pronouns, so a sentence very often opens on a
    // clitic object pronoun or straight onto the verb. Clitics count as pronouns.
    pron: "yo nosotros nosotras tú usted ustedes él ella ellos ellas uno alguien todos me te le lo la nos les los las se".split(" "),
    conj: "y e o u pero sino porque aunque mientras si cuando como pues ya que".split(" "),
  },
  pt: {
    det: "o a os as um uma uns umas este esta estes estas esse essa esses essas aquele aquela seu sua seus suas meu minha nosso nossa".split(" "),
    pron: "eu nós você vocês ele ela eles elas alguém todos me te lhe lhes nos se o a os as".split(" "),
    conj: "e ou mas porém porque embora enquanto se quando como pois já".split(" "),
  },
  fr: {
    det: "le la les un une des ce cet cette ces son sa ses mon ma mes notre nos leur leurs".split(" "),
    pron: "je nous tu vous il elle ils elles on quelqu'un tous me te se lui leur y en cela ça".split(" "),
    conj: "et ou mais car parce puisque bien lorsque quand comme si tandis".split(" "),
  },
};

// Adverb morphology, used to spot an adverbial sentence opening.
const ADVERB_SUFFIX = {
  en: /ly$/,
  es: /mente$/,
  pt: /mente$/,
  fr: /ment$/,
};

// Lexical passive detection: auxiliary plus past participle.
const PASSIVE_PATTERNS = {
  en: /\b(is|are|was|were|be|been|being|am)\s+(?:\w+ly\s+)?(\w{3,}(?:ed|en)|done|made|given|taken|shown|seen|held|known|found|used|built|sent|kept|left|brought|put|set)\b/i,
  // Spanish: ser/estar + participle, plus the far commoner impersonal "se" passive.
  es: /\b(es|son|era|eran|fue|fueron|ser|sido|sea|sean|fuera|fueran|será|serán|sería|serían|siendo|está|están|estaba|estaban|quedó|quedaron)\s+(?:\w+mente\s+)?\w{3,}(?:ado|ada|ados|adas|ido|ida|idos|idas|to|ta|cho|cha)\b|\bse\s+\w{3,}(?:ó|aron|ieron|a|an|e|en)\b|\b\w{4,}(?:ar|er|ir)se\b/i,
  pt: /\b(é|são|era|eram|foi|foram|ser|sido|seja|sejam|fosse|fossem|será|serão|seria|seriam|sendo|está|estão|estava|estavam)\s+(?:\w+mente\s+)?\w{3,}(?:ado|ada|ados|adas|ido|ida|idos|idas|to|ta)\b|\bse\s+\w{3,}(?:ou|aram|eram|a|am|e|em)\b|\b\w{4,}(?:ar|er|ir)-se\b/i,
  fr: /\b(est|sont|était|étaient|fut|furent|être|été|sera|seront|serait|seraient|soit|soient)\s+(?:\w+ment\s+)?\w{3,}(?:é|ée|és|ées|i|ie|is|ies|u|ue|us|ues|it|ite)\b|\bse\s+(?:\w+ment\s+)?\w{3,}(?:e|ent|é|ait)\b/i,
};

// A first-person reference in a sentence is a mild human cue for the stain.
const FIRST_PERSON_RE = {
  en: /\b(i|we|my|our|me|us)\b/i,
  es: /\b(yo|me|mí|mi|mis|nos|nosotros|nosotras|nuestro|nuestra|nuestros|nuestras|conmigo)\b/i,
  pt: /\b(eu|me|mim|meu|minha|meus|minhas|nós|nos|nosso|nossa|nossos|nossas|comigo)\b/i,
  fr: /\b(je|j'|me|moi|mon|ma|mes|nous|notre|nos)\b/i,
};

/* ------------------------------------------------------------------ */
/* Signal reference bands                                              */
/* ------------------------------------------------------------------ */
// center / spread describe the distribution seen in unassisted human prose.
// dir = +1 when a HIGHER value is evidence of machine generation, -1 when a
// LOWER value is. weight = relative influence on the composite index.
export const SIGNAL_SPEC = [
  // --- Rhythm: how sentence length moves through the document -------------
  { id: "burstiness", family: "Rhythm", label: "Burstiness", unit: "CV", center: 0.62, spread: 0.16, dir: -1, weight: 1.4, why: "Coefficient of variation of sentence length. Human writing lurches; generated prose settles into one gait." },
  { id: "sentSd", family: "Rhythm", label: "Sentence length σ", unit: "words", center: 9.0, spread: 3.0, dir: -1, weight: 1.0, why: "Absolute spread of sentence lengths." },
  { id: "sentMean", family: "Rhythm", label: "Sentence length μ", unit: "words", center: 19, spread: 6.5, dir: 1, weight: 0.5, why: "Mean sentence length. Generators cluster near 20 words." },
  { id: "sentKurt", family: "Rhythm", label: "Length kurtosis", unit: "", center: 4.2, spread: 2.0, dir: -1, weight: 0.6, why: "Fat tails mean real outliers: a two-word sentence, then a sixty-word one." },
  { id: "sentSkew", family: "Rhythm", label: "Length skew", unit: "", center: 0.85, spread: 0.55, dir: -1, weight: 0.4, why: "Human length distributions lean right." },
  { id: "shortRate", family: "Rhythm", label: "Short sentences", unit: "< 8 words", center: 0.16, spread: 0.09, dir: -1, weight: 1.0, why: "Fragments and one-liners are a strongly human habit." },
  { id: "longRate", family: "Rhythm", label: "Long sentences", unit: "> 35 words", center: 0.09, spread: 0.06, dir: -1, weight: 0.6, why: "Runaway sentences survive human drafting; models trim them." },
  { id: "bandRate", family: "Rhythm", label: "Mid-band concentration", unit: "15–28 words", center: 0.34, spread: 0.11, dir: 1, weight: 1.1, why: "Share of sentences inside the comfortable generated band." },

  // --- Predictability: unigram surprisal as a perplexity proxy -----------
  { id: "surpMean", family: "Predictability", label: "Mean surprisal", unit: "bits/word", center: 10.6, spread: 1.1, dir: -1, weight: 1.3, why: "Average −log₂ p(word) under a Zipf–Mandelbrot unigram model. The local stand-in for perplexity." },
  { id: "surpSd", family: "Predictability", label: "Surprisal variance", unit: "bits", center: 1.45, spread: 0.45, dir: -1, weight: 1.4, why: "Sentence-to-sentence swing in surprisal. The single most discriminating classical signal." },
  { id: "spikeRate", family: "Predictability", label: "Surprisal spikes", unit: "share", center: 0.13, spread: 0.06, dir: -1, weight: 0.8, why: "Sentences a full σ above the document's own surprisal: the odd word, the wrong register, the personal detail." },
  { id: "flatRun", family: "Predictability", label: "Longest flat run", unit: "sentences", center: 3.6, spread: 1.6, dir: 1, weight: 0.7, why: "Consecutive sentences whose surprisal stays inside ±0.4 bits." },
  { id: "oovRate", family: "Predictability", label: "Out-of-list words", unit: "share", center: 0.27, spread: 0.09, dir: -1, weight: 0.4, why: "Tokens outside the reference vocabulary: names, jargon, coinages, misspellings." },
  { id: "zipfDev", family: "Predictability", label: "Zipf slope deviation", unit: "|Δs|", center: 0.16, spread: 0.08, dir: -1, weight: 0.5, why: "How far the document's rank–frequency slope sits from natural English (s ≈ 1.07)." },

  // --- Lexicon ----------------------------------------------------------
  { id: "mattr", family: "Lexicon", label: "MATTR (w=50)", unit: "", center: 0.74, spread: 0.06, dir: 1, weight: 0.7, why: "Moving-average type–token ratio. Length-independent vocabulary richness." },
  { id: "hapax", family: "Lexicon", label: "Hapax legomena", unit: "share", center: 0.44, spread: 0.09, dir: -1, weight: 0.9, why: "Words used exactly once. Machine drafts reuse their vocabulary." },
  { id: "yulesK", family: "Lexicon", label: "Yule's K", unit: "", center: 105, spread: 35, dir: 1, weight: 0.5, why: "Repeat-rate diversity measure, insensitive to text length." },
  { id: "wordLenH", family: "Lexicon", label: "Word-length entropy", unit: "bits", center: 2.35, spread: 0.22, dir: -1, weight: 0.5, why: "Shannon entropy of the word-length distribution." },
  { id: "funcRate", family: "Lexicon", label: "Function-word rate", unit: "share", center: 0.485, spread: 0.045, dir: 1, weight: 0.6, why: "Grammatical scaffolding ratio, the classic authorship fingerprint." },
  { id: "rep5", family: "Lexicon", label: "Repeated 5-grams", unit: "share", center: 0.008, spread: 0.010, dir: 1, weight: 0.6, why: "Five-word strings that appear more than once." },

  // --- Register ---------------------------------------------------------
  { id: "discourse", family: "Register", label: "Discourse markers", unit: "per 1k", center: 6.5, spread: 3.5, dir: 1, weight: 1.2, why: "However, moreover, furthermore, in conclusion. Connective tissue models over-apply." },
  { id: "regMark", family: "Register", label: "Register markers", unit: "per 1k", center: 1.2, spread: 1.2, dir: 1, weight: 1.3, why: "Phrases whose frequency jumped after 2022: delve into, a testament to, rich tapestry." },
  { id: "hedge", family: "Register", label: "Hedges", unit: "per 1k", center: 14, spread: 6, dir: 1, weight: 0.7, why: "May, might, generally, tends to. Trained-in caution." },
  { id: "contraction", family: "Register", label: "Contractions", unit: "per 1k", center: 7, spread: 6, dir: -1, weight: 0.9, why: "Don't, it's, we're. Suppressed by assistant-style formality." },
  { id: "firstPerson", family: "Register", label: "First person", unit: "per 1k", center: 18, spread: 14, dir: -1, weight: 0.7, why: "I, we, my, our." },
  { id: "intens", family: "Register", label: "Intensifiers", unit: "per 1k", center: 7, spread: 4, dir: -1, weight: 0.4, why: "Very, really, absolutely. Edited out of generated prose." },
  { id: "passive", family: "Register", label: "Passive constructions", unit: "share of sent.", center: 0.19, spread: 0.10, dir: 1, weight: 0.6, why: "Be-verb plus participle, detected lexically." },
  { id: "exclaimQ", family: "Register", label: "! and ? endings", unit: "share of sent.", center: 0.07, spread: 0.06, dir: -1, weight: 0.5, why: "Voice leaking through punctuation." },
  { id: "openerRep", family: "Register", label: "Opener repetition", unit: "share", center: 0.22, spread: 0.09, dir: 1, weight: 0.9, why: "Sentences beginning with the document's three most common first words." },
  { id: "openerH", family: "Register", label: "Opener entropy", unit: "bits", center: 1.6, spread: 0.35, dir: -1, weight: 0.6, why: "Variety in how sentences start, by grammatical class." },

  // --- Structure --------------------------------------------------------
  { id: "paraCv", family: "Structure", label: "Paragraph length CV", unit: "", center: 0.55, spread: 0.20, dir: -1, weight: 0.9, why: "Generated paragraphs come out the same size, over and over." },
  { id: "gradeSd", family: "Structure", label: "Readability σ", unit: "FK grades", center: 2.4, spread: 0.9, dir: -1, weight: 1.0, why: "Flesch–Kincaid grade spread across paragraphs. Uniform difficulty is machine-flat." },
  { id: "flesch", family: "Structure", label: "Flesch reading ease", unit: "", center: 52, spread: 16, dir: -1, weight: 0.3, why: "Absolute readability, for context rather than accusation." },
  { id: "listRate", family: "Structure", label: "List scaffolding", unit: "share of lines", center: 0.06, spread: 0.09, dir: 1, weight: 0.5, why: "Bulleted or numbered lines, the assistant's favourite shape." },
  { id: "headRate", family: "Structure", label: "Markup residue", unit: "per 1k", center: 0.3, spread: 1.0, dir: 1, weight: 0.5, why: "Markdown headings and ** emphasis pasted straight out of a chat window." },
  { id: "paraSentCv", family: "Structure", label: "Sentences per paragraph CV", unit: "", center: 0.52, spread: 0.20, dir: -1, weight: 0.6, why: "Three-sentence paragraphs, forever." },

  // --- Typography -------------------------------------------------------
  { id: "emDash", family: "Typography", label: "Em dashes", unit: "per 1k", center: 1.2, spread: 1.6, dir: 1, weight: 0.8, why: "Typed by almost nobody, emitted constantly." },
  { id: "curly", family: "Typography", label: "Quote consistency", unit: "", center: 0.5, spread: 0.35, dir: 1, weight: 0.3, why: "Perfectly uniform straight or curly quotes suggests one generator, not one typist." },
  { id: "doubleSpace", family: "Typography", label: "Double space after period", unit: "share", center: 0.06, spread: 0.12, dir: -1, weight: 0.3, why: "A typewriter-era human tic." },
  { id: "typo", family: "Typography", label: "Slip rate", unit: "per 1k", center: 2.0, spread: 2.0, dir: -1, weight: 0.9, why: "Missing spaces, doubled words, stray capitals, lone lowercase i. Errors are alibis." },
  { id: "unicode", family: "Typography", label: "Invisible characters", unit: "per 1k", center: 0.05, spread: 0.4, dir: 1, weight: 0.4, why: "Non-breaking spaces, zero-width joiners, narrow no-break spaces surviving a copy-paste." },
];

/* ------------------------------------------------------------------ */
/* Main analysis                                                       */
/* ------------------------------------------------------------------ */

/** @param {string} raw @param {(p:object)=>void} onProgress @param {{lang?: string}} opts */
export async function analyze(raw, onProgress = () => {}, opts = {}) {
  const text = raw.replace(/\r\n?/g, "\n");
  onProgress({ phase: "Identifying language", pct: 0.01 });
  await yieldToUI();

  const forced = opts.lang && LANGUAGES[opts.lang] ? opts.lang : null;
  const detection = detectLanguage(text);
  if (!forced) {
    if (detection.unsupportedName) {
      const err = new Error(
        `This document appears to be written in ${detection.unsupportedName}, which this bench is not calibrated for. ` +
          `Measuring it against English or Spanish reference bands would produce a confident number that means nothing. ` +
          `Calibrated languages: English, Spanish, Portuguese, French.`,
      );
      err.code = "UNSUPPORTED_LANGUAGE";
      throw err;
    }
    if (detection.unrecognised) {
      const err = new Error(
        "Could not identify the language of this document with enough confidence to pick reference bands. " +
          "If you know it is English, Spanish, Portuguese or French, choose it manually and run it again.",
      );
      err.code = "UNKNOWN_LANGUAGE";
      throw err;
    }
  }
  const lang = forced ? LANGUAGES[forced] : detection.pack || LANGUAGES.en;
  const L = lang;
  const syllables = L.syllables;

  onProgress({ phase: "Segmenting", pct: 0.03 });
  await yieldToUI();

  const sents = sentences(text, L.abbreviations);
  const paras = paragraphs(text);
  onProgress({ phase: "Segmenting", pct: 0.08 });
  await yieldToUI();

  const freq = new Map();
  const lenHist = new Map();
  const openerFirst = new Map();
  const openerClass = [0, 0, 0, 0, 0, 0];
  const gram5 = new Map();
  const sentRows = [];
  let totalWords = 0, funcCount = 0, syllTotal = 0, oov = 0;
  let contractionN = 0, firstPersonN = 0, intensN = 0, passiveN = 0, exclaimN = 0;
  let discourseN = 0, regMarkN = 0, hedgeN = 0;

  const DET = new Set(OPENER_CLASSES[L.code].det);
  const PRON = new Set(OPENER_CLASSES[L.code].pron);
  const CONJ = new Set(OPENER_CLASSES[L.code].conj);
  const ADV = new Set(L.discourseMarkers.map((m) => m.split(" ")[0]));
  const PASSIVE_RE = PASSIVE_PATTERNS[L.code];

  const CHUNK = 500;
  for (let i = 0; i < sents.length; i++) {
    const s = sents[i];
    const w = words(s.text);
    const lower = s.text.toLowerCase();
    if (w.length) {
      let surpSum = 0;
      for (let k = 0; k < w.length; k++) {
        const lw = w[k].toLowerCase();
        freq.set(lw, (freq.get(lw) || 0) + 1);
        surpSum += surprisalIn(L.rank, lw);
        if (L.functionWords.has(lw)) funcCount++;
        if (!L.rank.has(lw)) oov++;
        if (L.firstPerson.has(lw)) firstPersonN++;
        if (L.intensifiers.includes(lw)) intensN++;
        const wl = Math.min(16, w[k].length);
        lenHist.set(wl, (lenHist.get(wl) || 0) + 1);
        syllTotal += syllables(w[k]);
      }
      totalWords += w.length;
      const surpMean = surpSum / w.length;

      // 5-gram repetition
      if (w.length >= 5) {
        for (let k = 0; k + 5 <= w.length; k++) {
          const g = w.slice(k, k + 5).join(" ").toLowerCase();
          gram5.set(g, (gram5.get(g) || 0) + 1);
        }
      }

      // openers
      const o = w[0].toLowerCase();
      openerFirst.set(o, (openerFirst.get(o) || 0) + 1);
      if (DET.has(o)) openerClass[0]++;
      else if (PRON.has(o)) openerClass[1]++;
      else if (CONJ.has(o)) openerClass[2]++;
      else if (ADV.has(o) || ADVERB_SUFFIX[L.code].test(o)) openerClass[3]++;
      else if (/^\p{Lu}/u.test(w[0])) openerClass[4]++;
      else openerClass[5]++;

      if (/[’']\s?(s|t|re|ve|ll|d|m)\b/.test(lower) || /\b\w+n[’']t\b/.test(lower) || /\b\w+'(s|t|re|ve|ll|d|m)\b/.test(lower)) contractionN++;
      const passive = PASSIVE_RE.test(s.text);
      if (passive) passiveN++;
      if (/[!?][")'’”]*$/.test(s.text.trim())) exclaimN++;

      let dm = 0;
      for (const m of L.discourseMarkers) if (lower.includes(m)) dm++;
      discourseN += dm;
      let rm = 0;
      for (const m of L.registerMarkers) if (lower.includes(m)) rm++;
      regMarkN += rm;
      let hg = 0;
      for (const m of L.hedges) if (lower.includes(m)) hg++;
      hedgeN += hg;

      sentRows.push({
        i, offset: s.offset, nl: s.nl || 0, text: s.text, n: w.length, surp: surpMean,
        dm, rm, passive,
        human: FIRST_PERSON_RE[L.code].test(s.text) ? 1 : 0,
      });
    }
    if (i % CHUNK === CHUNK - 1) {
      onProgress({ phase: "Scoring sentences", pct: 0.08 + 0.72 * (i / sents.length) });
      await yieldToUI();
    }
  }

  onProgress({ phase: "Computing metrics", pct: 0.84 });
  await yieldToUI();

  const lens = sentRows.map((r) => r.n);
  const surps = sentRows.map((r) => r.surp);
  const mSurp = mean(surps), sSurp = sd(surps);
  const mLen = mean(lens);

  // flat runs
  let flatRun = 0, cur = 1;
  for (let i = 1; i < surps.length; i++) {
    if (Math.abs(surps[i] - surps[i - 1]) < 0.4) { cur++; flatRun = Math.max(flatRun, cur); }
    else cur = 1;
  }
  if (surps.length) flatRun = Math.max(flatRun, 1);

  // lexical
  const types = freq.size;
  let hapax = 0, m2 = 0;
  for (const c of freq.values()) { if (c === 1) hapax++; m2 += c * c; }
  const yulesK = totalWords > 1 ? (10000 * (m2 - totalWords)) / (totalWords * totalWords) : 0;

  // MATTR window 50 over a sampled token stream
  let mattr = types / Math.max(1, totalWords);
  {
    const stream = [];
    const step = Math.max(1, Math.floor(sentRows.length / 400));
    for (let i = 0; i < sentRows.length; i += step) {
      for (const w of words(sentRows[i].text)) stream.push(w.toLowerCase());
      if (stream.length > 20000) break;
    }
    const W = 50;
    if (stream.length >= W) {
      const counts = new Map();
      let distinct = 0, sum = 0, wins = 0;
      const add = (w) => { const c = counts.get(w) || 0; counts.set(w, c + 1); if (c === 0) distinct++; };
      const rem = (w) => { const c = counts.get(w); if (c === 1) { counts.delete(w); distinct--; } else counts.set(w, c - 1); };
      for (let i = 0; i < stream.length; i++) {
        add(stream[i]);
        if (i >= W) rem(stream[i - W]);
        if (i >= W - 1) { sum += distinct / W; wins++; }
      }
      mattr = sum / wins;
    }
  }

  // Zipf slope
  let zipfSlope = 1.07;
  {
    const sorted = [...freq.values()].sort((a, b) => b - a).slice(0, 600);
    const pts = sorted.map((f, i) => [Math.log(i + 1), Math.log(f)]).filter(([, y]) => isFinite(y));
    if (pts.length > 20) {
      const mx = mean(pts.map((p) => p[0])), my = mean(pts.map((p) => p[1]));
      let num = 0, den = 0;
      for (const [x, y] of pts) { num += (x - mx) * (y - my); den += (x - mx) ** 2; }
      zipfSlope = den ? -num / den : 1.07;
    }
  }

  let repeated5 = 0, total5 = 0;
  for (const c of gram5.values()) { total5 += c; if (c > 1) repeated5 += c; }

  // paragraph-level readability
  const paraLens = paras.map((p) => words(p).length).filter((n) => n > 0);
  const paraSentCounts = paras.map((p) => Math.max(1, sentences(p, L.abbreviations).length));
  const grades = [];
  for (const p of paras) {
    const pw = words(p);
    if (pw.length < 25) continue;
    const ps = Math.max(1, sentences(p, L.abbreviations).length);
    let sy = 0;
    for (const w of pw) sy += syllables(w);
    // Grade-style score: only its spread across paragraphs is used, so one
    // formula serves every language here.
    grades.push(0.39 * (pw.length / ps) + 11.8 * (sy / pw.length) - 15.59);
  }
  const fk = totalWords ? L.readability(totalWords, Math.max(1, sentRows.length), syllTotal) : 0;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const listLines = lines.filter((l) => /^([-*•‣▪]|\d{1,2}[.)]|[a-z][.)])\s+/i.test(l)).length;
  const markup = (text.match(/(^|\n)#{1,6}\s|\*\*[^*\n]{2,}\*\*/g) || []).length;

  const emDash = (text.match(/[—–]/g) || []).length;
  const straight = (text.match(/["']/g) || []).length;
  const curlyQ = (text.match(/[“”‘’]/g) || []).length;
  const curlyConsistency = straight + curlyQ === 0 ? 0.5 : Math.abs(curlyQ - straight) / (curlyQ + straight);
  const periods = (text.match(/\.\s/g) || []).length || 1;
  const doubleSpace = (text.match(/\.\s{2,}/g) || []).length / periods;
  const invisible = (text.match(/[\u00a0\u200b-\u200d\u2007\u202f\ufeff\u2060]/g) || []).length;

  const slips =
    (text.match(/\p{Ll},\p{L}/gu) || []).length +
    (text.match(/\p{Ll}\.\p{Lu}/gu) || []).length +
    (text.match(/\b(\p{L}{3,})\s+\1\b/giu) || []).length +
    (L.code === "en" ? (text.match(/\bi\b/g) || []).length * 0.35 : 0) +
    (text.match(/[!?]{2,}|\.{4,}/g) || []).length +
    (text.match(/\s+[,.;:]/g) || []).length +
    (text.match(/\b\p{Lu}{2,}\p{Ll}+/gu) || []).length * 0.5;

  const per1k = (x) => (totalWords ? (1000 * x) / totalWords : 0);
  const shareSent = (x) => (sentRows.length ? x / sentRows.length : 0);

  const raws = {
    burstiness: mLen ? sd(lens) / mLen : 0,
    sentSd: sd(lens),
    sentMean: mLen,
    sentKurt: kurtosis(lens),
    sentSkew: skew(lens),
    shortRate: shareSent(lens.filter((n) => n < 8).length),
    longRate: shareSent(lens.filter((n) => n > 35).length),
    bandRate: shareSent(lens.filter((n) => n >= 15 && n <= 28).length),
    surpMean: mSurp,
    surpSd: sSurp,
    spikeRate: shareSent(surps.filter((x) => x > mSurp + sSurp).length),
    flatRun,
    oovRate: totalWords ? oov / totalWords : 0,
    zipfDev: Math.abs(zipfSlope - 1.07),
    mattr,
    hapax: types ? hapax / types : 0,
    yulesK,
    wordLenH: entropy([...lenHist.values()]),
    funcRate: totalWords ? funcCount / totalWords : 0,
    rep5: total5 ? repeated5 / total5 : 0,
    discourse: per1k(discourseN),
    regMark: per1k(regMarkN),
    hedge: per1k(hedgeN),
    contraction: per1k(contractionN),
    firstPerson: per1k(firstPersonN),
    intens: per1k(intensN),
    passive: shareSent(passiveN),
    exclaimQ: shareSent(exclaimN),
    openerRep: (() => {
      const top = [...openerFirst.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      return shareSent(top.reduce((s, [, c]) => s + c, 0));
    })(),
    openerH: entropy(openerClass),
    paraCv: mean(paraLens) ? sd(paraLens) / mean(paraLens) : 0,
    gradeSd: grades.length > 2 ? sd(grades) : 2.4,
    flesch: fk,
    listRate: lines.length ? listLines / lines.length : 0,
    headRate: per1k(markup),
    paraSentCv: mean(paraSentCounts) ? sd(paraSentCounts) / mean(paraSentCounts) : 0,
    emDash: per1k(emDash),
    curly: curlyConsistency,
    doubleSpace,
    typo: per1k(slips),
    unicode: per1k(invisible),
  };

  // Parameters that need a minimum sample before they mean anything are held
  // neutral rather than allowed to fabricate evidence.
  const holds = {};
  const nSent = sentRows.length;
  if (totalWords < 600) holds.zipfDev = "needs 600+ words to fit a rank–frequency slope";
  if (totalWords < 300) holds.rep5 = "needs 300+ words before repetition means anything";
  if (grades.length < 3) holds.gradeSd = "needs 3+ paragraphs of 25 words or more";
  if (paraLens.length < 3) { holds.paraCv = "needs 3+ paragraphs"; holds.paraSentCv = "needs 3+ paragraphs"; }
  if (periods < 20) holds.doubleSpace = "needs 20+ sentence-ending periods";
  if (nSent < 12) { holds.sentKurt = "needs 12+ sentences"; holds.sentSkew = "needs 12+ sentences"; }
  if (nSent < 8) holds.flatRun = "needs 8+ sentences";
  if (totalWords < 200) { holds.hapax = "needs 200+ words"; holds.yulesK = "needs 200+ words"; }
  if (lines.length < 6) holds.listRate = "needs 6+ lines";

  const signals = SIGNAL_SPEC.map((base) => {
    const override = L.bands[base.id];
    const spec = override ? { ...base, ...override } : base;
    const value = raws[spec.id] ?? 0;
    const z = (value - spec.center) / spec.spread;
    const dev = spec.dir * z;
    const held = holds[spec.id] || L.holds[spec.id] || null;
    return {
      ...spec,
      value,
      z: held ? 0 : z,
      dev: held ? 0 : dev,
      evidence: held ? 0 : clamp(dev, -2.5, 2.5),
      weight: held ? 0 : spec.weight,
      held,
    };
  });

  const wsum = signals.reduce((s, g) => s + g.weight, 0) || 1;
  const logit = signals.reduce((s, g) => s + g.weight * g.evidence, 0) / wsum;
  const index = 1 / (1 + Math.exp(-1.55 * logit));

  const half = clamp(0.52 / Math.sqrt(1 + totalWords / 220) + 0.035, 0.035, 0.5);
  const families = [...new Set(SIGNAL_SPEC.map((s) => s.family))].map((f) => {
    const g = signals.filter((s) => s.family === f);
    const w = g.reduce((s, x) => s + x.weight, 0);
    return { family: f, score: w ? g.reduce((s, x) => s + x.weight * x.evidence, 0) / w : 0, signals: g };
  });

  onProgress({ phase: "Scoring", pct: 0.94 });
  await yieldToUI();

  // per-sentence tint
  const rows = sentRows.map((r) => {
    const zs = sSurp ? -(r.surp - mSurp) / sSurp : 0;
    const zl = 1 - Math.abs(r.n - 21) / 16;
    const s =
      0.42 * clamp(zs, -2, 2) / 2 +
      0.18 * clamp(zl, -1, 1) +
      0.20 * clamp(r.dm * 0.9, 0, 1) +
      0.28 * clamp(r.rm * 1.1, 0, 1) +
      0.08 * (r.passive ? 1 : 0) -
      0.22 * r.human;
    return { ...r, score: clamp(0.5 + s * 0.75, 0.02, 0.98) };
  });

  const topGrams = [...gram5.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const foundRegister = [];
  {
    const lower = text.toLowerCase();
    for (const m of L.registerMarkers) {
      let c = 0, idx = 0;
      while ((idx = lower.indexOf(m, idx)) !== -1) { c++; idx += m.length; }
      if (c) foundRegister.push([m, c]);
    }
    foundRegister.sort((a, b) => b[1] - a[1]);
  }

  onProgress({ phase: "Done", pct: 1 });

  return {
    index,
    percent: Math.round(index * 100),
    half, logit, signals, families, rows,
    language: {
      code: L.code,
      name: L.name,
      endonym: L.endonym,
      calibration: L.calibration,
      readabilityName: L.readabilityName,
      detected: !forced,
      confidence: forced ? null : detection.confidence ?? null,
      vocabSize: L.vocabSize,
    },
    stats: {
      chars: text.length, words: totalWords, types, sentences: rows.length,
      paragraphs: paras.length, syllables: syllTotal,
      flesch: fk, zipfSlope,
      surpMean: mSurp, surpSd: sSurp, meanLen: mLen,
    },
    topGrams,
    registerHits: foundRegister.slice(0, 14),
    reliability:
      totalWords < 120 ? "insufficient" : totalWords < 350 ? "low" : totalWords < 1200 ? "moderate" : "high",
  };
}
