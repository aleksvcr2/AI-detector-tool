/* Local document text extraction. No network, no third-party parsers:
   ZIP inflate rides on the browser's native DecompressionStream. */

const NUL_RE = new RegExp(String.fromCharCode(0), "g");

/* Tolerant inflate: PDF streams routinely carry a trailing newline or padding
   that makes a strict decoder throw, so keep whatever decoded cleanly. */
async function inflate(bytes, format) {
  const ds = new DecompressionStream(format);
  const reader = ds.readable.getReader();
  const writer = ds.writable.getWriter();
  writer.write(bytes).catch(() => {});
  writer.close().catch(() => {});
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
  } catch {
    /* truncated or junk-terminated: use what we have */
  }
  if (!total) throw new Error("Could not decompress an embedded stream.");
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

const dec = (b, enc = "utf-8") => new TextDecoder(enc, { fatal: false }).decode(b);

/* TextDecoder has no true Latin-1: every label maps to windows-1252, which
   rewrites bytes 0x80–0x9F and destroys binary round-trips. Do it by hand. */
function latin1(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  const STEP = 8192;
  for (let i = 0; i < u8.length; i += STEP) {
    out += String.fromCharCode.apply(null, u8.subarray(i, i + STEP));
  }
  return out;
}

/* ---------------- ZIP (docx, xlsx, pptx, odt, epub, key/pages) ------- */

async function unzip(buf) {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  // locate End of Central Directory
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  const files = new Map();
  if (eocd < 0) throw new Error("Not a readable archive.");
  let count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  if (off === 0xffffffff || count === 0xffff) throw new Error("Zip64 archives are not supported.");
  for (let i = 0; i < count && off + 46 <= u8.length; i++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true);
    const csize = dv.getUint32(off + 20, true);
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const commentLen = dv.getUint16(off + 32, true);
    const local = dv.getUint32(off + 42, true);
    const name = dec(u8.subarray(off + 46, off + 46 + nameLen));
    files.set(name, { method, csize, local });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return {
    names: [...files.keys()],
    async read(name) {
      const f = files.get(name);
      if (!f) return null;
      const nl = dv.getUint16(f.local + 26, true);
      const el = dv.getUint16(f.local + 28, true);
      const start = f.local + 30 + nl + el;
      const raw = u8.subarray(start, start + f.csize);
      if (f.method === 0) return raw;
      if (f.method === 8) return inflate(raw, "deflate-raw");
      throw new Error("Unsupported compression in archive.");
    },
  };
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function unescapeXml(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (m, g) => {
    if (g[0] === "#") return String.fromCodePoint(parseInt(g[1] === "x" || g[1] === "X" ? g.slice(2) : g.slice(1), g[1] === "x" || g[1] === "X" ? 16 : 10));
    return ENTITIES[g] ?? m;
  });
}

function xmlToText(xml, opts) {
  let s = xml;
  for (const [re, rep] of opts) s = s.replace(re, rep);
  s = s.replace(/<[^>]+>/g, "");
  return unescapeXml(s);
}

async function fromOfficeXml(buf, kind) {
  const zip = await unzip(buf);
  if (kind === "docx") {
    const parts = ["word/document.xml", ...zip.names.filter((n) => /^word\/(header|footer|footnotes|endnotes)\d*\.xml$/.test(n))];
    let out = "";
    for (const p of parts) {
      const b = await zip.read(p);
      if (!b) continue;
      out += xmlToText(dec(b), [
        [/<w:tab\/>/g, "\t"],
        [/<w:br\/?>/g, "\n"],
        [/<\/w:p>/g, "\n\n"],
      ]) + "\n\n";
    }
    return out;
  }
  if (kind === "pptx") {
    const slides = zip.names.filter((n) => /^ppt\/(slides|notesSlides)\/[^/]+\.xml$/.test(n))
      .sort((a, b) => (parseInt(a.match(/\d+/)?.[0] || 0) - parseInt(b.match(/\d+/)?.[0] || 0)));
    let out = "";
    for (const p of slides) {
      const b = await zip.read(p);
      if (!b) continue;
      out += xmlToText(dec(b), [[/<\/a:p>/g, "\n"], [/<\/a:tr>/g, "\n"]]) + "\n\n";
    }
    return out;
  }
  if (kind === "odf") {
    const b = await zip.read("content.xml");
    if (!b) throw new Error("No content.xml in the document.");
    return xmlToText(dec(b), [
      [/<text:tab\/>/g, "\t"],
      [/<text:line-break\/>/g, "\n"],
      [/<\/text:(p|h)>/g, "\n\n"],
    ]);
  }
  if (kind === "epub") {
    const docs = zip.names.filter((n) => /\.x?html?$/i.test(n)).sort();
    let out = "";
    for (const p of docs) {
      const b = await zip.read(p);
      if (b) out += htmlToText(dec(b)) + "\n\n";
    }
    return out;
  }
  throw new Error("Unsupported archive layout.");
}

/* ---------------- HTML / RTF ---------------- */

function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,noscript,svg,head").forEach((n) => n.remove());
  doc.querySelectorAll("p,div,li,br,h1,h2,h3,h4,h5,h6,tr,section,article,blockquote").forEach((n) => n.append("\n\n"));
  return (doc.body?.textContent || "").replace(/\n{3,}/g, "\n\n");
}

function rtfToText(s) {
  let t = s.replace(/\\'([0-9a-f]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16)));
  t = t.replace(/\{\\\*[^{}]*\}/g, "");
  t = t.replace(/\\par[d]?\b/g, "\n\n").replace(/\\line\b/g, "\n").replace(/\\tab\b/g, "\t");
  t = t.replace(/\\u(-?\d+)\s?\??/g, (m, n) => String.fromCharCode(((+n) + 65536) % 65536));
  t = t.replace(/\\[a-z]+-?\d* ?/gi, "").replace(/[{}]/g, "");
  return t;
}

/* ---------------- PDF ----------------
   A small but real PDF text extractor: object table, compressed object
   streams, per-font /ToUnicode CMaps, and vertical-jump paragraph recovery.
   Without the CMaps, any PDF written by Word or LibreOffice comes out as
   glyph indices, and every measurement downstream would be fiction. */

function pdfBytesFromLiteral(body) {
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== "\\") { out += c; continue; }
    const n = body[++i];
    if (n === "n") out += "\n";
    else if (n === "r") out += "\r";
    else if (n === "t") out += "\t";
    else if (n === "b" || n === "f") out += " ";
    else if (n >= "0" && n <= "7") {
      let oct = n;
      while (oct.length < 3 && body[i + 1] >= "0" && body[i + 1] <= "7") oct += body[++i];
      out += String.fromCharCode(parseInt(oct, 8) & 0xff);
    } else if (n === "\n" || n === "\r") { /* line continuation */ }
    else out += n;
  }
  return out;
}

function pdfBytesFromHex(hex) {
  const h = hex.replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  for (let i = 0; i < h.length; i += 2) {
    const pair = h.slice(i, i + 2).padEnd(2, "0");
    out += String.fromCharCode(parseInt(pair, 16));
  }
  return out;
}

/** Byte offsets of every `N 0 obj` in the file. */
function indexObjects(latin) {
  const table = new Map();
  const re = /(?:^|[\s>\]])(\d{1,9})\s+(\d{1,5})\s+obj\b/g;
  let m;
  while ((m = re.exec(latin)) !== null) {
    const num = +m[1];
    const bodyStart = m.index + m[0].length;
    const end = latin.indexOf("endobj", bodyStart);
    table.set(num, latin.slice(bodyStart, end < 0 ? Math.min(latin.length, bodyStart + 200000) : end));
    re.lastIndex = bodyStart;
  }
  return table;
}

function dictOf(body) {
  const i = body.indexOf("<<");
  if (i < 0) return "";
  let depth = 0;
  for (let j = i; j < body.length - 1; j++) {
    if (body[j] === "<" && body[j + 1] === "<") { depth++; j++; }
    else if (body[j] === ">" && body[j + 1] === ">") { depth--; j++; if (!depth) return body.slice(i, j + 1); }
  }
  return body.slice(i, Math.min(body.length, i + 4000));
}

async function rawStreamOf(body) {
  const si = body.indexOf("stream");
  if (si < 0) return null;
  let start = si + 6;
  if (body[start] === "\r") start++;
  if (body[start] === "\n") start++;
  let end = body.indexOf("endstream", start);
  if (end < 0) end = body.length;
  while (end > start && (body[end - 1] === "\n" || body[end - 1] === "\r")) end--;
  const dict = dictOf(body);
  const slice = body.slice(start, end);
  const bytes = new Uint8Array(slice.length);
  for (let i = 0; i < slice.length; i++) bytes[i] = slice.charCodeAt(i) & 0xff;
  if (/\/FlateDecode/.test(dict)) {
    try { return await inflate(bytes, "deflate"); }
    catch { try { return await inflate(bytes.subarray(2), "deflate-raw"); } catch { return null; } }
  }
  if (/\/(LZWDecode|ASCII85Decode|RunLengthDecode|DCTDecode|JPXDecode|JBIG2Decode|CCITTFaxDecode)/.test(dict)) return null;
  return bytes;
}

/** Expand /ObjStm containers so PDF 1.5+ files expose their objects too. */
async function expandObjectStreams(table) {
  const entries = [...table.entries()];
  for (const [, body] of entries) {
    const dict = dictOf(body);
    if (!/\/Type\s*\/ObjStm/.test(dict)) continue;
    const data = await rawStreamOf(body);
    if (!data) continue;
    const text = latin1(data);
    const n = +(dict.match(/\/N\s+(\d+)/) || [0, 0])[1];
    const first = +(dict.match(/\/First\s+(\d+)/) || [0, 0])[1];
    const header = text.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i++) {
      const num = header[i * 2];
      const off = header[i * 2 + 1];
      if (!Number.isFinite(num) || !Number.isFinite(off)) continue;
      const nextOff = i + 1 < n ? header[i * 2 + 3] : text.length - first;
      if (!table.has(num)) table.set(num, text.slice(first + off, first + (nextOff ?? text.length)));
    }
  }
}

const refNum = (s) => {
  const m = /(\d+)\s+\d+\s+R/.exec(s || "");
  return m ? +m[1] : null;
};

function parseCMap(text) {
  const map = new Map();
  let srcBytes = 1;
  const toStr = (hex) => {
    let out = "";
    for (let i = 0; i + 4 <= hex.length; i += 4) out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    if (hex.length % 4) out += String.fromCharCode(parseInt(hex.slice(hex.length - (hex.length % 4)).padEnd(4, "0"), 16));
    return out;
  };
  const charRe = /beginbfchar([\s\S]*?)endbfchar/g;
  let m;
  while ((m = charRe.exec(text)) !== null) {
    const pairRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g;
    let q;
    while ((q = pairRe.exec(m[1])) !== null) {
      if (q[1].length > 2) srcBytes = 2;
      map.set(parseInt(q[1], 16), toStr(q[2]));
    }
  }
  const rangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((m = rangeRe.exec(text)) !== null) {
    const body = m[1];
    const itemRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[[\s\S]*?\]|<[0-9a-fA-F]*>)/g;
    let q;
    while ((q = itemRe.exec(body)) !== null) {
      const lo = parseInt(q[1], 16), hi = parseInt(q[2], 16);
      if (q[1].length > 2) srcBytes = 2;
      if (hi - lo > 65535) continue;
      if (q[3][0] === "[") {
        const items = q[3].match(/<([0-9a-fA-F]*)>/g) || [];
        items.forEach((it, k) => map.set(lo + k, toStr(it.slice(1, -1))));
      } else {
        const base = q[3].slice(1, -1);
        const baseVal = parseInt(base, 16);
        for (let c = lo; c <= hi; c++) {
          const v = baseVal + (c - lo);
          map.set(c, toStr(v.toString(16).padStart(Math.max(4, base.length), "0")));
        }
      }
    }
  }
  return { map, srcBytes };
}

async function buildFonts(table) {
  const fonts = new Map();
  for (const [num, body] of table) {
    const dict = dictOf(body);
    if (!/\/Type\s*\/Font/.test(dict)) continue;
    const twoByte = /\/Subtype\s*\/Type0/.test(dict) || /Identity-[HV]/.test(dict);
    let map = null, srcBytes = twoByte ? 2 : 1;
    const tu = refNum((dict.match(/\/ToUnicode\s+([^\/>]+)/) || [])[1]);
    if (tu != null && table.has(tu)) {
      const data = await rawStreamOf(table.get(tu));
      if (data) {
        const parsed = parseCMap(latin1(data));
        if (parsed.map.size) { map = parsed.map; srcBytes = Math.max(parsed.srcBytes, twoByte ? 2 : 1); }
      }
    }
    fonts.set(num, { map, srcBytes });
  }
  return fonts;
}

function collectPages(table) {
  const pages = [];
  for (const [num, body] of table) {
    const dict = dictOf(body);
    if (!/\/Type\s*\/Page\b/.test(dict)) continue;
    let res = dict.match(/\/Resources\s*(<<[\s\S]*)/);
    let resDict = "";
    if (res) resDict = dictOf(res[1]);
    else {
      const r = refNum((dict.match(/\/Resources\s+([^\/>]+)/) || [])[1]);
      if (r != null && table.has(r)) resDict = dictOf(table.get(r));
    }
    const fontMap = new Map();
    const fm = /\/Font\s*(<<[\s\S]*?>>)/.exec(resDict);
    if (fm) {
      const inner = fm[1];
      const re = /\/([A-Za-z0-9#+.\-_]+)\s+(\d+)\s+\d+\s+R/g;
      let q;
      while ((q = re.exec(inner)) !== null) fontMap.set(q[1], +q[2]);
    } else {
      const fr = refNum((resDict.match(/\/Font\s+([^\/>]+)/) || [])[1]);
      if (fr != null && table.has(fr)) {
        const re = /\/([A-Za-z0-9#+.\-_]+)\s+(\d+)\s+\d+\s+R/g;
        let q;
        const inner = dictOf(table.get(fr));
        while ((q = re.exec(inner)) !== null) fontMap.set(q[1], +q[2]);
      }
    }
    const contents = [];
    const cm = dict.match(/\/Contents\s*\[([^\]]*)\]/);
    if (cm) {
      const re = /(\d+)\s+\d+\s+R/g;
      let q;
      while ((q = re.exec(cm[1])) !== null) contents.push(+q[1]);
    } else {
      const c = refNum((dict.match(/\/Contents\s+([^\/>]+)/) || [])[1]);
      if (c != null) contents.push(c);
    }
    pages.push({ num, fontMap, contents });
  }
  pages.sort((a, b) => a.num - b.num);
  return pages;
}

/** Content-stream interpreter. Text plus the vertical jumps between lines, so
    a real paragraph break can be told apart from a wrapped line afterwards. */
function renderContent(cs, fontMap, fonts) {
  const parts = [];
  const n = cs.length;
  let i = 0;
  const stack = [];
  let font = null;
  let leading = 0;
  let lineY = null;
  let fresh = false;

  const decode = (bytes) => {
    const f = font;
    if (!f || !f.map) {
      let s = "";
      for (let k = 0; k < bytes.length; k++) s += bytes[k];
      return s;
    }
    const w = f.srcBytes;
    let s = "";
    for (let k = 0; k + w <= bytes.length; k += w) {
      let code = 0;
      for (let b = 0; b < w; b++) code = (code << 8) | (bytes.charCodeAt(k + b) & 0xff);
      const v = f.map.get(code);
      s += v != null ? v : w === 1 ? bytes[k] : "";
    }
    return s;
  };

  const text = (v) => { if (v) parts.push({ t: "t", v }); };
  const gap = (d) => parts.push({ t: "g", d: Math.abs(d) });
  const moveRel = (dy) => { if (lineY != null) lineY += dy; gap(dy); };
  const moveAbs = (y) => { const d = lineY == null ? null : lineY - y; lineY = y; if (d != null) gap(d); };

  while (i < n) {
    const c = cs[i];
    if (c === "(") {
      let depth = 1, j = i + 1, body = "";
      while (j < n) {
        if (cs[j] === "\\") { body += cs[j] + (cs[j + 1] ?? ""); j += 2; continue; }
        if (cs[j] === "(") depth++;
        else if (cs[j] === ")") { depth--; if (!depth) break; }
        body += cs[j]; j++;
      }
      stack.push({ t: "s", v: pdfBytesFromLiteral(body) });
      i = j + 1;
      continue;
    }
    if (c === "<" && cs[i + 1] !== "<") {
      const j = cs.indexOf(">", i);
      if (j < 0) break;
      stack.push({ t: "s", v: pdfBytesFromHex(cs.slice(i + 1, j)) });
      i = j + 1;
      continue;
    }
    if (c === "<" || c === ">") { i += 2; continue; }
    if (c === "[" || c === "]" || c === "{" || c === "}") { i++; continue; }
    if (c === "/") {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9#+.\-_]/.test(cs[j])) j++;
      stack.push({ t: "name", v: cs.slice(i + 1, j) });
      i = j;
      continue;
    }
    if (c === "-" || c === "+" || c === "." || (c >= "0" && c <= "9")) {
      let j = i;
      while (j < n && /[-+.\d]/.test(cs[j])) j++;
      stack.push({ t: "n", v: parseFloat(cs.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z'"*]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9*'"]/.test(cs[j])) j++;
      const op = cs.slice(i, j);
      const nums = stack.filter((x) => x.t === "n").map((x) => x.v);
      if (op === "Tf") {
        const name = [...stack].reverse().find((x) => x.t === "name");
        const objNum = name ? fontMap.get(name.v) : null;
        font = objNum != null ? fonts.get(objNum) || null : null;
      } else if (op === "TJ") {
        for (const x of stack) {
          if (x.t === "s") text(decode(x.v));
          else if (x.t === "n" && x.v < -170) text(" ");
        }
      } else if (op === "Tj") {
        for (const x of stack) if (x.t === "s") text(decode(x.v));
      } else if (op === "'" || op === '"') {
        moveRel(-(leading || 12));
        for (const x of stack) if (x.t === "s") text(decode(x.v));
      } else if (op === "TL") {
        if (nums.length) leading = Math.abs(nums[nums.length - 1]);
      } else if (op === "Td" || op === "TD") {
        if (nums.length >= 2) {
          const ty = nums[nums.length - 1];
          if (op === "TD") leading = Math.abs(ty);
          // Td is relative to the line matrix, which every BT resets: the first
          // Td of a text block is effectively an absolute page position.
          if (fresh) { moveAbs(ty); fresh = false; } else moveRel(ty);
        }
      } else if (op === "T*") {
        moveRel(-(leading || 12));
        fresh = false;
      } else if (op === "Tm") {
        if (nums.length >= 6) { moveAbs(nums[nums.length - 1]); fresh = false; }
      } else if (op === "BT") {
        fresh = true;
      }
      stack.length = 0;
      i = j;
      continue;
    }
    i++;
  }

  // Smallest real vertical step in this stream is the line height; anything
  // meaningfully larger is a paragraph break.
  let line = Infinity;
  for (const p of parts) if (p.t === "g" && p.d > 2 && p.d < line) line = p.d;
  const threshold = Number.isFinite(line) ? line * 1.35 : Infinity;

  let out = "";
  for (const p of parts) {
    if (p.t === "t") { out += p.v; continue; }
    if (p.d < 0.6) { out += " "; continue; }
    out += p.d > threshold ? "\n\n" : "\n";
  }
  return out;
}

/** Rejoin the hard line wrapping a PDF page imposes on its paragraphs. */
function reflow(text) {
  let t = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  t = t.replace(/(\w)-\n(?!\n)([a-z])/g, "$1$2");
  t = t
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .reduce((acc, line) => {
          const l = line.trim();
          if (!l) return acc;
          if (!acc) return l;
          if (/[.!?:;"'\u201d\u2019)]$/.test(acc) && /^[A-Z\u201c(]/.test(l)) return acc + " " + l;
          return acc + " " + l;
        }, "")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
  return t.replace(/[ \t]{2,}/g, " ");
}

async function fromPdf(buf) {
  const u8 = new Uint8Array(buf);
  const latin = latin1(u8);
  const table = indexObjects(latin);
  let text = "";

  if (table.size) {
    try { await expandObjectStreams(table); } catch { /* keep the plain objects */ }
    const fonts = await buildFonts(table);
    const pages = collectPages(table);
    for (const page of pages) {
      let cs = "";
      for (const num of page.contents) {
        const body = table.get(num);
        if (!body) continue;
        const data = await rawStreamOf(body);
        if (data) cs += latin1(data) + "\n";
      }
      if (!cs) continue;
      text += renderContent(cs, page.fontMap, fonts) + "\n\n";
    }
  }

  // Fallback for files whose object table could not be read: sweep every stream.
  if (!/[A-Za-z]{3,}/.test(text)) {
    const re = /stream\r?\n?/g;
    let m;
    const parts = [];
    while ((m = re.exec(latin)) !== null) {
      const dictStart = latin.lastIndexOf("<<", m.index);
      const dict = dictStart >= 0 ? latin.slice(dictStart, m.index) : "";
      if (/\/(Image|DCTDecode|JPXDecode|XRef|Metadata|EmbeddedFile|JBIG2Decode|CCITTFaxDecode)/.test(dict)) continue;
      const start = m.index + m[0].length;
      let end = latin.indexOf("endstream", start);
      if (end < 0) end = latin.length;
      let e2 = end;
      while (e2 > start && (u8[e2 - 1] === 10 || u8[e2 - 1] === 13)) e2--;
      let bytes = u8.subarray(start, e2);
      if (/\/FlateDecode/.test(dict)) {
        try { bytes = await inflate(bytes, "deflate"); } catch { continue; }
      } else if (/\/(LZWDecode|ASCII85Decode|RunLengthDecode)/.test(dict)) continue;
      const sdec = latin1(bytes);
      if (!/\bBT\b|\bTj\b|\bTJ\b/.test(sdec)) continue;
      parts.push(renderContent(sdec, new Map(), new Map()));
      re.lastIndex = Math.min(latin.length, end);
    }
    text = parts.join("\n\n");
  }

  if (!/[A-Za-z]{3,}/.test(text)) throw new Error("No extractable text layer. This looks like a scanned PDF: run OCR on it first, or paste the text.");
  return reflow(text.replace(NUL_RE, ""));
}

/* ---------------- entry point ---------------- */

export const ACCEPTED = ".txt,.md,.markdown,.text,.csv,.log,.rtf,.html,.htm,.xml,.json,.pdf,.docx,.doc,.odt,.pptx,.epub,.tex";

export async function extractText(file, onProgress = () => {}) {
  const name = (file.name || "").toLowerCase();
  const ext = name.slice(name.lastIndexOf(".") + 1);
  onProgress({ phase: "Reading file", pct: 0.02 });

  const plain = ["txt", "text", "md", "markdown", "csv", "log", "tex", "json", "srt", "vtt"];
  if (plain.includes(ext) || (!ext && file.type.startsWith("text/"))) {
    const t = await readTextStreaming(file, onProgress);
    return { text: t, note: null };
  }

  const buf = await readBuffer(file, onProgress);
  onProgress({ phase: "Extracting text", pct: 0.5 });

  if (ext === "pdf") {
    const text = await fromPdf(buf);
    const legible = legibility(text);
    return {
      text,
      note: legible < 0.45
        ? "This PDF's fonts carry no reliable character map, so extraction is partial. Paste the text instead for a trustworthy reading."
        : null,
    };
  }
  if (ext === "docx") return { text: await fromOfficeXml(buf, "docx"), note: null };
  if (ext === "pptx") return { text: await fromOfficeXml(buf, "pptx"), note: "Slide text only: speaker notes and shapes without text frames are skipped." };
  if (ext === "odt" || ext === "ods" || ext === "odp") return { text: await fromOfficeXml(buf, "odf"), note: null };
  if (ext === "epub") return { text: await fromOfficeXml(buf, "epub"), note: null };
  if (ext === "rtf") return { text: rtfToText(latin1(new Uint8Array(buf))), note: null };
  if (ext === "html" || ext === "htm" || ext === "xhtml") return { text: htmlToText(dec(new Uint8Array(buf))), note: null };
  if (ext === "doc") {
    const t = latin1(new Uint8Array(buf)).replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\u024f]+/g, " ");
    const words = t.match(/[A-Za-z]{2,}/g) || [];
    if (words.length < 50) throw new Error("Legacy .doc binaries are not readable here. Save as .docx or paste the text.");
    return { text: t.replace(/\s{3,}/g, "\n\n"), note: "Legacy .doc format: extraction is approximate. Typography signals are unreliable for this file." };
  }
  // last resort: treat as text if it decodes cleanly
  const t = dec(new Uint8Array(buf));
  if (legibility(t) > 0.6) return { text: t, note: `Unrecognised extension .${ext}, read as plain text.` };
  throw new Error(`Cannot read .${ext} files. Supported: PDF, DOCX, ODT, PPTX, RTF, EPUB, HTML, TXT, MD.`);
}

function legibility(text) {
  const sample = text.slice(0, 20000);
  if (!sample) return 0;
  const good = (sample.match(/[A-Za-z0-9\s.,;:'"()\-?!]/g) || []).length;
  return good / sample.length;
}

function readBuffer(file, onProgress) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onprogress = (e) => e.lengthComputable && onProgress({ phase: "Reading file", pct: 0.02 + 0.4 * (e.loaded / e.total) });
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(new Error("Could not read the file."));
    fr.readAsArrayBuffer(file);
  });
}

/** Streamed read so multi-hundred-megabyte text files never land in one string twice. */
async function readTextStreaming(file, onProgress) {
  if (!file.stream) return file.text();
  const reader = file.stream().pipeThrough(new TextDecoderStream("utf-8", { fatal: false })).getReader();
  const parts = [];
  let seen = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    seen += value.length;
    onProgress({ phase: "Reading file", pct: 0.02 + 0.4 * Math.min(1, seen / Math.max(1, file.size)) });
  }
  return parts.join("");
}
