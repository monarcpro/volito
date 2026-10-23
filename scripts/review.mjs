/**
 * Review sheets for a pack: each item's frames across its time, one row per item, written to
 * out/review-<aspect>-<style>.png — what a designer (or an agent) looks at before shipping.
 *   node scripts/review.mjs [aspect=16:9] [style=ember] [items=a,b,c]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { findItem, fontsDir, library, parseAspect, renderSheet } from "../dist/index.js";

const [aspect = "16:9", style = "ember", only] = process.argv.slice(2);
const items = only ? only.split(",").map((i) => findItem(i)) : library().items;
const out = join(import.meta.dirname, "../out");
mkdirSync(out, { recursive: true });
const tall = aspect === "9:16" || aspect === "4:5";
const tile = tall ? 270 : 400;
const rows = [];
for (const item of items) {
  const d = item.duration.default;
  const times = [0.18, 0.4, 0.7, 0.93].map((f) => Math.round(d * f * 100) / 100);
  const r = await renderSheet(item, { aspect: parseAspect(aspect), style, times, cols: 4, tileWidth: tile });
  rows.push({ id: item.id, png: r.png, w: r.width, h: r.height, warnings: r.warnings });
}
const W = Math.max(...rows.map((r) => r.w)) + 200;
const H = rows.reduce((a, r) => a + r.h, 0);
let y = 0;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#121418"/>`;
for (const r of rows) {
  svg += `<text x="12" y="${y + 40}" font-family="Inter" font-weight="700" font-size="20" fill="#e8e4dc">${r.id}</text>`;
  if (r.warnings.length) svg += `<text x="12" y="${y + 66}" font-family="Inter" font-size="14" fill="#ff8a65">${r.warnings.length} warning(s)</text>`;
  svg += `<image x="200" y="${y}" width="${r.w}" height="${r.h}" href="data:image/png;base64,${r.png.toString("base64")}"/>`;
  y += r.h;
}
svg += "</svg>";
const file = join(out, `review-${aspect.replace(":", "x")}-${style}.png`);
writeFileSync(file, new Resvg(svg, { font: { fontFiles: ["inter-latin-400-normal.ttf", "inter-latin-700-normal.ttf"].map((f) => join(fontsDir(), f)), loadSystemFonts: false } }).render().asPng());
for (const r of rows) for (const w of r.warnings) console.log(`${r.id}: ${w}`);
console.log(file);
