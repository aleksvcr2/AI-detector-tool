import { band } from "./Verdict.jsx";

/** The one-sentence version, for anyone who does not want to read a ladder. */
function verdictSentence(r) {
  const p = r.percent;
  if (p < 28) return "This reads like a person wrote it.";
  if (p < 45) return "This leans human, with some passages that read machine-like.";
  if (p < 58) return "This could go either way. The bench genuinely cannot tell.";
  if (p < 75) return "This leans machine-written, probably with human editing on top.";
  return "This reads like a machine wrote it.";
}

function trustSentence(r) {
  if (r.reliability === "insufficient") return "The sample is far too short to mean anything. Treat it as noise.";
  if (r.reliability === "low") return "The sample is short, so the number could easily be 20 points either way.";
  if (r.reliability === "moderate") return "Enough text for a direction, not a verdict.";
  return "The sample is long enough for the measurements to settle.";
}

export default function PlainReading({ report }) {
  const b = band(report.index);
  const human = report.humanPercent;
  const ai = report.percent;

  return (
    <section data-anim className="border border-[#CFC6B2] bg-[#F7F3EA]" style={{ animation: "riseIn 520ms ease-out both" }}>
      <p className="border-b border-[#CFC6B2] px-5 py-2.5 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">
        The short version
      </p>

      <div className="px-5 pt-5">
        <p className="font-['Hedvig_Letters_Serif'] text-[30px] leading-[1.12] tracking-[-0.01em]" style={{ color: b.tone }}>
          {verdictSentence(report)}
        </p>

        <div className="mt-5 flex items-stretch gap-0 border border-[#CFC6B2]">
          <div className="flex-1 px-4 py-3">
            <p className="font-['Hedvig_Letters_Serif'] text-[38px] leading-none text-[#16776A]">
              {human}
              <span className="text-[22px]">%</span>
            </p>
            <p className="mt-1 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.12em] text-[#0F5A50]">human</p>
          </div>
          <div className="flex-1 border-l border-[#CFC6B2] px-4 py-3">
            <p className="font-['Hedvig_Letters_Serif'] text-[38px] leading-none text-[#5B33C7]">
              {ai}
              <span className="text-[22px]">%</span>
            </p>
            <p className="mt-1 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.12em] text-[#4A25AE]">ai</p>
          </div>
        </div>

        <div className="mt-3 flex h-[12px] overflow-hidden border border-[#CFC6B2]">
          <div style={{ width: `${human}%`, background: "#16776A" }} />
          <div style={{ width: `${ai}%`, background: "#5B33C7" }} />
        </div>

        <p className="mt-3 text-[15px] leading-[1.55] text-[#3B372F]">{trustSentence(report)}</p>
      </div>

      {!report.shape.prose && (
        <div className="mt-4 border-t border-[#C0341C]/35 bg-[#C0341C]/[0.06] px-5 py-4">
          <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.14em] text-[#8A2413]">
            Ignore the number for this one
          </p>
          <p className="mt-1.5 text-[15px] leading-[1.55] text-[#7E1F0F]">
            This is a list or an outline, not flowing prose ({report.shape.reasons.join(", ")}). Documents shaped like this
            score human almost automatically, whoever wrote them, because every fragment looks like natural variation. Paste
            only the real sentences for an answer worth having.
          </p>
        </div>
      )}

      <p className="mt-4 border-t border-[#CFC6B2] px-5 py-3 text-[14px] leading-[1.5] text-[#615A4A]">
        Everything below shows how this number was reached. It measures writing style, not authorship: read the caveat at the
        foot of the page before it changes what you do about someone.
      </p>
    </section>
  );
}
