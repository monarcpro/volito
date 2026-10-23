/**
 * Variant sheets: one item under many seeds (each seed picks a mood and a choreography), one row per
 * seed — how much range the motion settings give. out/variants-<item>.png
 *   node scripts/variants.mjs <item> [seeds=1,2,3,4,5,6] [aspect=16:9] [style=ember]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { buildProgram, findItem, fontsDir, parseAspect, renderSheet } from "../dist/index.js";

const [id, seedArg = "1,2,3,4,5,6", aspect = "16:9", style = "ember"] = process.argv.slice(2);
const item = findItem(id);
const seeds = seedArg.split(",").map(Number);
const out = join(import.meta.dirname, "../out");
mkdirSync(out, { recursive: true });
const d = item.duration.default;
const times = [0.2, 0.45, 0.8, 1.3, d * 0.6].map((t) => Math.round(Math.min(t, d - 0.1) * 100) / 100);
const rows = [];
for (const seed of seeds) {
  const r = await renderSheet(item, { aspect: parseAspect(aspect), style, seed, times, cols: times.length, tileWidth: aspect === "9:16" ? 200 : 320 });
  // The mood a seed lands on (the kit's own pick), read back from a frame's program.
  const built = buildProgram(item, { seed });
  rows.push({ seed, png: r.png, w: r.width, h: r.height, warnings: r.warnings, built });
}
const W = Math.max(...rows.map((r) => r.w)) + 150;
const H = rows.reduce((a, r) => a + r.h, 0);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#121418"/>`;
let y = 0;
for (const r of rows) {
  svg += `<text x="12" y="${y + 40}" font-family="Inter" font-weight="700" font-size="20" fill="#e8e4dc">seed ${r.seed}</text>`;
  if (r.warnings.length) svg += `<text x="12" y="${y + 64}" font-family="Inter" font-size="13" fill="#ff8a65">${r.warnings.length} warning(s)</text>`;
  svg += `<image x="150" y="${y}" width="${r.w}" height="${r.h}" href="data:image/png;base64,${r.png.toString("base64")}"/>`;
  y += r.h;
}
svg += "</svg>";
const file = join(out, `variants-${item.id}.png`);
writeFileSync(file, new Resvg(svg, { font: { fontFiles: ["inter-latin-400-normal.ttf", "inter-latin-700-normal.ttf"].map((f) => join(fontsDir(), f)), loadSystemFonts: false } }).render().asPng());
for (const r of rows) for (const w of r.warnings) console.log(`seed ${r.seed}: ${w}`);
console.log(file);
