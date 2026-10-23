/**
 * The faces MONARC Motion ships: every face the runtime knows (core GRAPHIC_FONTS plus EXTRA_FONTS), every
 * script subset Fontsource cuts it in, converted to TTF (resvg reads TTF/OTF only; browsers
 * read TTF too) with one family name across weights. Writes fonts/*.ttf, fonts/faces.json
 * (family, weight, italic, subset, unicode-range, file) and each family's OFL licence.
 *
 * The Fontsource packages are dev dependencies; the published package carries the built
 * fonts/. Skips the work when nothing changed.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GRAPHIC_FONTS as ENGINE_FONTS } from "../src/engine/graphic-fonts.ts";
import { EXTRA_FONTS } from "../src/fonts-extra.ts";

// The engine's faces and the ones MONARC Motion adds (src/fonts-extra.ts).
const GRAPHIC_FONTS = { ...ENGINE_FONTS, ...EXTRA_FONTS };
import { woffToSfnt } from "./woff.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const src = join(root, "node_modules/@fontsource");
const out = join(root, "fonts");
const slug = (family) => family.toLowerCase().replace(/\s+/g, "-");

const stamp = createHash("sha1").update(readFileSync(fileURLToPath(import.meta.url))).update(readFileSync(join(here, "woff.mjs"))).update(JSON.stringify(GRAPHIC_FONTS)).digest("hex").slice(0, 12);
const index = join(out, "faces.json");
if (existsSync(index) && JSON.parse(readFileSync(index, "utf8")).stamp === stamp && !process.argv.includes("--force")) process.exit(0);
if (!existsSync(src)) {
  console.error(`build-fonts: ${src} is missing — run npm install first`);
  process.exit(1);
}

/** Every @font-face in a Fontsource weight file: subset → unicode-range. */
function ranges(cssFile, name) {
  const map = {};
  if (!existsSync(cssFile)) return map;
  const css = readFileSync(cssFile, "utf8");
  const re = new RegExp(`/\\*\\s*${name}-([a-z-]+)-\\d+-(?:normal|italic)\\s*\\*/\\s*@font-face\\s*\\{([^}]*)\\}`, "g");
  for (const m of css.matchAll(re)) {
    const range = /unicode-range:\s*([^;]+);/.exec(m[2])?.[1]?.trim() ?? "";
    map[m[1]] = range;
  }
  return map;
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "licenses"), { recursive: true });
const faces = [];
let bytes = 0;
for (const [family, spec] of Object.entries(GRAPHIC_FONTS)) {
  const pkg = join(src, slug(family));
  if (!existsSync(pkg)) throw new Error(`build-fonts: no @fontsource/${slug(family)}`);
  writeFileSync(join(out, "licenses", `${slug(family)}.txt`), readFileSync(join(pkg, "LICENSE")));
  const cuts = [...spec.weights.map((w) => [w, false]), ...(spec.italic ?? []).map((w) => [w, true])];
  for (const [weight, italic] of cuts) {
    const subsets = ranges(join(pkg, `${weight}${italic ? "-italic" : ""}.css`), slug(family));
    for (const [subset, range] of Object.entries(subsets)) {
      const name = `${slug(family)}-${subset}-${weight}-${italic ? "italic" : "normal"}`;
      const woff = join(pkg, "files", `${name}.woff`);
      if (!existsSync(woff)) continue;
      // A renderer that falls back glyph by glyph ignores weight (resvg takes the first face with the glyph),
      // so each script subset is its own family inside the file ("Inter latin-ext"); the renderer names it
      // on the runs of text that need it. Browsers read `family` + unicode-range and never see `face`.
      const face = subset === "latin" ? family : `${family} ${subset}`;
      const ttf = woffToSfnt(readFileSync(woff), { family: face, weight, italic });
      writeFileSync(join(out, `${name}.ttf`), ttf);
      bytes += ttf.length;
      faces.push({ family, face, weight, italic, subset, range, file: `${name}.ttf` });
    }
  }
}
writeFileSync(index, JSON.stringify({ stamp, source: "Fontsource (SIL Open Font License 1.1)", faces }, null, 1));
console.log(`build-fonts: ${faces.length} faces, ${(bytes / 1e6).toFixed(1)} MB → ${out}`);
