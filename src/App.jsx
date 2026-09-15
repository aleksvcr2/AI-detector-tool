/* ─────────────────────────────────────────────────────────────────────────
   SUBJECT
   A questioned-document examination bench for text provenance. Audience:
   a legal or academic reader holding a document and one question — was this
   typed by a person? Single job: lay out every measurable stylometric signal,
   with its human reference band, and refuse to pretend the result is proof.

   STOLEN LOGIC
   The forensic questioned-document worksheet: specimens labelled K (known)
   and Q (questioned), values reported against reference bands, a chart
   recorder's pen trace, and an examiner's caveat that outranks the number.

   PLAN
   Type  — Hedvig Letters Serif for statements and figures (its optical
           imperfections are the exact quality this instrument measures),
           Asap for interface, Fragment Mono for every measured value.
   Color — chromatography paper #EDE7DA / #F7F3EA, chassis ink #191B18,
           organic pole teal #16776A, synthetic pole violet #5B33C7,
           flag red #C0341C, rule #CFC6B2. Violet leads.
   Layout— graph-paper bench. Chassis header, intake slot, then two columns:
           stained specimen plate left, instrument stack right, findings and
           caveat across the foot.
   ┌────────────────────────────────────────────────────────┐
   │ ▓ CHASSIS  QUESTIONED TEXT EXAMINER      41 params ▓   │
   │ ┌ intake ─────────────────────────────────────────┐    │
   │ │ drop / paste          K1  Q1        [EXAMINE]   │    │
   │ └─────────────────────────────────────────────────┘    │
   │ ┌ PLATE 01 ───────────┐ ┌ INDEX 0.83 ±0.09 ──────┐    │
   │ │ tinted sentences    │ │ ~~~/\~~pen trace~~~~~  │    │
   │ │ hover → readout     │ │ ladder: 41 ticks vs    │    │
   │ └─────────────────────┘ │ shaded reference rail  │    │
   │ FINDINGS · EXAMINER'S CAVEAT                           │
   └────────────────────────────────────────────────────────┘
   Signature — the deviation ladder: every parameter as one tick against a
   shaded human rail, the whole document's character in a single column.
   ───────────────────────────────────────────────────────────────────────── */

import { useCallback, useState } from "react";
import { analyze, SIGNAL_SPEC } from "./engine/analyze.js";
import { SUPPORTED } from "./engine/languages/index.js";
import { extractText } from "./engine/extract.js";
import Intake from "./ui/Intake.jsx";
import Verdict from "./ui/Verdict.jsx";
import Trace from "./ui/Trace.jsx";
import Ladder from "./ui/Ladder.jsx";
import Plate from "./ui/Plate.jsx";
import Findings from "./ui/Findings.jsx";
const NUL_RE = new RegExp(String.fromCharCode(0), "g");

export default function App() {
  const [report, setReport] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [source, setSource] = useState(null);
  const [lastText, setLastText] = useState("");

  const run = useCallback(async (raw, label, extraNote, lang) => {
    setError(null);
    setNote(extraNote || null);
    setReport(null);
    setSource(label);
    setLastText(raw || "");
    if (!raw || raw.replace(/\s/g, "").length < 40) {
      setProgress(null);
      setError("Too little text to examine. Give it at least a paragraph.");
      return;
    }
    setProgress({ phase: "Segmenting", pct: 0.01 });
    try {
      const r = await analyze(raw, setProgress, { lang });
      setReport(r);
    } catch (e) {
      setError(e?.message || "Analysis failed.");
    } finally {
      setProgress(null);
    }
  }, []);

  const onFile = useCallback(
    async (file, lang) => {
      setError(null);
      setReport(null);
      setProgress({ phase: "Reading file", pct: 0.01 });
      try {
        const { text: t, note: n } = await extractText(file, setProgress);
        const clean = (t || "").replace(NUL_RE, "").trim();
        if (clean.replace(/\s/g, "").length < 40) {
          throw new Error("No usable text came out of that file. If it is a scan, run OCR first.");
        }
        await run(clean, file.name, n, lang);
      } catch (e) {
        setProgress(null);
        setError(e?.message || "Could not read that file.");
      }
    },
    [run],
  );

  const busy = progress !== null;

  return (
    <div className="min-h-screen bg-[#EDE7DA] text-[#211F1A] antialiased selection:bg-[#5B33C7] selection:text-[#F7F3EA]">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hedvig+Letters+Serif:opsz@12..24&family=Asap:ital,wght@0,400..700;1,400..600&family=Fragment+Mono:ital@0;1&display=swap" />
      <style>{CSS}</style>

      <div className="min-h-screen" style={PAPER}>
        <Chassis count={SIGNAL_SPEC.length} />

        <main className="mx-auto w-full max-w-[1360px] px-5 pb-24 sm:px-8">
          <Intake
            onFile={onFile}
            onText={run}
            busy={busy}
            progress={progress}
            error={error}
            note={note}
            source={source}
            hasReport={!!report}
            lastText={lastText}
          />

          {report && (
            <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_460px] xl:grid-cols-[minmax(0,1fr)_520px]">
              <div className="order-2 lg:order-1">
                <Plate report={report} />
              </div>
              <div className="order-1 space-y-6 lg:order-2 lg:sticky lg:top-6">
                <Verdict report={report} source={source} />
                <Trace report={report} />
              </div>
            </div>
          )}

          {report && (
            <div className="mt-6 grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
              <Ladder report={report} />
              <Findings report={report} />
            </div>
          )}

          {!report && <Bench />}
          <Caveat />
        </main>
      </div>
    </div>
  );
}

function Chassis({ count }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#000]/40 bg-[#191B18] text-[#EDE7DA] shadow-[0_1px_0_rgba(255,255,255,.06)_inset]">
      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-baseline gap-x-5 gap-y-1 px-5 py-3 sm:px-8">
        <span data-anim className="h-2.5 w-2.5 shrink-0 translate-y-[-2px] rounded-full bg-[#5B33C7] shadow-[0_0_10px_2px_rgba(91,51,199,.6)]" style={{ animation: "nibPulse 3.4s ease-in-out infinite" }} />
        <h1 className="font-['Hedvig_Letters_Serif'] text-[19px] leading-none tracking-[0.01em] sm:text-[22px]">
          Questioned Text Examiner
        </h1>
        <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.16em] text-[#EDE7DA]/85">
          stylometric provenance bench
        </p>
        <p className="ml-auto font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.14em] text-[#EDE7DA]/90">
          {count} parameters · {SUPPORTED.length} languages · nothing leaves this tab
        </p>
      </div>
    </header>
  );
}

const FAMILY_BLURB = {
  Rhythm: "How sentence length moves through the document. The loudest tell there is.",
  Predictability: "Word-level surprisal, and how much it swings from sentence to sentence.",
  Lexicon: "Vocabulary range, repetition, and the words used exactly once.",
  Register: "Connectives, hedges, contractions, passives, how sentences open.",
  Structure: "Paragraph shape and whether reading difficulty ever changes.",
  Typography: "Em dashes, quote marks, slips of the finger, invisible characters.",
};

function Bench() {
  const groups = [...new Set(SIGNAL_SPEC.map((s) => s.family))].map((f) => ({
    family: f,
    n: SIGNAL_SPEC.filter((s) => s.family === f).length,
  }));
  return (
    <section className="mt-6 border border-[#CFC6B2] bg-[#F7F3EA]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[#CFC6B2] px-5 py-2.5">
        <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">
          What the bench measures
        </p>
        <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.12em] text-[#615A4A]">
          {SUPPORTED.map((l) => l.endonym).join(" · ")}
        </p>
      </div>
      <div className="-mb-px -mr-px overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.family} className="border-b border-r border-[#CFC6B2] px-5 py-4">
              <div className="flex items-baseline gap-2">
                <h3 className="font-['Hedvig_Letters_Serif'] text-[23px] leading-none">{g.family}</h3>
                <span className="font-['Fragment_Mono'] text-[12px] text-[#5B33C7]">{g.n}</span>
              </div>
              <p className="mt-1.5 max-w-[38ch] text-[14px] leading-[1.5] text-[#615A4A]">{FAMILY_BLURB[g.family]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Caveat() {
  return (
    <section className="mt-6">
      <div className="relative overflow-hidden border border-[#C0341C]/35 bg-[#F7F3EA]">
        <div className="absolute inset-y-0 left-0 w-[5px] bg-[#C0341C]" />
        <div className="grid gap-5 p-6 pl-8 sm:grid-cols-[190px_minmax(0,1fr)] sm:p-7 sm:pl-9">
          <div>
            <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#C0341C]">Examiner's caveat</p>
            <p className="mt-2 font-['Hedvig_Letters_Serif'] text-[23px] leading-[1.08]">Read this before the number.</p>
          </div>
          <div className="space-y-3 text-[15px] leading-[1.62] text-[#3B372F]">
            <p>
              This bench measures <strong>style</strong>, not origin. It reports how far a document sits from the statistical
              habits of unassisted human prose. That is evidence, and it is genuinely useful evidence, but it is not a
              confession and it cannot be one.
            </p>
            <p>
              It is not Turnitin, ZeroGPT or QuillBot. Those are proprietary neural classifiers running on someone else's
              server, and their metrics are not published, so nothing local can reproduce their numbers. What you get here is
              the open layer underneath them: burstiness, surprisal variance, lexical diversity, register, structure,
              typography. Every value is shown with the reference band it is judged against, so you can disagree with the
              instrument.
            </p>
            <p className="text-[#615A4A]">
              Known failure modes: non-native writers, heavily edited or copy-edited text, technical and legal boilerplate,
              translations, and any human who writes in a formal, even register all read as more synthetic than they are.
              Machine text a person has rewritten reads as more human than it is. Short samples are close to worthless: under
              350 words the confidence interval swallows the answer. Spanish, Portuguese and French bands are informed priors
              rather than corpus-fitted, so treat those scores as directional. Never take a decision that affects a person on
              this output alone.
            </p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]/70">
        The Mendoza Law Firm · bench build 1 · all computation local
      </p>
    </section>
  );
}

export const PAPER = {
  backgroundImage: [
    "linear-gradient(to right, rgba(25,27,24,.045) 1px, transparent 1px)",
    "linear-gradient(to bottom, rgba(25,27,24,.045) 1px, transparent 1px)",
    "linear-gradient(to right, rgba(25,27,24,.028) 1px, transparent 1px)",
    "linear-gradient(to bottom, rgba(25,27,24,.028) 1px, transparent 1px)",
  ].join(","),
  backgroundSize: "96px 96px, 96px 96px, 16px 16px, 16px 16px",
};

const CSS = `
@keyframes nibPulse{0%,100%{opacity:.55;transform:translateY(-2px) scale(.9)}50%{opacity:1;transform:translateY(-2px) scale(1.12)}}
@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes riseIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes tickOut{from{transform:scaleX(.02);opacity:0}to{transform:scaleX(1);opacity:1}}
@keyframes barberpole{to{background-position:44px 0}}
@media (prefers-reduced-motion: reduce){
  [data-anim]{animation:none!important;stroke-dashoffset:0!important;transform:none!important;opacity:1!important}
}
`;
