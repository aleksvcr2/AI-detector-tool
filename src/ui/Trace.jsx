import { useMemo, useState } from "react";

const CHANNELS = {
  surprisal: {
    label: "Surprisal",
    unit: "bits / word",
    pick: (r) => r.surp,
    band: [9.5, 11.7],
    blurb: "Each pen stroke is one sentence. A flat line is a machine holding one register; a jagged one is a person changing their mind.",
  },
  length: {
    label: "Sentence length",
    unit: "words",
    pick: (r) => r.n,
    band: [11, 27],
    blurb: "The rhythm of the document. Human writing spikes and collapses; generated prose walks at one pace.",
  },
};

const W = 660, H = 250, PAD = { t: 18, r: 12, b: 28, l: 46 };

export default function Trace({ report }) {
  const [ch, setCh] = useState("surprisal");
  const cfg = CHANNELS[ch];

  const view = useMemo(() => {
    const rows = report.rows;
    if (!rows.length) return null;
    const step = Math.max(1, Math.ceil(rows.length / 520));
    const pts = [];
    for (let i = 0; i < rows.length; i += step) {
      let acc = 0, n = 0;
      for (let k = i; k < Math.min(rows.length, i + step); k++) { acc += cfg.pick(rows[k]); n++; }
      pts.push(acc / n);
    }
    const [bl, bh] = cfg.band;
    let lo = Math.min(bl, ...pts), hi = Math.max(bh, ...pts);
    const pad = (hi - lo) * 0.12 || 1;
    lo -= pad; hi += pad;
    const x = (i) => PAD.l + (i / Math.max(1, pts.length - 1)) * (W - PAD.l - PAD.r);
    const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    const d = pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const mean = pts.reduce((a, b) => a + b, 0) / pts.length;
    const ticks = [lo + (hi - lo) * 0.12, mean, hi - (hi - lo) * 0.12];
    return { pts, d, lo, hi, x, y, mean, bandY: [y(bh), y(bl)], step, ticks };
  }, [report, ch, cfg]);

  if (!view) return null;
  const last = view.pts.length - 1;

  return (
    <section data-anim className="border border-[#CFC6B2] bg-[#F7F3EA]" style={{ animation: "riseIn 520ms ease-out both", animationDelay: "90ms" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#CFC6B2] px-5 py-2.5">
        <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#615A4A]">
          Chart recorder · {cfg.unit}
        </p>
        <div className="flex">
          {Object.entries(CHANNELS).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setCh(k)}
              className={`px-2.5 py-1 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.1em] transition-colors ${
                ch === k ? "bg-[#191B18] text-[#EDE7DA]" : "text-[#615A4A] hover:text-[#211F1A]"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#CFC6B2] px-5 py-1.5 font-['Fragment_Mono'] text-[12px] text-[#615A4A]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[10px] w-[18px] border-y border-dashed border-[#16776A]/70 bg-[#16776A]/[0.14]" />
          human reference band
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-px w-[18px] bg-[#5B33C7]" />
          this document's mean
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-px w-[18px] bg-[#191B18]" />
          pen
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`${cfg.label} per sentence across the document`}>
        <defs>
          <linearGradient id="nibGlow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5B33C7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#5B33C7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* graph paper */}
        {Array.from({ length: 9 }).map((_, i) => {
          const gx = PAD.l + (i / 8) * (W - PAD.l - PAD.r);
          return <line key={i} x1={gx} x2={gx} y1={PAD.t} y2={H - PAD.b} stroke="#191B18" strokeOpacity="0.07" strokeWidth="1" />;
        })}

        {/* human reference band */}
        <rect
          x={PAD.l} y={view.bandY[0]} width={W - PAD.l - PAD.r} height={Math.max(2, view.bandY[1] - view.bandY[0])}
          fill="#16776A" fillOpacity="0.13"
        />
        <line x1={PAD.l} x2={W - PAD.r} y1={view.bandY[0]} y2={view.bandY[0]} stroke="#16776A" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 4" />
        <line x1={PAD.l} x2={W - PAD.r} y1={view.bandY[1]} y2={view.bandY[1]} stroke="#16776A" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 4" />

        {/* document mean */}
        <line x1={PAD.l} x2={W - PAD.r} y1={view.y(view.mean)} y2={view.y(view.mean)} stroke="#5B33C7" strokeOpacity="0.5" strokeWidth="1" />

        {/* y ticks */}
        {view.ticks.map((t, i) => (
          <text key={i} x={PAD.l - 6} y={view.y(t) + 3.5} textAnchor="end" fill="#5A5344" fontSize="12" fontFamily="Fragment Mono, monospace">
            {t.toFixed(t > 40 ? 0 : 1)}
          </text>
        ))}

        {/* the pen */}
        <path
          key={ch}
          data-anim
          style={{ animation: "draw 1900ms ease-out both" }}
          d={view.d}
          fill="none"
          stroke="#191B18"
          strokeWidth="1.45"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
        />
        <circle cx={view.x(last)} cy={view.y(view.pts[last])} r="3.2" fill="#5B33C7" data-anim style={{ animation: "nibPulse 3.4s ease-in-out infinite" }} />

        <text x={PAD.l} y={H - 8} fill="#5A5344" fontSize="12" fontFamily="Fragment Mono, monospace" letterSpacing="0.06em">SENTENCE 1</text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" fill="#5A5344" fontSize="12" fontFamily="Fragment Mono, monospace">
          {report.rows.length.toLocaleString()}
        </text>
      </svg>

      <p className="border-t border-[#CFC6B2] px-5 py-3 text-[14px] leading-[1.55] text-[#615A4A]">
        {cfg.blurb}
        {view.step > 1 && (
          <span className="font-['Fragment_Mono'] text-[12.5px]"> Averaged {view.step} sentences per stroke to fit the carriage.</span>
        )}
      </p>
    </section>
  );
}
