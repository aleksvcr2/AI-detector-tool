import { useMemo, useState } from "react";

export function band(index) {
  if (index < 0.28) return { label: "Consistent with human authorship", tone: "#16776A", short: "human" };
  if (index < 0.45) return { label: "Leans human", tone: "#3F7C57", short: "leans human" };
  if (index < 0.58) return { label: "Indeterminate", tone: "#9A6E0F", short: "indeterminate" };
  if (index < 0.75) return { label: "Leans machine-assisted", tone: "#7B3FBA", short: "leans machine" };
  return { label: "Consistent with machine generation", tone: "#5B33C7", short: "machine" };
}

const RELIABILITY = {
  insufficient: ["Insufficient sample", "Under 120 words. Treat the index as noise."],
  low: ["Low confidence", "Under 350 words. The interval is wider than the answer."],
  moderate: ["Moderate confidence", "Enough text for a direction, not a conclusion."],
  high: ["Best available confidence", "Sample is large enough for the signals to stabilise."],
};

export default function Verdict({ report, source }) {
  const [copied, setCopied] = useState(false);
  const b = band(report.index);
  const lo = Math.max(0, report.index - report.half);
  const hi = Math.min(1, report.index + report.half);
  const [relLabel, relNote] = RELIABILITY[report.reliability];
  const s = report.stats;

  const text = useMemo(() => buildReport(report, source), [report, source]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section data-anim className="border border-[#CFC6B2] bg-[#F7F3EA]" style={{ animation: "riseIn 520ms ease-out both" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-[#CFC6B2] px-5 py-2.5">
        <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">Machine-style score</p>
        <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.14em]" style={{ color: b.tone }}>{relLabel}</p>
      </div>

      <div className="flex items-end gap-4 px-5 pt-5">
        <p className="font-['Hedvig_Letters_Serif'] leading-[0.78] tracking-[-0.03em]" style={{ color: b.tone }}>
          <span className="text-[86px]">{report.percent}</span>
          <span className="text-[40px]">%</span>
        </p>
        <div className="pb-1.5">
          <p className="font-['Hedvig_Letters_Serif'] text-[22px] leading-[1.08]" style={{ color: b.tone }}>{b.label}</p>
          <p className="mt-1 font-['Fragment_Mono'] text-[12.5px] text-[#615A4A]">
            95% interval {Math.round(lo * 100)}% – {Math.round(hi * 100)}%
          </p>
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="relative h-[34px]">
          <div className="absolute inset-x-0 top-[13px] h-[8px] bg-[linear-gradient(to_right,#16776A,#8FAE7E_28%,#C08A16_50%,#9A72D0_72%,#5B33C7)] opacity-90" />
          <div
            className="absolute top-[9px] h-[16px] border-x-[2px] border-[#191B18]/70 bg-[#191B18]/[0.12]"
            style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }}
          />
          <div className="absolute top-[3px] h-[28px] w-[3px] bg-[#191B18]" style={{ left: `calc(${report.index * 100}% - 1.5px)` }} />
        </div>
        <div className="flex justify-between font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.12em] text-[#615A4A]">
          <span>0% human habits</span>
          <span>50%</span>
          <span>machine habits 100%</span>
        </div>
        <p className="mt-2.5 text-[14px] leading-[1.5] text-[#615A4A]">{relNote}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-[#CFC6B2] px-5 py-2.5">
        <span className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.14em] text-[#615A4A]">Language</span>
        <span className="border border-[#5B33C7]/40 bg-[#5B33C7]/[0.07] px-2 py-0.5 font-['Fragment_Mono'] text-[12px] text-[#4A25AE]">
          {report.language.endonym}
        </span>
        <span className="font-['Fragment_Mono'] text-[12px] text-[#615A4A]">
          {report.language.detected ? "detected" : "set manually"}
          {report.language.calibration === "secondary" && " · bands less calibrated than English"}
        </span>
      </div>

      <dl className="grid grid-cols-3 border-t border-[#CFC6B2] text-center">
        {[
          ["words", s.words.toLocaleString()],
          ["sentences", s.sentences.toLocaleString()],
          ["paragraphs", s.paragraphs.toLocaleString()],
          ["types", s.types.toLocaleString()],
          ["mean length", `${s.meanLen.toFixed(1)}w`],
          [report.language.readabilityName.split(" ")[0].toLowerCase() + " score", s.flesch.toFixed(0)],
        ].map(([k, v], i) => (
          <div key={k} className={`px-2 py-2.5 ${i % 3 !== 2 ? "border-r" : ""} ${i < 3 ? "border-b" : ""} border-[#CFC6B2]`}>
            <dd className="font-['Fragment_Mono'] text-[15px] text-[#211F1A]">{v}</dd>
            <dt className="mt-0.5 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.12em] text-[#615A4A]">{k}</dt>
          </div>
        ))}
      </dl>

      <div className="border-t border-[#CFC6B2] px-5 py-3">
        <button
          type="button"
          onClick={copy}
          className="w-full border border-[#191B18] bg-transparent px-4 py-2 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.14em] text-[#191B18] transition-colors hover:bg-[#191B18] hover:text-[#EDE7DA]"
        >
          {copied ? "Report copied ✓" : "Copy full report"}
        </button>
      </div>
    </section>
  );
}

function buildReport(r, source) {
  const b = band(r.index);
  const L = [];
  L.push("QUESTIONED TEXT EXAMINER — stylometric provenance report");
  L.push(`specimen: ${source || "untitled"}`);
  L.push(`generated: ${new Date().toISOString()}`);
  L.push("");
  L.push(`MACHINE-STYLE SCORE: ${r.percent}%   (95% CI ${Math.round(Math.max(0, r.index - r.half) * 100)}%–${Math.round(Math.min(1, r.index + r.half) * 100)}%)`);
  L.push(`reading: ${b.label}`);
  L.push(`sample reliability: ${r.reliability}`);
  L.push(`language: ${r.language.name} (${r.language.endonym}), ${r.language.detected ? "auto-detected" : "set manually"}${r.language.calibration === "secondary" ? ", reference bands less calibrated than English" : ""}`);
  L.push(`underlying index: ${r.index.toFixed(3)} on 0–1`);
  L.push("");
  L.push(`words ${r.stats.words} · types ${r.stats.types} · sentences ${r.stats.sentences} · paragraphs ${r.stats.paragraphs}`);
  L.push(`mean sentence ${r.stats.meanLen.toFixed(1)}w · surprisal ${r.stats.surpMean.toFixed(2)}±${r.stats.surpSd.toFixed(2)} bits · Zipf slope ${r.stats.zipfSlope.toFixed(3)} · ${r.language.readabilityName} ${r.stats.flesch.toFixed(1)}`);
  L.push("");
  L.push("FAMILY SCORES  (−1 human … +1 machine)");
  for (const f of r.families) L.push(`  ${f.family.padEnd(16)} ${(f.score >= 0 ? "+" : "") + f.score.toFixed(2)}`);
  L.push("");
  L.push("PARAMETERS  observed | human reference band | deviation");
  for (const g of r.signals) {
    const lo = g.center - g.spread, hi = g.center + g.spread;
    L.push(
      `  ${g.label.padEnd(30)} ${fmt(g.value).padStart(9)} | ${fmt(lo)}–${fmt(hi)} | ${
        g.held ? "held neutral (" + g.held + ")" : (g.dev >= 0 ? "+" : "") + g.dev.toFixed(2) + "σ" + (g.dev > 1 ? "  << machine" : g.dev < -1 ? "  << human" : "")
      }`,
    );
  }
  if (r.registerHits.length) {
    L.push("");
    L.push("REGISTER MARKERS FOUND");
    for (const [m, c] of r.registerHits) L.push(`  ${c}× "${m}"`);
  }
  if (r.topGrams.length) {
    L.push("");
    L.push("REPEATED 5-GRAMS");
    for (const [g, c] of r.topGrams) L.push(`  ${c}× "${g}"`);
  }
  L.push("");
  L.push("CAVEAT: this instrument measures style, not origin. It is not Turnitin, ZeroGPT or");
  L.push("QuillBot and does not reproduce any proprietary classifier. Non-native writers,");
  L.push("edited text, legal boilerplate, translations and short samples all read as more");
  L.push("synthetic than they are. Do not take a decision affecting a person on this output");
  L.push("alone.");
  return L.join("\n");
}

/** The readability formula differs per language; keep the tile label short. */
export function readabilityShort(name) {
  return name.split(" ")[0].toLowerCase() + " score";
}

export function fmt(v) {
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  return v.toFixed(3);
}
