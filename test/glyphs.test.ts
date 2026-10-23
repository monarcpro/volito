import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import * as fontkit from "fontkit";
import { describe, expect, it } from "vitest";
import { GLYPH_CHARS, TrueTypeFace, glyphTable } from "../src/glyphs.js";
import { fontsDir } from "../src/node/paths.js";

/** Pixels where two em-space paths differ, drawn at 300 px. */
function pixelDiff(a: string, b: string): number {
  const svg = (d: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="-100 -1100 1300 1300"><g transform="scale(1,-1)"><path d="${d}" fill="#000"/></g></svg>`;
  const pa = new Resvg(svg(a)).render().pixels;
  const pb = new Resvg(svg(b)).render().pixels;
  let diff = 0;
  for (let i = 3; i < pa.length; i += 4) if (Math.abs(pa[i]! - pb[i]!) > 64) diff++;
  return diff;
}

describe("glyph tables", () => {
  const faces = ["inter-latin-900-normal.ttf", "anton-latin-400-normal.ttf", "playfair-display-latin-900-normal.ttf", "press-start-2p-latin-400-normal.ttf", "caveat-latin-700-normal.ttf", "fredoka-latin-700-normal.ttf"];

  it.each(faces)("draws %s the way fontkit does, accents and composites included", (file) => {
    const bytes = readFileSync(join(fontsDir(), file));
    const table = glyphTable(new TrueTypeFace(new Uint8Array(bytes)), file);
    const ref = fontkit.create(bytes) as fontkit.Font;
    const s = 1000 / ref.unitsPerEm;
    expect(Object.keys(table.g).length).toBeGreaterThan(150);
    for (const ch of "AgQ&é@ÅßØ5%") {
      const mine = table.g[String(ch.codePointAt(0))];
      if (!mine) continue;
      const g = (ref as unknown as { glyphForCodePoint(c: number): { advanceWidth: number; path: { scale(x: number, y: number): { toSVG(): string } } } }).glyphForCodePoint(ch.codePointAt(0)!);
      expect(Math.abs(mine[0] - g.advanceWidth * s), `${file} ${ch} advance`).toBeLessThanOrEqual(1);
      // Rounding to 1/1000 em moves an edge by at most half a unit: a sliver of pixels, never a missing part.
      expect(pixelDiff(mine[1], g.path.scale(s, s).toSVG()), `${file} ${ch} outline`).toBeLessThan(150);
    }
  });

  it("covers printable Latin and stays small", () => {
    const table = glyphTable(new TrueTypeFace(new Uint8Array(readFileSync(join(fontsDir(), "inter-latin-900-normal.ttf")))), "Inter:900");
    for (const ch of "AZaz09!?.,'\"&é") expect(table.g[String(ch.codePointAt(0))], ch).toBeTruthy();
    expect(GLYPH_CHARS.length).toBeGreaterThan(190);
    expect(JSON.stringify(table).length).toBeLessThan(120_000);
  });
});
