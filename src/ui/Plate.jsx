import { useMemo, useState } from "react";

const PAGE = 260;

function tint(score) {
  const d = score - 0.5;
  const a = Math.min(0.26, Math.abs(d) * 0.55);
  return d >= 0 ? `rgba(91,51,199,${a.toFixed(3)})` : `rgba(22,119,106,${a.toFixed(3)})`;
}

export default function Plate({ report }) {
  const [page, setPage] = useState(0);
  const [hover, setHover] = useState(null);
  const pages = Math.max(1, Math.ceil(report.rows.length / PAGE));
  const p = Math.min(page, pages - 1);

  const slice = useMemo(() => report.rows.slice(p * PAGE, p * PAGE + PAGE), [report, p]);
  const blocks = useMemo(() => {
    const out = [];
    let cur = [];
    for (const r of slice) {
      if (r.nl >= 2 && cur.length) { out.push(cur); cur = []; }
      cur.push(r);
    }
    if (cur.length) out.push(cur);
    return out;
  }, [slice]);

  const h = hover != null ? report.rows[hover] : null;

  return (
    <section data-anim className="flex min-h-[520px] flex-col border border-[#CFC6B2] bg-[#F7F3EA]" style={{ animation: "riseIn 520ms ease-out both", animationDelay: "40ms" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#CFC6B2] px-5 py-2.5">
        <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">
          Plate 01 · sentence stain
        </p>
        <div className="flex items-center gap-3 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.1em]">
          <span className="flex items-center gap-1.5 text-[#16776A]">
            <span className="inline-block h-[10px] w-[18px]" style={{ background: "rgba(22,119,106,.26)" }} /> human
          </span>
          <span className="flex items-center gap-1.5 text-[#5B33C7]">
            <span className="inline-block h-[10px] w-[18px]" style={{ background: "rgba(91,51,199,.26)" }} /> machine
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6" style={{ maxHeight: "min(72vh, 780px)" }}>
        {blocks.map((b, bi) => (
          <p key={bi} className="mb-[1.05em] text-[16.5px] leading-[1.78] last:mb-0">
            {b.map((r) => (
              <span
                key={r.i}
                onMouseEnter={() => setHover(r.i)}
                onFocus={() => setHover(r.i)}
                tabIndex={0}
                className="cursor-help rounded-[2px] outline-none transition-[background-color] duration-150 focus-visible:ring-2 focus-visible:ring-[#5B33C7]"
                style={{
                  backgroundColor: hover === r.i ? "rgba(25,27,24,.14)" : tint(r.score),
                  boxShadow: r.rm > 0 ? "inset 0 -2px 0 #C0341C" : undefined,
                }}
              >
                {r.text}{" "}
              </span>
            ))}
          </p>
        ))}
      </div>

      <div className="border-t border-[#CFC6B2] px-5 py-2.5">
        {h ? (
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 font-['Fragment_Mono'] text-[12px] text-[#615A4A]">
            <span className="text-[#211F1A]">sentence {h.i + 1}</span>
            <span>{h.n} words</span>
            <span>surprisal {h.surp.toFixed(2)} bits</span>
            <span>Δ {(h.surp - report.stats.surpMean >= 0 ? "+" : "") + (h.surp - report.stats.surpMean).toFixed(2)}</span>
            {h.dm > 0 && <span className="text-[#5B33C7]">{h.dm} discourse marker{h.dm > 1 ? "s" : ""}</span>}
            {h.rm > 0 && <span className="text-[#C0341C]">{h.rm} register marker{h.rm > 1 ? "s" : ""}</span>}
            {h.passive && <span>passive</span>}
            <span className="ml-auto" style={{ color: h.score >= 0.5 ? "#5B33C7" : "#16776A" }}>
              stain {h.score.toFixed(2)}
            </span>
          </div>
        ) : (
          <p className="font-['Fragment_Mono'] text-[12px] text-[#615A4A]">
            hover a sentence for its own measurements · red underline marks a register-marker phrase
          </p>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-[#CFC6B2] px-5 py-2">
          <button
            type="button"
            disabled={p === 0}
            onClick={() => setPage(p - 1)}
            className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.12em] text-[#5B33C7] disabled:opacity-30"
          >
            ← previous
          </button>
          <span className="font-['Fragment_Mono'] text-[12px] text-[#615A4A]">
            sentences {(p * PAGE + 1).toLocaleString()}–{Math.min(report.rows.length, (p + 1) * PAGE).toLocaleString()} of {report.rows.length.toLocaleString()}
          </span>
          <button
            type="button"
            disabled={p >= pages - 1}
            onClick={() => setPage(p + 1)}
            className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.12em] text-[#5B33C7] disabled:opacity-30"
          >
            next →
          </button>
        </div>
      )}
    </section>
  );
}
