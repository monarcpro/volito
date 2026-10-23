// Synced from MONARC core (packages/core/src/graphic-fonts.ts) by scripts/sync-engine.mjs. Change it there and sync.
/** The faces code graphics can use — bundled with the app (Fontsource) — and font specs ("Inter:800", "Playfair Display:400i"). */

/** Faces bundled with the app (Fontsource), the weights each has, and whether italics exist. */
export const GRAPHIC_FONTS: Record<string, { weights: number[]; italic?: number[] }> = {
  Inter: { weights: [300, 400, 500, 600, 700, 800, 900] },
  "Space Grotesk": { weights: [400, 500, 600, 700] },
  "Space Mono": { weights: [400, 700] },
  Poppins: { weights: [300, 400, 600, 700, 800, 900] },
  "Playfair Display": { weights: [400, 700, 900], italic: [400, 700, 900] },
  Montserrat: { weights: [300, 400, 500, 700, 800, 900] },
  Anton: { weights: [400] },
  Outfit: { weights: [700, 900] },
  Gabarito: { weights: [700, 900] },
  Caveat: { weights: [400, 700] },
  "Press Start 2P": { weights: [400] },
  "Permanent Marker": { weights: [400] },
  "Patrick Hand": { weights: [400] },
  Fredoka: { weights: [400, 600, 700] },
  "IM Fell English": { weights: [400], italic: [400] },
};

export interface FontSpec {
  family: string;
  weight: number;
  italic: boolean;
}

/** "Inter:800" / "playfair display:400i" → the nearest bundled face; unknown families fall back to Inter. */
export function parseFontSpec(spec: string): FontSpec {
  const [rawFamily = "Inter", rawWeight = "700", ...rest] = String(spec).split(":");
  const family = Object.keys(GRAPHIC_FONTS).find((f) => f.toLowerCase() === rawFamily.trim().toLowerCase()) ?? "Inter";
  // "400i", "400italic", "700:italic", "italic" all ask for the italic.
  const italic = /i(talic)?$/i.test(rawWeight.trim()) || rest.some((r) => /^i(talic)?$/i.test(r.trim()));
  const wanted = Number.parseInt(rawWeight, 10) || 700;
  const face = GRAPHIC_FONTS[family]!;
  const list = italic && face.italic?.length ? face.italic : face.weights;
  const weight = list.reduce((best, w) => (Math.abs(w - wanted) < Math.abs(best - wanted) ? w : best), list[0]!);
  return { family, weight, italic: italic && !!face.italic?.length };
}

export const fontSpecKey = (f: FontSpec): string => `${f.family}:${f.weight}${f.italic ? "i" : ""}`;

