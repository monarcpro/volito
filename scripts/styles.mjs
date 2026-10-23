/**
 * A sheet of styles: one row per style, a few items at a telling moment each — how every brand
 * style reads across kinds of graphic. out/styles.png
 *   node scripts/styles.mjs [styles=all] [items=title-card@2,lower-third@2,stat@2.6,follow-card@2.4]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { BUILTIN_STYLES, findItem, fontsDir, renderStill } from "../dist/index.js";

const [styleArg = "all", itemArg = "title-card@2,lower-third@2,stat@2.6,follow-card@2.4"] = process.argv.slice(2);
const styles = styleArg === "all" ? BUILTIN_STYLES.map((s) => s.name) : styleArg.split(",");
const items = itemArg.split(",").map((s) => s.split("@"));
const out = join(import.meta.dirname, "../out");
mkdirSync(out, { recursive: true });
const tw = 400, th = 225;
const W = 200 + items.length * (tw + 10), H = styles.length * (th + 10) + 10;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#121418"/>`;
for (const [r, style] of styles.entries()) {
  const y = 10 + r * (th + 10);
  svg += `<text x="12" y="${y + 30}" font-family="Inter" font-weight="700" font-size="20" fill="#e8e4dc">${style}</text>`;
  for (const [c, [id, t]] of items.entries()) {
    const item = findItem(id);
    const still = await renderStill(item, { style, width: tw, t: Number(t), background: item.placement === "overlay" ? "#3a4250" : undefined });
    svg += `<image x="${200 + c * (tw + 10)}" y="${y}" width="${tw}" height="${th}" href="data:image/png;base64,${still.data.toString("base64")}"/>`;
  }
}
svg += "</svg>";
const file = join(out, "styles.png");
writeFileSync(file, new Resvg(svg, { font: { fontFiles: ["inter-latin-700-normal.ttf"].map((f) => join(fontsDir(), f)), loadSystemFonts: false } }).render().asPng());
console.log(file);
