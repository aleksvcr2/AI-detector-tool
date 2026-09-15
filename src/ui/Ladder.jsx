import { useState } from "react";
import { fmt } from "./Verdict.jsx";

const TEAL = "#16776A", VIOLET = "#5B33C7";
const TEAL_TXT = "#0F5A50", VIOLET_TXT = "#4A25AE";
const pos = (e) => ((Math.max(-2.5, Math.min(2.5, e)) + 2.5) / 5) * 100;

/** "Flesch reading ease" is English-specific; show the formula actually used. */
function label(signal, report) {
  if (signal.id === "flesch") return report.language.readabilityName;
  return signal.label;
}

export default function Ladder({ report }) {
  const [open, setOpen] = useState(null);

  return (
    <section data-anim className="border border-[#CFC6B2] bg-[#F7F3EA]" style={{ animation: "riseIn 520ms ease-out both", animationDelay: "160ms" }}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#CFC6B2] px-5 py-3">
        <div>
          <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">Deviation ladder</p>
          <h3 className="mt-1 font-['Hedvig_Letters_Serif'] text-[27px] leading-[1.05]">
            {report.signals.length} parameters, one rail.
          </h3>
        </div>
        <p className="max-w-[42ch] text-[14px] leading-[1.5] text-[#615A4A]">
          Each tick is one measurement placed against the band where unassisted human prose usually lands. Click any row for
          what it means. Values are the document's, bands are the reference.
        </p>
      </div>

      <div className="flex items-center gap-3 border-b border-[#CFC6B2] px-5 py-2 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.12em]">
        <span style={{ color: TEAL_TXT }}>← human</span>
        <span className="relative h-[10px] flex-1 bg-[linear-gradient(to_right,rgba(22,119,106,.3),rgba(22,119,106,.07)_40%,rgba(91,51,199,.07)_60%,rgba(91,51,199,.3))]">
          <span className="absolute inset-y-0 left-[30%] w-px bg-[#191B18]/20" />
          <span className="absolute inset-y-[-3px] left-1/2 w-px bg-[#191B18]/45" />
          <span className="absolute inset-y-0 left-[70%] w-px bg-[#191B18]/20" />
        </span>
        <span className="text-[#615A4A] normal-case tracking-normal">±1σ band</span>
        <span style={{ color: VIOLET_TXT }}>machine →</span>
      </div>

      <div>
        {report.families.map((f) => (
          <div key={f.family}>
            <div className="flex items-baseline gap-3 border-b border-[#CFC6B2] bg-[#EDE7DA]/70 px-5 py-1.5">
              <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.16em] text-[#211F1A]">{f.family}</p>
              <span className="h-px flex-1 bg-[#CFC6B2]" />
              <p className="font-['Fragment_Mono'] text-[12px]" style={{ color: f.score >= 0 ? VIOLET_TXT : TEAL_TXT }}>
                {(f.score >= 0 ? "+" : "") + f.score.toFixed(2)}
              </p>
            </div>
            {f.signals.map((g, i) => {
              const isOpen = open === g.id;
              const strong = Math.abs(g.evidence) > 1;
              const color = g.evidence >= 0 ? VIOLET : TEAL;
              const textColor = g.evidence >= 0 ? VIOLET_TXT : TEAL_TXT;
              const p = pos(g.evidence);
              return (
                <div key={g.id} className={i % 2 ? "bg-[#EDE7DA]/25" : ""}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : g.id)}
                    aria-expanded={isOpen}
                    className="grid w-full grid-cols-[minmax(0,1fr)_92px] items-center gap-x-3 px-5 py-[7px] text-left transition-colors hover:bg-[#5B33C7]/[0.05] sm:grid-cols-[minmax(0,196px)_minmax(0,1fr)_92px]"
                  >
                    <span className="truncate text-[14px] leading-tight" title={label(g, report)} style={g.held ? { color: "#5F594A" } : undefined}>
                      {label(g, report)}
                    </span>

                    <span className="relative col-span-2 h-[16px] sm:col-span-1">
                      <span className="absolute inset-y-[4px] left-[30%] w-[40%] bg-[#191B18]/[0.06]" />
                      <span className="absolute inset-y-0 left-1/2 w-px bg-[#191B18]/25" />
                      {g.held && (
                        <span className="absolute inset-0 flex items-center justify-center font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.12em] text-[#5F594A]">
                          held neutral
                        </span>
                      )}
                      {!g.held && <span
                        data-anim
                        className="absolute inset-y-[5px]"
                        style={{
                          left: `${Math.min(50, p)}%`,
                          width: `${Math.abs(p - 50)}%`,
                          background: color,
                          opacity: strong ? 0.85 : 0.42,
                          transformOrigin: g.evidence >= 0 ? "left center" : "right center",
                          animation: "tickOut 620ms ease-out both",
                          animationDelay: `${180 + i * 22}ms`,
                        }}
                      />}
                      {!g.held && <span
                        className="absolute inset-y-0 w-[2.5px]"
                        style={{ left: `calc(${p}% - 1.25px)`, background: color }}
                      />}
                    </span>

                    <span className="justify-self-end text-right font-['Fragment_Mono'] text-[12.5px] leading-tight" style={{ color: g.held ? "#5F594A" : strong ? textColor : "#211F1A" }}>
                      {fmt(g.value)}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-y border-[#CFC6B2] bg-[#F7F3EA] px-5 py-3">
                      <p className="max-w-[70ch] text-[14px] leading-[1.6] text-[#3B372F]">{g.why}</p>
                      {g.held && (
                        <p className="mt-2 text-[14px] leading-[1.5] text-[#8A6A10]">
                          Held neutral for this specimen: {g.held}. It is measured and shown, but excluded from the index.
                        </p>
                      )}
                      <p className="mt-2 font-['Fragment_Mono'] text-[12px] leading-[1.7] text-[#615A4A]">
                        observed <span className="text-[#211F1A]">{fmt(g.value)}{g.unit ? ` ${g.unit}` : ""}</span>
                        {"  ·  "}human band <span style={{ color: TEAL_TXT }}>{fmt(g.center - g.spread)}–{fmt(g.center + g.spread)}</span>
                        {!g.held && (
                          <>
                            {"  ·  "}<span style={{ color: textColor }}>{Math.abs(g.dev).toFixed(2)}σ toward {g.dev >= 0 ? "machine" : "human"}</span>
                            {"  ·  "}weight {g.weight.toFixed(1)}
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
