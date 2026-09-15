import { fmt } from "./Verdict.jsx";

export default function Findings({ report }) {
  const live = report.signals.filter((g) => !g.held);
  const strongest = [...live].sort((a, b) => b.dev - a.dev).slice(0, 4);
  const exculpating = [...live].sort((a, b) => a.dev - b.dev).slice(0, 4);
  const held = report.signals.filter((g) => g.held);

  return (
    <section data-anim className="space-y-6 xl:sticky xl:top-6" style={{ animation: "riseIn 520ms ease-out both", animationDelay: "230ms" }}>
      <div className="border border-[#CFC6B2] bg-[#F7F3EA]">
        <p className="border-b border-[#CFC6B2] px-5 py-2.5 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">
          What is driving the number
        </p>
        <div className="grid gap-0 sm:grid-cols-2">
          <Column title="Toward machine" tone="#4A25AE" items={strongest} report={report} />
          <Column title="Toward human" tone="#0F5A50" items={exculpating} report={report} border />
        </div>
      </div>

      {held.length > 0 && (
        <div className="border border-[#CFC6B2] bg-[#F7F3EA]">
          <p className="border-b border-[#CFC6B2] px-5 py-2.5 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">
            Held neutral · {held.length} of {report.signals.length}
          </p>
          <p className="px-5 pt-3 text-[14px] leading-[1.55] text-[#615A4A]">
            These parameters need a bigger sample than this specimen gives, so they are measured but excluded from the index
            rather than allowed to invent evidence.
          </p>
          <ul className="px-5 pb-4 pt-2">
            {held.map((g) => (
              <li key={g.id} className="flex items-baseline justify-between gap-3 border-b border-dotted border-[#CFC6B2] py-1.5 last:border-0">
                <span className="text-[14px] leading-snug text-[#615A4A]">{g.label}</span>
                <span className="whitespace-nowrap font-['Fragment_Mono'] text-[12px] text-[#5F594A]">{fmt(g.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.registerHits.length > 0 && (
        <div className="border border-[#CFC6B2] bg-[#F7F3EA]">
          <p className="border-b border-[#CFC6B2] px-5 py-2.5 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">
            Register markers found · {report.registerHits.reduce((s, [, c]) => s + c, 0)} hits
          </p>
          <div className="flex flex-wrap gap-1.5 px-5 py-4">
            {report.registerHits.map(([m, c]) => (
              <span key={m} className="border border-[#C0341C]/30 bg-[#C0341C]/[0.06] px-2 py-1 font-['Fragment_Mono'] text-[12.5px] text-[#7E1F0F]">
                {m}{c > 1 && <span className="ml-1.5 opacity-60">×{c}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {report.topGrams.length > 0 && (
        <div className="border border-[#CFC6B2] bg-[#F7F3EA]">
          <p className="border-b border-[#CFC6B2] px-5 py-2.5 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">
            Repeated five-word strings
          </p>
          <ul className="divide-y divide-[#CFC6B2]/70">
            {report.topGrams.map(([g, c]) => (
              <li key={g} className="flex items-baseline gap-3 px-5 py-2">
                <span className="font-['Fragment_Mono'] text-[12px] text-[#4A25AE]">×{c}</span>
                <span className="text-[14px] leading-snug">{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border border-[#CFC6B2] bg-[#F7F3EA]">
        <p className="border-b border-[#CFC6B2] px-5 py-2.5 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">
          Raw measurements
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 px-5 py-4 font-['Fragment_Mono'] text-[12.5px]">
          {[
            ["characters", report.stats.chars.toLocaleString()],
            ["syllables", report.stats.syllables.toLocaleString()],
            ["surprisal μ", `${report.stats.surpMean.toFixed(3)} bits`],
            ["surprisal σ", `${report.stats.surpSd.toFixed(3)} bits`],
            ["Zipf slope s", report.stats.zipfSlope.toFixed(3)],
            [report.language.readabilityName, report.stats.flesch.toFixed(1)],
            ["composite logit", report.logit.toFixed(3)],
            ["interval halfwidth", `±${report.half.toFixed(3)}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-2 border-b border-dotted border-[#CFC6B2]">
              <dt className="text-[#615A4A]">{k}</dt>
              <dd className="text-[#211F1A]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Column({ title, tone, items, border, report }) {
  return (
    <div className={border ? "border-t border-[#CFC6B2] sm:border-l sm:border-t-0" : ""}>
      <p className="px-5 pt-4 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.14em]" style={{ color: tone }}>
        {title}
      </p>
      <ul className="px-5 pb-4 pt-2">
        {items.map((g) => (
          <li key={g.id} className="flex items-baseline justify-between gap-3 border-b border-dotted border-[#CFC6B2] py-1.5 last:border-0">
            <span className="text-[14px] leading-snug">{g.id === "flesch" ? report.language.readabilityName : g.label}</span>
            <span className="whitespace-nowrap font-['Fragment_Mono'] text-[12px] text-[#211F1A]">
              {fmt(g.value)}{" "}
              <span style={{ color: tone }}>{(g.dev >= 0 ? "+" : "") + g.dev.toFixed(1)}σ</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
