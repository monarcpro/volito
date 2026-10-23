/**
 * Text beyond a family's Latin cut, set as outlines. resvg's text engine handles Latin well (it
 * matches Chrome), but past it: Devanagari loses its reordering (a vowel sign drawn after its
 * consonant) and the spaces between words; a line that mixes faces (Cyrillic borrowed from Inter,
 * a Polish Ź from a latin-ext cut) can vanish whole. So a <text> element holding any character its
 * family's Latin cut lacks is laid out here with fontkit's shaper — the engine the measure uses,
 * each character in the face the measure picked — and handed to resvg as one path, in the
 * element's own fill, stroke, opacity, filter and transform. Latin-only text is left to resvg.
 *
 * It reads the <text> the runtime writes ($.text: x, y, font attributes, one tspan per line); text
 * markup it does not understand (nested tspans, textPath) is left as it is.
 */
import type * as fontkit from "fontkit";
import { allFaces, faceFor, fontForChar } from "./fonts.js";

const RTL = /[֐-׿יִ-ﭏ]/;
const BEYOND_LATIN1 = /[^\u0000-ÿ]/;

/** Whether text in `family` has a character its Latin cut does not set. */
function needsOutline(text: string, family: string): boolean {
  if (!BEYOND_LATIN1.test(text)) return false;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x100 && !/\s/.test(ch) && faceFor(family, cp) !== null) return true;
  }
  return false;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescape = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e] ?? m)));

function attrsOf(s: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of s.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) out.set(m[1]!, m[2]!);
  return out;
}

const TEXT_ONLY = new Set(["x", "y", "dx", "dy", "font-family", "font-size", "font-weight", "font-style", "letter-spacing", "word-spacing", "text-anchor", "xml:space", "dominant-baseline"]);

const r2 = (v: number) => Math.round(v * 100) / 100;

/** One line set from (0, 0) on its baseline: the path data and its advance. */
function setLine(text: string, family: string, weight: number, italic: boolean, size: number, ls: number): { d: string; width: number } {
  // Runs of one face: a character goes to the first face that has it; spaces stay with the run.
  const runs: Array<{ font: fontkit.Font; text: string }> = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const prev = runs[runs.length - 1];
    if (/\s/.test(ch) && prev) {
      prev.text += ch;
      continue;
    }
    const font = fontForChar(family, weight, italic, cp);
    if (!font) continue;
    if (prev && prev.font === font) prev.text += ch;
    else runs.push({ font, text: ch });
  }
  if (RTL.test(text)) runs.reverse();
  const glyphs: string[] = [];
  let x = 0;
  for (const run of runs) {
    const k = size / run.font.unitsPerEm;
    const laid = run.font.layout(run.text, undefined, undefined, undefined, RTL.test(run.text) ? "rtl" : undefined);
    laid.glyphs.forEach((g, i) => {
      const p = laid.positions[i]!;
      const gx = x + p.xOffset * k, gy = p.yOffset * k;
      let d = "";
      for (const c of g.path.commands) {
        if (c.command === "closePath") {
          d += "Z";
          continue;
        }
        const op = c.command === "moveTo" ? "M" : c.command === "lineTo" ? "L" : c.command === "quadraticCurveTo" ? "Q" : "C";
        const pts: string[] = [];
        for (let j = 0; j < c.args.length; j += 2) pts.push(`${r2(gx + c.args[j]! * k)} ${r2(-(gy + c.args[j + 1]! * k))}`);
        d += op + pts.join(" ");
      }
      glyphs.push(d);
      x += p.xAdvance * k + ls;
    });
  }
  return { d: glyphs.join(""), width: Math.max(0, x - (glyphs.length ? ls : 0)) };
}

/**
 * The SVG with each <text> that holds characters beyond its family's Latin cut set as outline paths
 * (shaped by fontkit). Latin-only frames come back untouched.
 */
export function outlineText(svg: string): string {
  if (!BEYOND_LATIN1.test(svg)) return svg;
  return svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (whole, rawAttrs: string, inner: string) => {
    if (!BEYOND_LATIN1.test(inner)) return whole;
    const named0 = /font-family="'?([^',"]+)/.exec(rawAttrs)?.[1]?.trim() ?? "Inter";
    if (!needsOutline(inner.replace(/<[^>]*>/g, ""), allFaces().some((f) => f.family === named0) ? named0 : "Inter")) return whole;
    // Lines: the runtime's one tspan per line, or plain text; anything else is left to resvg.
    const lines: Array<{ x: number | null; dy: number; text: string }> = [];
    const stripped = inner.replace(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g, (_m, ta: string, tt: string) => {
      const a = attrsOf(ta);
      lines.push({ x: a.has("x") ? Number(a.get("x")) : null, dy: Number(a.get("dy") ?? 0) || 0, text: unescape(tt) });
      return "";
    });
    if (/</.test(stripped)) return whole;
    if (!lines.length) lines.push({ x: null, dy: 0, text: unescape(inner) });
    const a = attrsOf(rawAttrs);
    const named = /'?([^',]+)/.exec(a.get("font-family") ?? "Inter")?.[1]?.trim() ?? "Inter";
    const family = allFaces().some((f) => f.family === named) ? named : "Inter";
    const size = Number(a.get("font-size") ?? 16) || 16;
    const weight = Number(a.get("font-weight") ?? 400) || 400;
    const italic = /italic|oblique/.test(a.get("font-style") ?? "");
    const ls = Number(a.get("letter-spacing") ?? 0) || 0;
    const anchor = a.get("text-anchor") ?? "start";
    const x0 = Number(a.get("x") ?? 0) || 0;
    let y = Number(a.get("y") ?? 0) || 0;
    let d = "";
    for (const line of lines) {
      y += line.dy;
      const lx = line.x ?? x0;
      const set = setLine(line.text, family, weight, italic, size, ls);
      const shift = anchor === "middle" ? -set.width / 2 : anchor === "end" ? -set.width : 0;
      d += set.d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_m, px: string, py: string) => `${r2(Number(px) + lx + shift)} ${r2(Number(py) + y)}`);
    }
    const keep = [...a.entries()].filter(([k]) => !TEXT_ONLY.has(k)).map(([k, v]) => `${k}="${v}"`).join(" ");
    return `<path d="${d}"${keep ? ` ${keep}` : ""}/>`;
  });
}
