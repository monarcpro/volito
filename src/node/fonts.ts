/**
 * The faces Volito draws with (fonts/, built from Fontsource by scripts/build-fonts.mjs):
 * the text measure programs lay out with — the same advance widths a browser's canvas gives, so a
 * line that fits in MONARC PRO fits here — and which faces resvg sets each character in.
 *
 * Every script subset is its own family inside its file ("Inter latin-ext", "Inter cyrillic"):
 * resvg falls back glyph by glyph to the first face holding a glyph whatever its weight. So resvg
 * only ever sets Latin (a frame loads only the Latin cuts it names); text beyond a family's Latin cut
 * is shaped here and drawn as outlines (outline.ts), each character in the face faceFor() picks — the
 * family's own script cut, else the nearest weight of a family that has the script.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as fontkit from "fontkit";
import { fontsDir } from "./paths.js";

export interface Face {
  family: string;
  /** The family name inside the file: the family for latin, "Family subset" for the other scripts. */
  face: string;
  weight: number;
  italic: boolean;
  subset: string;
  /** CSS unicode-range of the subset. */
  range: string;
  file: string;
}

let faces: Face[] | null = null;

export function allFaces(): Face[] {
  if (faces) return faces;
  const index = join(fontsDir(), "faces.json");
  if (!existsSync(index)) throw new Error(`Volito: no fonts at ${fontsDir()} — run "pnpm run fonts" (or reinstall the package)`);
  faces = (JSON.parse(readFileSync(index, "utf8")) as { faces: Face[] }).faces;
  return faces;
}

export const familiesOf = (): string[] => [...new Set(allFaces().map((f) => f.family))];

/** Whether a CSS unicode-range ("U+0-FF, U+131, U+4??") includes a code point. */
export function rangeCovers(range: string, cp: number): boolean {
  if (!range) return true;
  for (const part of range.split(",")) {
    const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(part.trim());
    if (!m) continue;
    const lo = Number.parseInt(m[1]!.replace(/\?/g, "0"), 16);
    const hi = m[2] ? Number.parseInt(m[2], 16) : Number.parseInt(m[1]!.replace(/\?/g, "F"), 16);
    if (cp >= lo && cp <= hi) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Which face sets a character
// ---------------------------------------------------------------------------------------------

const subsetCache = new Map<string, Array<{ face: string; subset: string; range: string }>>();

/** The subsets of a family: name inside the file and range, latin first. */
function subsetsOf(family: string): Array<{ face: string; subset: string; range: string }> {
  let out = subsetCache.get(family);
  if (out) return out;
  const seen = new Set<string>();
  out = [];
  for (const f of allFaces()) {
    if (f.family !== family || seen.has(f.subset)) continue;
    seen.add(f.subset);
    out.push({ face: f.face, subset: f.subset, range: f.range });
  }
  out.sort((a, b) => Number(a.subset !== "latin") - Number(b.subset !== "latin"));
  subsetCache.set(family, out);
  return out;
}

const resolved = new Map<string, string | null>();

/**
 * The face (name inside the file) that sets code point `cp` for text in `family`: null when the
 * family's latin cut has it, else its own script cut, else Inter's, else any family's — null too
 * when no bundled face has it.
 */
export function faceFor(family: string, cp: number): string | null {
  const key = `${family}|${cp}`;
  const hit = resolved.get(key);
  if (hit !== undefined) return hit;
  let face: string | null = null;
  const own = subsetsOf(family);
  const latin = own.find((s) => s.subset === "latin");
  if (!(latin && (cp < 0x100 || rangeCovers(latin.range, cp)))) {
    const mine = own.find((s) => s.subset !== "latin" && rangeCovers(s.range, cp));
    if (mine) face = mine.face;
    else {
      for (const fam of ["Inter", ...familiesOf()]) {
        const s = subsetsOf(fam).find((x) => rangeCovers(x.range, cp));
        if (s) {
          face = s.face;
          break;
        }
      }
    }
  }
  if (resolved.size > 50_000) resolved.clear();
  resolved.set(key, face);
  return face;
}

/** The family a face name belongs to ("Inter cyrillic" → Inter). */
const familyOfFace = (face: string): string => allFaces().find((f) => f.face === face)?.family ?? face;

/** The font files a finished frame document names (every weight of each face), Inter's latin cut always. */
export function fontFilesForDocument(doc: string): string[] {
  const names = new Set(["Inter"]);
  for (const m of doc.matchAll(/font-family="([^"]+)"/g)) {
    for (const part of m[1]!.split(",")) {
      const n = part.trim().replace(/^['"]|['"]$/g, "");
      if (n) names.add(n);
    }
  }
  const dir = fontsDir();
  return allFaces()
    .filter((f) => names.has(f.face))
    .map((f) => join(dir, f.file));
}

/** Every file of the given families' latin cuts (for documents whose text is plain Latin, like a contact sheet's labels). */
export function fontFilesFor(families: Iterable<string>): string[] {
  const want = new Set(["Inter", ...families]);
  const dir = fontsDir();
  return allFaces()
    .filter((f) => want.has(f.family) && f.subset === "latin")
    .map((f) => join(dir, f.file));
}

// ---------------------------------------------------------------------------------------------
// Measure
// ---------------------------------------------------------------------------------------------

const fontCache = new Map<string, fontkit.Font>();
export const loadFont = (file: string): fontkit.Font => {
  let f = fontCache.get(file);
  if (!f) {
    f = fontkit.create(readFileSync(join(fontsDir(), file)));
    fontCache.set(file, f);
  }
  return f;
};

/** The file of a face (name inside the file) at the weight nearest `weight`. */
export function fileOf(face: string, weight: number, italic: boolean): string | null {
  const pool = allFaces().filter((f) => f.face === face);
  const styled = pool.filter((f) => f.italic === italic);
  const list = styled.length ? styled : pool;
  if (!list.length) return null;
  return list.reduce((b, f) => (Math.abs(f.weight - weight) < Math.abs(b.weight - weight) ? f : b), list[0]!).file;
}

/** The fontkit font that sets `cp` in `family` at `weight` — the same choice the renderer makes. */
export function fontForChar(family: string, weight: number, italic: boolean, cp: number): fontkit.Font | null {
  const face = faceFor(family, cp) ?? family;
  const file = fileOf(face, weight, italic) ?? fileOf(family, weight, italic) ?? fileOf("Inter", weight, italic);
  return file ? loadFont(file) : null;
}

const measured = new Map<string, number>();

/**
 * The advance width, px, of `text` set in a CSS font string ("italic 800 88px 'Inter', Helvetica…")
 * — what the runtime's canvas measureText call asks. Each character is set in the face the renderer
 * would use; kerning applies within a run. NaN when the font string is not one the runtime writes.
 */
export function measureText(font: string, text: string): number {
  const key = `${font}|${text}`;
  const hit = measured.get(key);
  if (hit !== undefined) return hit;
  const m = /^(italic\s+)?(\d+)\s+([\d.]+)px\s+'([^']+)'/.exec(font);
  if (!m) return Number.NaN;
  const family = allFaces().some((f) => f.family === m[4]) ? m[4]! : "Inter";
  const weight = Number(m[2]);
  const italic = !!m[1];
  const size = Number(m[3]);
  let width = 0;
  let run = "";
  let runFont: fontkit.Font | null = null;
  const flush = () => {
    if (run && runFont) width += (runFont.layout(run).advanceWidth * size) / runFont.unitsPerEm;
    run = "";
  };
  for (const ch of text) {
    const f: fontkit.Font | null = /\s/.test(ch) && runFont ? runFont : fontForChar(family, weight, italic, ch.codePointAt(0)!);
    if (f !== runFont) {
      flush();
      runFont = f;
    }
    run += ch;
  }
  flush();
  if (measured.size > 20_000) measured.clear();
  measured.set(key, width);
  return width;
}

/** @font-face rules embedding the faces a document's text uses, for browsers (family + unicode-range). */
export function fontFaceCss(doc: string): string {
  const fams = new Set(["Inter"]);
  for (const m of doc.matchAll(/font-family="'?([^',"]+)/g)) fams.add(familyOfFace(m[1]!.trim()));
  const subsets = new Set(["latin"]);
  for (const ch of doc.replace(/<[^>]*>/g, "")) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x100) continue;
    for (const f of allFaces()) if (f.subset !== "latin" && rangeCovers(f.range, cp)) subsets.add(f.subset);
  }
  const dir = fontsDir();
  return allFaces()
    .filter((f) => fams.has(f.family) && subsets.has(f.subset))
    .map((f) => `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:${f.italic ? "italic" : "normal"};${f.range ? `unicode-range:${f.range};` : ""}src:url(data:font/ttf;base64,${readFileSync(join(dir, f.file)).toString("base64")}) format('truetype');}`)
    .join("");
}
