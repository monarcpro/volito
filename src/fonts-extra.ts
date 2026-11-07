/**
 * Display faces Volito ships beyond MONARC PRO's set (all SIL Open Font License, from
 * Fontsource). They join the engine's font table when the package loads, so styles, DESIGN.md files
 * and programs can name them like any bundled face. Kept out of src/engine/, which is synced from
 * MONARC core.
 */
export const EXTRA_FONTS: Record<string, { weights: number[]; italic?: number[] }> = {
  "Bebas Neue": { weights: [400] },
  "DM Serif Display": { weights: [400], italic: [400] },
  "Archivo Black": { weights: [400] },
  Syne: { weights: [600, 800] },
  Unbounded: { weights: [500, 800] },
  Righteous: { weights: [400] },
  Orbitron: { weights: [500, 800] },
  Pacifico: { weights: [400] },
  Fraunces: { weights: [600, 900], italic: [600] },
  "Bricolage Grotesque": { weights: [500, 800] },
  // For the caption looks (captions pack): an editorial sans and serif pair, two scripts and a wide display face.
  "Instrument Sans": { weights: [500, 700] },
  "Instrument Serif": { weights: [400], italic: [400] },
  "Kaushan Script": { weights: [400] },
  Parisienne: { weights: [400] },
  Michroma: { weights: [400] },
  // Scripts for the script captions: signature, neon, formal, monoline, casual, handwriting and brush.
  "Great Vibes": { weights: [400] },
  "Dancing Script": { weights: [500, 700] },
  Yellowtail: { weights: [400] },
  "Mr Dafoe": { weights: [400] },
  Sacramento: { weights: [400] },
  "Homemade Apple": { weights: [400] },
  Allura: { weights: [400] },
};

/** Generic fallbacks for faces the browser has not loaded yet (anything not named here is sans). */
const GENERIC: Record<string, string> = {
  "Space Mono": "ui-monospace, monospace",
  "Press Start 2P": "ui-monospace, monospace",
  "Playfair Display": "Georgia, serif",
  "IM Fell English": "Georgia, serif",
  "DM Serif Display": "Georgia, serif",
  Fraunces: "Georgia, serif",
  Caveat: "'Comic Sans MS', cursive",
  "Permanent Marker": "'Comic Sans MS', cursive",
  "Patrick Hand": "'Comic Sans MS', cursive",
  Pacifico: "'Comic Sans MS', cursive",
  "Instrument Serif": "Georgia, serif",
  "Kaushan Script": "'Brush Script MT', cursive",
  Parisienne: "'Snell Roundhand', cursive",
  "Great Vibes": "'Snell Roundhand', cursive",
  "Dancing Script": "'Brush Script MT', cursive",
  Yellowtail: "'Brush Script MT', cursive",
  "Mr Dafoe": "'Snell Roundhand', cursive",
  Sacramento: "'Snell Roundhand', cursive",
  "Homemade Apple": "'Comic Sans MS', cursive",
  Allura: "'Snell Roundhand', cursive",
};

/**
 * The runtime carries its own table of the families it can name (FAMILIES), the ones cut in a single
 * weight (ONE_WEIGHT) and each family's generic fallback. This rewrites those three lines from the
 * merged font table so programs can draw in the package's extra faces. Each stays one line, so error
 * line numbers are unchanged.
 */
export function withExtraFamilies(runtime: string, fonts: Record<string, { weights: number[] }>): string {
  const names = Object.keys(fonts);
  const families = Object.fromEntries(names.map((n) => [n.toLowerCase(), n]));
  const oneWeight = Object.fromEntries(names.filter((n) => fonts[n]!.weights.length === 1).map((n) => [n, fonts[n]!.weights[0]]));
  const lines: [RegExp, string][] = [
    [/var FAMILIES = \{[^\n]*\};/, `var FAMILIES = ${JSON.stringify(families)};`],
    [/var ONE_WEIGHT = \{[^\n]*\};/, `var ONE_WEIGHT = ${JSON.stringify(oneWeight)};`],
    [/var familyCss = function \(f\) \{[^\n]*\};/, `var familyCss = function (f) { var n = familyName(f); return "'" + n + "', " + (${JSON.stringify(GENERIC)}[n] || "Helvetica, Arial, sans-serif"); };`],
  ];
  let out = runtime;
  for (const [re, line] of lines) {
    if (!re.test(out)) throw new Error(`Volito: the engine runtime changed shape (${re.source}) — update src/fonts-extra.ts`);
    out = out.replace(re, () => line);
  }
  return out;
}
