import { useEffect, useRef, useState } from "react";
import { ACCEPTED } from "../engine/extract.js";
import { SPECIMENS } from "../engine/samples.js";
import { SUPPORTED } from "../engine/languages/index.js";

export default function Intake({ onFile, onText, busy, progress, error, note, source, hasReport, lastText }) {
  const [mode, setMode] = useState("file");
  const [draft, setDraft] = useState("");
  const [drag, setDrag] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lang, setLang] = useState("auto");
  const input = useRef(null);
  const pick = (l) => (l === "auto" ? undefined : l);

  useEffect(() => { if (hasReport) setExpanded(false); }, [hasReport, source]);

  if (hasReport && !expanded && !busy) {
    return (
      <section className="pt-7">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border border-[#CFC6B2] bg-[#F7F3EA] px-5 py-3">
          <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.16em] text-[#5B33C7]">On the plate</p>
          <h2 className="min-w-0 flex-1 truncate font-['Hedvig_Letters_Serif'] text-[26px] leading-none" title={source}>
            {source}
          </h2>
          <button
            type="button"
            onClick={() => { setMode("file"); setExpanded(true); }}
            className="border border-[#191B18] px-3.5 py-1.5 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.12em] text-[#191B18] transition-colors hover:bg-[#191B18] hover:text-[#EDE7DA]"
          >
            Examine another
          </button>
        </div>
        {note && (
          <p className="mt-4 border-l-[4px] border-[#C08A16] bg-[#C08A16]/[0.08] px-4 py-3 text-[14.5px] leading-[1.55] text-[#6A4C08]">
            {note}
          </p>
        )}
        {lastText && (
          <LangRow
            lang={lang}
            setLang={(v) => { setLang(v); onText(lastText, source, null, pick(v)); }}
            busy={busy}
            hint="Wrong language? Re-run with it set by hand."
          />
        )}
      </section>
    );
  }

  const drop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) onFile(f, pick(lang));
  };

  return (
    <section className="pt-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.18em] text-[#5B33C7]">Specimen intake</p>
          <h2 className="mt-1.5 max-w-[19ch] font-['Hedvig_Letters_Serif'] text-[38px] leading-[0.98] tracking-[-0.01em] sm:max-w-none sm:text-[46px]">
            Hand it the document.
          </h2>
        </div>
        <div className="flex items-center gap-0 border border-[#CFC6B2] bg-[#F7F3EA]">
          {["file", "paste"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-2 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.14em] transition-colors ${
                mode === m ? "bg-[#191B18] text-[#EDE7DA]" : "text-[#615A4A] hover:text-[#211F1A]"
              }`}
            >
              {m === "file" ? "Upload" : "Paste"}
            </button>
          ))}
        </div>
      </div>

      <LangRow lang={lang} setLang={setLang} busy={busy} hint="Detected automatically unless you pin it." />

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {mode === "file" ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={drop}
              onClick={() => input.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
              className={`group relative flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-6 py-8 text-center transition-colors ${
                drag ? "border-[#5B33C7] bg-[#5B33C7]/[0.06]" : "border-[#CFC6B2] bg-[#F7F3EA] hover:border-[#5B33C7]/60"
              }`}
            >
              <input
                ref={input}
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f, pick(lang)); e.target.value = ""; }}
              />
              <p className="font-['Hedvig_Letters_Serif'] text-[23px] leading-tight">
                Drop a file, or click to choose
              </p>
              <p className="font-['Fragment_Mono'] text-[12px] uppercase leading-[1.7] tracking-[0.04em] text-[#615A4A]">
                pdf · docx · odt · pptx · rtf · epub · html · txt · md
              </p>
              <p className="mt-1 max-w-[52ch] text-[14px] leading-[1.55] text-[#615A4A]">
                No size ceiling and no upload: the file is parsed and measured inside this tab, then forgotten when you close it.
              </p>
            </div>
          ) : (
            <div className="border border-[#CFC6B2] bg-[#F7F3EA]">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                placeholder="Paste the questioned text here. A paragraph works; 1,200 words or more makes the reading worth trusting."
                className="h-[168px] w-full resize-y bg-transparent px-4 py-3 font-['Asap'] text-[15px] leading-[1.6] text-[#211F1A] outline-none placeholder:text-[#615A4A]/60"
              />
              <div className="flex items-center justify-between border-t border-[#CFC6B2] px-4 py-2">
                <span className="font-['Fragment_Mono'] text-[12px] text-[#615A4A]">
                  {draft.trim() ? `${draft.trim().split(/\s+/).length.toLocaleString()} words` : "empty"}
                </span>
                <button
                  type="button"
                  disabled={busy || !draft.trim()}
                  onClick={() => onText(draft, "pasted text", null, pick(lang))}
                  className="bg-[#5B33C7] px-4 py-1.5 font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.14em] text-[#F7F3EA] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Examine
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border border-[#CFC6B2] bg-[#F7F3EA] p-4">
          <p className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.16em] text-[#615A4A]">Reference specimens</p>
          <div className="mt-3 space-y-2">
            {SPECIMENS.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => onText(s.text, s.label, null, pick(lang))}
                className="group block w-full border border-[#CFC6B2] bg-[#EDE7DA]/70 px-3 py-2.5 text-left transition-colors hover:border-[#5B33C7] hover:bg-[#5B33C7]/[0.05] disabled:opacity-40"
              >
                <span className="flex items-baseline gap-2">
                  <span className="font-['Fragment_Mono'] text-[12px] text-[#4A25AE]">{s.id}</span>
                  <span className="min-w-0 flex-1 text-[14px] font-medium">{s.label.split("· ")[1]}</span>
                  <span className="font-['Fragment_Mono'] text-[12px] uppercase text-[#615A4A]">{s.lang}</span>
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-[#615A4A]">{s.provenance}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {busy && (
        <div className="mt-4 border border-[#5B33C7]/40 bg-[#F7F3EA] px-4 py-3">
          <div className="flex items-baseline justify-between font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.14em] text-[#5B33C7]">
            <span>{progress?.phase || "Working"}</span>
            <span>{Math.round((progress?.pct || 0) * 100)}%</span>
          </div>
          <div className="mt-2 h-[6px] w-full overflow-hidden bg-[#CFC6B2]/60">
            <div
              data-anim
              className="h-full transition-[width] duration-200"
              style={{
                width: `${Math.max(3, (progress?.pct || 0) * 100)}%`,
                backgroundImage: "repeating-linear-gradient(115deg,#5B33C7 0 8px,#7A5AD8 8px 22px)",
                backgroundSize: "44px 100%",
                animation: "barberpole .8s linear infinite",
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 border-l-[4px] border-[#C0341C] bg-[#C0341C]/[0.06] px-4 py-3 text-[14.5px] leading-[1.55] text-[#8A2413]">
          {error}
        </p>
      )}
      {note && !error && (
        <p className="mt-4 border-l-[4px] border-[#C08A16] bg-[#C08A16]/[0.08] px-4 py-3 text-[14.5px] leading-[1.55] text-[#6A4C08]">
          {note}
        </p>
      )}
    </section>
  );
}

function LangRow({ lang, setLang, busy, hint }) {
  const options = [{ code: "auto", endonym: "Auto" }, ...SUPPORTED];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="font-['Fragment_Mono'] text-[12px] uppercase tracking-[0.16em] text-[#615A4A]">Language</span>
      <div className="flex flex-wrap border border-[#CFC6B2] bg-[#F7F3EA]">
        {options.map((o) => (
          <button
            key={o.code}
            type="button"
            disabled={busy}
            onClick={() => setLang(o.code)}
            aria-pressed={lang === o.code}
            className={`px-3 py-1.5 font-['Fragment_Mono'] text-[12px] tracking-[0.06em] transition-colors disabled:opacity-40 ${
              lang === o.code ? "bg-[#191B18] text-[#EDE7DA]" : "text-[#615A4A] hover:text-[#211F1A]"
            }`}
          >
            {o.endonym}
          </button>
        ))}
      </div>
      <span className="text-[13.5px] leading-[1.4] text-[#615A4A]">{hint}</span>
    </div>
  );
}
