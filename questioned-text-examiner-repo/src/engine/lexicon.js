// Rank-ordered English word list (roughly descending corpus frequency).
// Used for a Zipf-Mandelbrot unigram surprisal model. Rank is the signal, not
// an exact count, so small ordering errors cost almost nothing.
const RANKED = `the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is are was were been has had said did more very may such many much own same those both each few while where why here should must might shall being does doing having through between before during under against without within upon among along across behind beyond toward towards since until unless although though however therefore thus hence moreover furthermore nevertheless meanwhile otherwise instead rather indeed perhaps maybe almost always never often sometimes usually already still yet again once twice ever quite really actually simply clearly obviously essentially basically generally specifically particularly especially mainly largely mostly entirely completely fully partly slightly somewhat extremely highly greatly significantly substantially relatively approximately
state case court law party agreement evidence report data system process result number part point group place problem question right fact thing world life hand eye head face man woman child family house home room door water food money business company market product service price cost value level rate change effect cause reason example form type kind area field line side end school student teacher book word name story night morning week month day hour minute second country city town street car road water air light dark power force energy nature health body mind heart mother father son daughter friend team member person player game team side team
begin keep hold bring write read speak tell ask answer call try need help show find feel seem become remain appear include provide require allow follow lead move run turn play live stand sit walk open close set put let mean leave stay watch hear learn teach study build create develop support increase reduce improve ensure consider determine identify describe explain discuss present apply base relate compare analyze review note offer accept reject prove claim argue decide agree deny grant order file serve issue enter sign send receive submit obtain refer apply appoint assign attend record repeat return remove replace reveal share store test track train treat visit wait want work
large small great little long short high low old young new early late big major minor local national public private social political economic financial legal medical technical general specific common special similar different various several single whole entire full empty clear dark light heavy strong weak hard soft easy difficult simple complex important necessary possible impossible available reasonable significant substantial relevant appropriate effective efficient successful useful helpful valuable serious severe critical central primary secondary final initial original current recent previous future past present next last other another certain uncertain likely unlikely true false real actual potential
i'm i've it's don't didn't doesn't can't won't wouldn't couldn't shouldn't isn't aren't wasn't weren't haven't hasn't hadn't you're we're they're he's she's that's what's there's let's i'll we'll you'll they'll i'd we'd you'd
plaintiff defendant counsel witness testimony deposition motion pleading statute regulation contract clause liability damages settlement claimant judgment appeal verdict jury hearing exhibit affidavit subpoena discovery negligence injury insurer policy premium coverage claim adjuster medical record treatment diagnosis therapy recovery accident collision vehicle driver passenger fault fee retainer client matter firm attorney paralegal
model system data analysis method approach framework structure function feature element factor variable measure metric sample population average median variance deviation distribution pattern trend signal noise threshold estimate probability confidence interval correlation regression cluster classification accuracy precision recall error bias baseline benchmark control experiment hypothesis evidence conclusion summary abstract section figure table appendix reference citation
tapestry realm delve navigate landscape underscore pivotal testament myriad plethora paradigm holistic robust seamless leverage utilize facilitate optimize enhance streamline foster cultivate embark unlock unleash harness intricate nuanced multifaceted comprehensive invaluable crucial vital paramount profound remarkable notable noteworthy compelling captivating fascinating intriguing`
  .split(/\s+/)
  .filter(Boolean);

const RANK = new Map();
RANKED.forEach((w, i) => {
  if (!RANK.has(w)) RANK.set(w, i + 1);
});

// Zipf-Mandelbrot: p(rank) = C / (rank + b)^s
const S = 1.07;
const B = 2.7;
let C = 0;
for (let r = 1; r <= 60000; r++) C += 1 / Math.pow(r + B, S);
C = 0.97 / C;

/** Effective rank for an out-of-vocabulary token, from its length. */
function oovRank(w) {
  const L = Math.max(3, Math.min(22, w.length));
  return Math.round(1200 * Math.pow(1.42, L - 4));
}

/** Surprisal in bits: -log2 p(word). Higher = less predictable. */
export function surprisal(word) {
  const w = word.toLowerCase();
  const r = RANK.get(w) ?? oovRank(w);
  const p = C / Math.pow(r + B, S);
  return -Math.log2(Math.max(p, 1e-12));
}

export const VOCAB_SIZE = RANK.size;
export function inVocab(w) {
  return RANK.has(w.toLowerCase());
}

export const FUNCTION_WORDS = new Set(
  `a an the of in on at to for with from by about into over after before between under above during without within against among along across through toward towards since until unless although though because if while and or but nor so yet than then that this these those it its he she they we you i me him her them us my your his their our not no nor as be been being am is are was were do does did have has had will would shall should can could may might must there here what which who whom whose when where why how all any both each few more most other some such only own same too very`.split(
    /\s+/,
  ),
);

export const DISCOURSE_MARKERS = [
  "however", "moreover", "furthermore", "therefore", "thus", "consequently",
  "in addition", "additionally", "nevertheless", "nonetheless", "on the other hand",
  "in contrast", "as a result", "for instance", "for example", "in conclusion",
  "to summarize", "in summary", "overall", "ultimately", "firstly", "secondly",
  "thirdly", "lastly", "finally", "in essence", "that said", "notably",
  "importantly", "subsequently", "accordingly", "hence", "whereas",
];

// Phrases that spiked in machine-written English. Presence is weak evidence on
// its own; density across a document is what the signal reads.
export const REGISTER_MARKERS = [
  "it is important to note", "it is worth noting", "it's important to note",
  "delve into", "a testament to", "rich tapestry", "tapestry of", "in the realm of",
  "navigate the", "navigating the", "the landscape of", "ever-evolving",
  "ever-changing", "plays a crucial role", "plays a vital role", "plays a pivotal role",
  "a myriad of", "a plethora of", "underscores the", "underscore the",
  "highlights the importance", "sheds light on", "at its core", "in today's",
  "when it comes to", "not only", "but also", "as we have seen",
  "in this article", "let's dive", "dive into", "unlock the", "unleash the",
  "harness the power", "seamless integration", "cutting-edge", "game-changer",
  "paradigm shift", "holistic approach", "robust framework", "leverage the",
  "foster a", "embark on", "a deep dive", "the key takeaway", "takeaways",
  "furthermore", "moreover", "in conclusion", "to conclude", "overall,",
  "it should be noted", "as an ai", "i hope this helps", "certainly!",
  "here's a", "step-by-step", "pros and cons", "in summary",
];

export const HEDGES = [
  "may", "might", "could", "can", "possibly", "potentially", "arguably",
  "generally", "typically", "often", "sometimes", "usually", "likely",
  "tends to", "tend to", "somewhat", "relatively", "appears to", "seems to",
  "suggests that", "in some cases", "to some extent", "largely", "broadly",
];

export const INTENSIFIERS = [
  "very", "really", "extremely", "incredibly", "absolutely", "totally",
  "utterly", "highly", "deeply", "truly", "quite", "so",
];

export const FIRST_PERSON = new Set(
  "i me my mine myself we us our ours ourselves i'm i've i'd i'll we're we've we'd we'll".split(/\s+/),
);

export const ABBREVIATIONS = new Set(
  `mr mrs ms dr prof rev hon st jr sr esq inc ltd llc llp co corp dept univ assn bros
   vs v etc eg ie cf al ibid id no nos fig figs ch chs sec secs art arts para paras
   pp p vol vols ed eds trans repr rev supra infra cir ct app div dist fed sup
   jan feb mar apr jun jul aug sept sep oct nov dec mon tue wed thu fri sat sun
   a b c d e f g h i j k l m n o p q r s t u v w x y z
   u.s u.k d.c a.m p.m e.g i.e approx est min max am pm`.split(/\s+/),
);
