/**
 * A strip of frames for several items with the same props — quick checks of one prop across a pack.
 *   node scripts/strip.mjs <items a,b,c> [aspect=9:16] [style=candy] [fractions=.5] [props JSON] [name=strip]
 */
import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { join } from "node:path";
import { findItem, parseAspect, renderSheet } from "../dist/index.js";
const [list, aspect = "9:16", style = "candy", fr = ".5", propsJson = "{}", outName = "strip"] = process.argv.slice(2);
const props = JSON.parse(propsJson);
const rows = [];
for (const id of list.split(",")) {
  const item = findItem(id);
  const d = item.duration.default;
  const times = fr.split(",").map((f) => Math.round(d * Number(f) * 100) / 100);
  const keep = Object.fromEntries(Object.entries(props).filter(([k]) => k in item.props));
  const r = await renderSheet(item, { aspect: parseAspect(aspect), style, times, cols: times.length, tileWidth: aspect === "9:16" ? 200 : 360, props: keep });
  rows.push(r);
  for (const w of r.warnings) console.log(id + ": " + w);
}
let x = 0, svg = "";
const H = Math.max(...rows.map((r) => r.height)), W = rows.reduce((a, r) => a + r.width + 8, 0);
for (const r of rows) { svg += `<image x="${x}" y="0" width="${r.width}" height="${r.height}" href="data:image/png;base64,${r.png.toString("base64")}"/>`; x += r.width + 8; }
const out = join(import.meta.dirname, `../out/${outName}.png`);
writeFileSync(out, new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#121418"/>${svg}</svg>`).render().asPng());
console.log(out);
