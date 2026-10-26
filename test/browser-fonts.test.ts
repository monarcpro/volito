import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Face, facesFor, fontWants, matchWeight, wideCodepoints } from "../src/browser/fonts.js";

const faces = (JSON.parse(readFileSync(join(import.meta.dirname, "../fonts/faces.json"), "utf8")) as { faces: Face[] }).faces;
const files = (fs: Face[]) => fs.map((f) => f.file).sort();

describe("browser player fonts: which faces a frame embeds", () => {
  it("picks weights the way CSS font matching does", () => {
    const all = [300, 400, 500, 600, 700, 800, 900];
    expect(matchWeight(all, 800)).toBe(800);
    expect(matchWeight([300, 500, 700], 400)).toBe(500); // 400–500: up to 500 first
    expect(matchWeight([300, 700], 500)).toBe(300); // then lighter
    expect(matchWeight([400, 700], 300)).toBe(400); // under 400: lighter, else the nearest heavier
    expect(matchWeight([400, 800], 600)).toBe(800); // over 500: heavier first
    expect(matchWeight([300, 400], 600)).toBe(400);
  });

  it("reads the runtime's text tags as exact requests", () => {
    const svg = `<g><text x="0" y="40" font-family="'Inter', Helvetica, Arial, sans-serif" font-size="40" font-weight="900" fill="#fff">Hi</text><text font-family="'Space Mono', ui-monospace, monospace" font-weight="700">x</text><text font-family="'Playfair Display', Georgia, serif" font-weight="700" font-style="italic">q</text></g>`;
    const w = fontWants(svg);
    expect(w).toContainEqual({ family: "Inter", weight: 900, italic: false });
    expect(w).toContainEqual({ family: "Space Mono", weight: 700, italic: false });
    expect(w).toContainEqual({ family: "Playfair Display", weight: 700, italic: true });
    expect(w.some((x) => x.family === "Inter" && x.weight === 700)).toBe(false);
    expect(fontWants("<svg><rect/></svg>")).toEqual([]);
  });

  it("reads style attributes, the font shorthand, inheritance and <style> rules", () => {
    expect(fontWants(`<text style="font-family:'Montserrat';font-weight:600">a</text>`)).toContainEqual({ family: "Montserrat", weight: 600, italic: false });
    expect(fontWants(`<text style="font: italic 700 40px 'Playfair Display', serif">a</text>`)).toContainEqual({ family: "Playfair Display", weight: 700, italic: true });
    // A family on a group and a weight on its text: the combination is requested.
    expect(fontWants(`<g font-family="Space Mono"><text font-weight="bold">a</text></g>`)).toContainEqual({ family: "Space Mono", weight: 700, italic: false });
    expect(fontWants(`<style>.t{font-family:Anton;font-weight:400}</style><text class="t">a</text>`)).toContainEqual({ family: "Anton", weight: 400, italic: false });
    // The player's own @font-face rules are not requests.
    expect(fontWants(`<style>@font-face{font-family:'Caveat';font-weight:700;src:url(x)}</style><text font-family="Inter" font-weight="400">a</text>`).some((w) => w.family === "Caveat")).toBe(false);
  });

  it("finds the characters that need more than latin", () => {
    expect([...wideCodepoints("Zoë Müller, café")]).toEqual([]);
    expect([...wideCodepoints("Łódź")].sort((a, b) => a - b)).toEqual([0x141, 0x17a]);
    expect([...wideCodepoints("&#321;ukasz &#x416;")].sort((a, b) => a - b)).toEqual([0x141, 0x416]);
    expect([...wideCodepoints("😀")]).toEqual([0x1f600]);
  });

  it("matches requests to files: latin, plus the scripts the text needs", () => {
    expect(files(facesFor(faces, [{ family: "Inter", weight: 800, italic: false }], new Set()))).toEqual(["inter-latin-800-normal.ttf"]);
    expect(files(facesFor(faces, [{ family: "Inter", weight: 800, italic: false }], wideCodepoints("Łódź Жук")))).toEqual(["inter-cyrillic-800-normal.ttf", "inter-latin-800-normal.ttf", "inter-latin-ext-800-normal.ttf"]);
    expect(files(facesFor(faces, [{ family: "playfair display", weight: 800, italic: true }], new Set()))).toEqual(["playfair-display-latin-900-italic.ttf"]);
    // Families the package does not have (the generic fallbacks in a font-family list) are skipped.
    expect(facesFor(faces, [{ family: "Helvetica", weight: 400, italic: false }], new Set())).toEqual([]);
  });
});
