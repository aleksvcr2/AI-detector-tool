import en from "./en.js";
import es from "./es.js";
import pt from "./pt.js";
import fr from "./fr.js";

const set = (s) => new Set(String(s).split(/\s+/).filter(Boolean).map((w) => w.toLowerCase()));
const list = (s) =>
  String(s)
    .split("|")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

/** Turn a raw pack into the compiled shape the analyzer consumes. */
function compile(pack) {
  const ranked = String(pack.ranked).split(/\s+/).filter(Boolean);
  const rank = new Map();
  ranked.forEach((w, i) => {
    const lw = w.toLowerCase();
    if (!rank.has(lw)) rank.set(lw, i + 1);
  });
  return {
    ...pack,
    rank,
    vocabSize: rank.size,
    functionWords: set(pack.functionWords),
    firstPerson: set(pack.firstPerson),
    abbreviations: set(pack.abbreviations),
    discourseMarkers: list(pack.discourseMarkers),
    registerMarkers: list(pack.registerMarkers),
    hedges: list(pack.hedges),
    intensifiers: list(pack.intensifiers),
    bands: pack.bands || {},
    holds: pack.holds || {},
  };
}

export const LANGUAGES = {
  en: compile(en),
  es: compile(es),
  pt: compile(pt),
  fr: compile(fr),
};

export const SUPPORTED = Object.values(LANGUAGES).map((l) => ({
  code: l.code,
  name: l.name,
  endonym: l.endonym,
  calibration: l.calibration,
}));

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

// High-frequency markers that are near-unique to each language. Detection is a
// stop-word hit-rate vote, which is reliable well below a hundred words.
const VOTES = {
  en: `the of and to in is that it was for with as his on be at by not this have from but they which you were her all she there would their we him been has when who will more no if out so said what up its about into than them can only other new some could time these two may then do first any my now such like our over man me even most made after also did many before must through back years where much your way well down should because each just those people mr how too little state good very make world still own see men work long get here between both life being under never day same another know while last might us great old year off come since against go came right used take three`,
  es: `de la que el en y a los se del las un por con no una su para es al lo como más pero sus le ya o este sí porque esta entre cuando muy sin sobre también me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos esto antes algunos unos otro otras otra tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros ser son era fue han había aunque mientras pues según hacia tras cada`,
  pt: `de que em não uma os no se na por mais as dos como mas foi ao ele das tem seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas esse eles estão você tinha foram essa num nem suas meu minha têm numa pelos elas havia seja qual nós lhe deles este dele são então porém ainda cada muitos outro outra`,
  fr: `le de un et en que qui ne pas plus par avec tout son autre mais nous comme mon lui leur vous ou si les des du au aux la une ces cette cet mes ses nos vos votre notre leurs elle ils elles dont où quand alors très bien aussi encore déjà toujours jamais souvent beaucoup trop assez moins plutôt enfin ensuite puis ainsi cependant car parce lorsque sans sous entre chez vers depuis pendant avant après contre selon est sont était être cela pour dans il sur se`,
  it: `di che è il la e in un per non con una sono si su come ma anche da questo dei delle nel alla lo se più della degli mi ha loro nella hanno essere può quando tutti solo qui perché ancora sempre molto dopo prima senza tra ogni fare stato suo mio questa quello cui`,
  de: `der die das und ist in den von zu mit sich des auf für nicht ein eine als auch es an werden aus er hat dass sie nach bei um noch wie über nur oder aber vor zur bis mehr durch man sein wurde sei einen wird ich sind wenn kann bereits alle diese dann ihre dem im wir`,
  nl: `de het een en van in is dat op te zijn met voor niet aan er die ook als maar om door over naar bij nog dan uit zo heeft worden werd deze wordt kan haar hun wij ons omdat alleen tussen zonder onder tegen sinds tijdens want dus`,
  ca: `de la el que en i a els les un amb no una per és del al això molt aquest aquesta però ja com més també fins des quan sobre entre sense cap seva seu nosaltres vostè aquells perquè encara sempre`,
  pl: `nie się na to jest że w z do o i a jak ale co tak by od po dla przez tylko oraz który która które być ma bardzo już tego jego jej ich nas was oni one gdy jeśli`,
  ru: `и в не на что он с как это по но они мы вы она из за для от так все еще его её их был была было быть или если когда только уже там где кто чтобы`,
  tr: `bir ve bu için de da ile ne olarak çok daha en gibi ama ancak kadar sonra önce her hiç şey olan var yok değil mi ki ise ya veya çünkü kendi onun bizim benim`,
  sv: `och att det som en är av för på med inte den till har de om han var men ett vi kan sig från så ska vid eller när alla över mot efter under bara mycket också`,
};

const VOTE_SETS = Object.fromEntries(Object.entries(VOTES).map(([k, v]) => [k, set(v)]));

const NAMES = {
  it: "Italian", de: "German", nl: "Dutch", ca: "Catalan", pl: "Polish",
  ru: "Russian", tr: "Turkish", sv: "Swedish",
};

/** Script check: a non-Latin document is rejected before word voting. */
function script(text) {
  const sample = text.slice(0, 4000);
  const counts = {
    latin: (sample.match(/[A-Za-z\u00c0-\u024f]/g) || []).length,
    cyrillic: (sample.match(/[\u0400-\u04ff]/g) || []).length,
    greek: (sample.match(/[\u0370-\u03ff]/g) || []).length,
    arabic: (sample.match(/[\u0600-\u06ff]/g) || []).length,
    hebrew: (sample.match(/[\u0590-\u05ff]/g) || []).length,
    cjk: (sample.match(/[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/g) || []).length,
    devanagari: (sample.match(/[\u0900-\u097f]/g) || []).length,
    thai: (sample.match(/[\u0e00-\u0e7f]/g) || []).length,
  };
  let best = "latin", bestN = 0;
  for (const [k, v] of Object.entries(counts)) if (v > bestN) { best = k; bestN = v; }
  return { name: best, count: bestN, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}

const SCRIPT_LABEL = {
  cyrillic: "a Cyrillic script (Russian, Ukrainian, Bulgarian or similar)",
  greek: "Greek",
  arabic: "an Arabic script",
  hebrew: "Hebrew",
  cjk: "Chinese, Japanese or Korean",
  devanagari: "a Devanagari script (Hindi, Marathi or similar)",
  thai: "Thai",
};

/**
 * Identify the language of a document.
 * Returns { code, pack, confidence, scores } for supported languages, or
 * { code, unsupportedName } when the language is recognised but not calibrated.
 */
export function detectLanguage(text) {
  const sc = script(text);
  if (sc.name !== "latin" && sc.count > sc.total * 0.35) {
    return { code: null, unsupportedName: SCRIPT_LABEL[sc.name] || sc.name, script: sc.name };
  }

  const tokens = (text.slice(0, 60000).toLowerCase().match(/[\p{L}][\p{L}'’]*/gu) || []).slice(0, 6000);
  if (tokens.length < 20) return { code: null, tooShort: true };

  const scores = {};
  for (const [code, words] of Object.entries(VOTE_SETS)) {
    let hits = 0;
    for (const t of tokens) if (words.has(t)) hits++;
    scores[code] = hits / tokens.length;
  }

  // Diacritic and orthography tiebreakers for the close Romance trio.
  const s = text.slice(0, 20000);
  const per1k = (re) => ((s.match(re) || []).length * 1000) / Math.max(1, s.length);
  scores.es += per1k(/[ñ¿¡]/g) * 0.02;
  scores.pt += per1k(/[ãõçâ]/g) * 0.02;
  scores.fr += per1k(/[çœêèùûîï]|\b[ldjnmts]['’]/g) * 0.015;
  scores.it += per1k(/\b(gli|degli|nell|dell|sull)\b/g) * 0.02;
  scores.de += per1k(/[äöüß]/g) * 0.015;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [top, topScore] = ranked[0];
  const runnerUp = ranked[1]?.[1] ?? 0;

  if (topScore < 0.035) return { code: null, unrecognised: true, scores };
  if (LANGUAGES[top]) {
    return {
      code: top,
      pack: LANGUAGES[top],
      confidence: Math.min(1, topScore / 0.25),
      margin: topScore - runnerUp,
      scores,
    };
  }
  return { code: top, unsupportedName: NAMES[top] || top, scores };
}
