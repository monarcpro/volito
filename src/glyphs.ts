/**
 * Glyph outlines for 3D text: a small TrueType reader (cmap, hmtx, loca, glyf with composite glyphs)
 * that turns a bundled face into a compact table — every printable Latin character's outline as a
 * quadratic path in units of 1/1000 em, y up — so the 3D kit can extrude, light and project text in
 * true perspective without a browser or a GPU. The same code runs in Node and in the browser player,
 * so a glyph is the same shape everywhere.
 */
import { type FontSpec, GRAPHIC_FONTS, fontSpecKey, parseFontSpec } from "./engine.js";

/** One face's glyphs: em units (1000), ascender/descender, and per character code [advance, path]. */
export interface GlyphTable {
  face: string;
  asc: number;
  desc: number;
  g: Record<string, [number, string]>;
}

/** The characters a table carries: printable ASCII, Latin-1 letters and signs, and common typography. */
export const GLYPH_CHARS: string = (() => {
  let s = "";
  for (let c = 32; c < 127; c++) s += String.fromCharCode(c);
  for (let c = 161; c < 256; c++) s += String.fromCharCode(c);
  return s + "–—‘’“”•…€™×÷−→←↑↓★✓";
})();

interface Point {
  x: number;
  y: number;
  on: boolean;
}

class Reader {
  private readonly v: DataView;
  constructor(readonly bytes: Uint8Array) {
    this.v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  u8 = (o: number) => this.v.getUint8(o);
  i8 = (o: number) => this.v.getInt8(o);
  u16 = (o: number) => this.v.getUint16(o);
  i16 = (o: number) => this.v.getInt16(o);
  u32 = (o: number) => this.v.getUint32(o);
  f2dot14 = (o: number) => this.v.getInt16(o) / 16384;
  tag = (o: number) => String.fromCharCode(this.u8(o), this.u8(o + 1), this.u8(o + 2), this.u8(o + 3));
}

/** A parsed TrueType face: enough to map characters to outlines and advances. */
export class TrueTypeFace {
  private readonly r: Reader;
  private readonly tables = new Map<string, number>();
  readonly unitsPerEm: number;
  readonly ascender: number;
  readonly descender: number;
  private readonly locaLong: boolean;
  private readonly numGlyphs: number;
  private readonly numHMetrics: number;
  private readonly cmap = new Map<number, number>();

  constructor(bytes: Uint8Array) {
    this.r = new Reader(bytes);
    const r = this.r;
    const n = r.u16(4);
    for (let i = 0; i < n; i++) this.tables.set(r.tag(12 + i * 16), r.u32(12 + i * 16 + 8));
    for (const t of ["head", "hhea", "hmtx", "maxp", "cmap", "loca", "glyf"]) if (!this.tables.has(t)) throw new Error(`not a TrueType outline font (no ${t} table)`);
    const head = this.at("head");
    this.unitsPerEm = r.u16(head + 18);
    this.locaLong = r.i16(head + 50) === 1;
    const hhea = this.at("hhea");
    this.ascender = r.i16(hhea + 4);
    this.descender = r.i16(hhea + 6);
    this.numHMetrics = r.u16(hhea + 34);
    this.numGlyphs = r.u16(this.at("maxp") + 4);
    this.readCmap();
  }

  private at(tag: string): number {
    return this.tables.get(tag)!;
  }

  private readCmap() {
    const r = this.r;
    const base = this.at("cmap");
    const n = r.u16(base + 2);
    let best = -1;
    let bestFormat = 0;
    for (let i = 0; i < n; i++) {
      const platform = r.u16(base + 4 + i * 8);
      const encoding = r.u16(base + 6 + i * 8);
      const off = base + r.u32(base + 8 + i * 8);
      const format = r.u16(off);
      const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
      if (!unicode) continue;
      if (format === 12 && bestFormat !== 12) {
        best = off;
        bestFormat = 12;
      } else if (format === 4 && bestFormat === 0) {
        best = off;
        bestFormat = 4;
      }
    }
    if (best < 0) return;
    if (bestFormat === 12) {
      const groups = r.u32(best + 12);
      for (let i = 0; i < groups; i++) {
        const g = best + 16 + i * 12;
        const start = r.u32(g), end = r.u32(g + 4), gid = r.u32(g + 8);
        for (let c = start; c <= end && c < 0x30000; c++) this.cmap.set(c, gid + (c - start));
      }
      return;
    }
    const segX2 = r.u16(best + 6);
    const ends = best + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
    for (let s = 0; s < segX2 / 2; s++) {
      const end = r.u16(ends + s * 2), start = r.u16(starts + s * 2), delta = r.i16(deltas + s * 2), rangeOff = r.u16(ranges + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let gid: number;
        if (rangeOff === 0) gid = (c + delta) & 0xffff;
        else {
          const at = ranges + s * 2 + rangeOff + (c - start) * 2;
          gid = r.u16(at);
          if (gid !== 0) gid = (gid + delta) & 0xffff;
        }
        if (gid) this.cmap.set(c, gid);
      }
    }
  }

  glyphIndex(code: number): number {
    return this.cmap.get(code) ?? 0;
  }

  advance(gid: number): number {
    const r = this.r;
    const hmtx = this.at("hmtx");
    return r.u16(hmtx + Math.min(gid, this.numHMetrics - 1) * 4);
  }

  private glyphRange(gid: number): [number, number] {
    const r = this.r;
    const loca = this.at("loca");
    const glyf = this.at("glyf");
    if (gid >= this.numGlyphs) return [0, 0];
    const a = this.locaLong ? r.u32(loca + gid * 4) : r.u16(loca + gid * 2) * 2;
    const b = this.locaLong ? r.u32(loca + gid * 4 + 4) : r.u16(loca + gid * 2 + 2) * 2;
    return [glyf + a, b - a];
  }

  /** A glyph's contours (points in font units, y up), composite glyphs resolved. */
  contours(gid: number, depth = 0): Point[][] {
    const r = this.r;
    const [off, len] = this.glyphRange(gid);
    if (len <= 0 || depth > 6) return [];
    const nContours = r.i16(off);
    if (nContours >= 0) {
      let p = off + 10;
      const ends: number[] = [];
      for (let i = 0; i < nContours; i++, p += 2) ends.push(r.u16(p));
      const nPoints = nContours ? ends[nContours - 1]! + 1 : 0;
      p += 2 + r.u16(p);
      const flags: number[] = [];
      while (flags.length < nPoints) {
        const f = r.u8(p++);
        flags.push(f);
        if (f & 8) {
          let rep = r.u8(p++);
          while (rep-- > 0) flags.push(f);
        }
      }
      const xs: number[] = [];
      let x = 0;
      for (const f of flags) {
        if (f & 2) {
          const d = r.u8(p++);
          x += f & 16 ? d : -d;
        } else if (!(f & 16)) {
          x += r.i16(p);
          p += 2;
        }
        xs.push(x);
      }
      const ys: number[] = [];
      let y = 0;
      for (const f of flags) {
        if (f & 4) {
          const d = r.u8(p++);
          y += f & 32 ? d : -d;
        } else if (!(f & 32)) {
          y += r.i16(p);
          p += 2;
        }
        ys.push(y);
      }
      const out: Point[][] = [];
      let start = 0;
      for (const end of ends) {
        const c: Point[] = [];
        for (let i = start; i <= end; i++) c.push({ x: xs[i]!, y: ys[i]!, on: (flags[i]! & 1) === 1 });
        if (c.length) out.push(c);
        start = end + 1;
      }
      return out;
    }
    // Composite: components, each placed by an offset and an optional scale or 2×2 matrix.
    const out: Point[][] = [];
    let p = off + 10;
    for (;;) {
      const flags = r.u16(p);
      const child = r.u16(p + 2);
      p += 4;
      let dx: number, dy: number;
      if (flags & 1) {
        dx = r.i16(p);
        dy = r.i16(p + 2);
        p += 4;
      } else {
        dx = r.i8(p);
        dy = r.i8(p + 1);
        p += 2;
      }
      let a = 1, b = 0, c = 0, d = 1;
      if (flags & 8) {
        a = d = r.f2dot14(p);
        p += 2;
      } else if (flags & 0x40) {
        a = r.f2dot14(p);
        d = r.f2dot14(p + 2);
        p += 4;
      } else if (flags & 0x80) {
        a = r.f2dot14(p);
        b = r.f2dot14(p + 2);
        c = r.f2dot14(p + 4);
        d = r.f2dot14(p + 6);
        p += 8;
      }
      // Point-matching placement (args are point numbers, flag 2 clear) is rare in Latin fonts: placed at 0,0.
      if (!(flags & 2)) dx = dy = 0;
      for (const contour of this.contours(child, depth + 1)) out.push(contour.map((q) => ({ x: a * q.x + c * q.y + dx, y: b * q.x + d * q.y + dy, on: q.on })));
      if (!(flags & 0x20)) break;
    }
    return out;
  }
}

/** A TrueType contour as path commands (M, L, Q, Z), scaled by s, numbers rounded. */
function contourPath(c: Point[], s: number): string {
  const n = c.length;
  if (!n) return "";
  const P = (q: { x: number; y: number }) => `${Math.round(q.x * s)} ${Math.round(q.y * s)}`;
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  // Start on an on-curve point (or the midpoint of two off-curve ones).
  let first = c.findIndex((q) => q.on);
  let start: { x: number; y: number };
  if (first < 0) {
    start = mid(c[0]!, c[1 % n]!);
    first = 0;
  } else start = c[first]!;
  let d = `M${P(start)}`;
  let ctrl: Point | null = null;
  for (let k = 1; k <= n; k++) {
    const q = c[(first + k) % n]!;
    if (q.on) {
      d += ctrl ? `Q${P(ctrl)} ${P(q)}` : `L${P(q)}`;
      ctrl = null;
    } else if (ctrl) {
      const m = mid(ctrl, q);
      d += `Q${P(ctrl)} ${P(m)}`;
      ctrl = q;
    } else ctrl = q;
  }
  if (ctrl) d += `Q${P(ctrl)} ${P(start)}`;
  return d + "Z";
}

/** The glyph table for a face: GLYPH_CHARS that the face has, in 1/1000 em. */
export function glyphTable(face: TrueTypeFace, key: string, chars = GLYPH_CHARS): GlyphTable {
  const s = 1000 / face.unitsPerEm;
  const g: Record<string, [number, string]> = {};
  for (const ch of chars) {
    const code = ch.codePointAt(0)!;
    const gid = face.glyphIndex(code);
    if (!gid && code !== 32) continue;
    const path = gid ? face.contours(gid).map((c) => contourPath(c, s)).join("") : "";
    g[String(code)] = [Math.round(face.advance(gid) * s), path];
  }
  return { face: key, asc: Math.round(face.ascender * s), desc: Math.round(face.descender * s), g };
}

/** The face a font spec resolves to ("Inter:900"), and the file holding its Latin cut. */
export function glyphFaceFile(spec: string | FontSpec): { key: string; file: string } {
  const f = typeof spec === "string" ? parseFontSpec(spec) : spec;
  const fam = GRAPHIC_FONTS[f.family] ? f.family : "Inter";
  const slug = fam.toLowerCase().replace(/\s+/g, "-");
  return { key: fontSpecKey({ family: fam, weight: f.weight, italic: false }), file: `${slug}-latin-${f.weight}-normal.ttf` };
}

/** Where glyph tables come from: Node reads the bundled files, the browser player preloads them. */
export type GlyphSource = (key: string, file: string) => GlyphTable | undefined;
let source: GlyphSource = () => undefined;
const cache = new Map<string, GlyphTable>();

export function setGlyphSource(fn: GlyphSource): void {
  source = fn;
  cache.clear();
}

/** A face's glyph table, from the current source (cached once found), or undefined when it cannot be had. */
export function glyphsFor(spec: string | FontSpec): GlyphTable | undefined {
  const { key, file } = glyphFaceFile(spec);
  const hit = cache.get(key);
  if (hit) return hit;
  const t = source(key, file);
  if (t) cache.set(key, t);
  return t;
}

/** Glyph tables as a program library: one literal the 3D kit reads (MM_GLYPHS). */
export function glyphLibrary(tables: GlyphTable[]): string {
  const map: Record<string, Omit<GlyphTable, "face">> = {};
  for (const t of tables) map[t.face] = { asc: t.asc, desc: t.desc, g: t.g };
  return `var MM_GLYPHS = ${JSON.stringify(map)};`;
}
