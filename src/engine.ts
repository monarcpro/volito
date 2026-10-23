/**
 * The engine MONARC Motion is built on — the same runtime, sandbox and brand styles the MONARC
 * editor draws its code graphics with, so a pack item renders here exactly as it does on a MONARC
 * timeline. src/engine/ is a copy of MONARC core's engine files (scripts/sync-engine.mjs keeps it in
 * step; SOURCE.json names the commit), so this package depends on nothing of MONARC's.
 */
import { MG_RUNTIME as ENGINE_RUNTIME } from "./engine/graphics-runtime.js";
import { programWorkerSource as engineWorkerSource } from "./engine/graphics.js";
export { MG_STD_DEFS, MG_ICON_NAMES, MG_SPRITE_NAMES } from "./engine/graphics-runtime.js";
export {
  type TitleProgram,
  type GraphicWord,
  type GraphicBox,
  type ProgramEnv,
  MG_API_REFERENCE,
  PROGRAM_LIMITS,
  normalizeProgram,
  normalizeProgramCode,
  programEnv,
  programHash,
  programProblems,
} from "./engine/graphics.js";
import { GRAPHIC_FONTS } from "./engine/graphic-fonts.js";
import { BRAND_TEXTURES, type BrandStyle, BUILTIN_STYLES as ENGINE_STYLES, composeDesignMd as engineComposeDesignMd } from "./engine/styles.js";
import { EXTRA_FONTS, withExtraFamilies } from "./fonts-extra.js";
import { PATTERN_NAMES, withPatterns } from "./patterns.js";
import { MOTION_STYLES, styleBody } from "./styles-extra.js";

// The package's own faces and patterns join the engine's tables before anything reads them, so
// styles, DESIGN.md files and programs can name them.
Object.assign(GRAPHIC_FONTS, EXTRA_FONTS);
for (const p of PATTERN_NAMES) if (!(BRAND_TEXTURES as readonly string[]).includes(p)) (BRAND_TEXTURES as unknown as string[]).push(p);

/** The runtime every program runs on: the engine's, knowing the package's extra faces and patterns. */
export const MG_RUNTIME = withPatterns(withExtraFamilies(ENGINE_RUNTIME, GRAPHIC_FONTS));
const addedLines = MG_RUNTIME.split("\n").length - ENGINE_RUNTIME.split("\n").length;

/** A program's worker source (see the engine's programWorkerSource), on MONARC Motion's runtime. */
export function programWorkerSource(code: string): { source: string; codeLine: number } {
  const built = engineWorkerSource(code);
  return { source: built.source.replace(ENGINE_RUNTIME, () => MG_RUNTIME), codeLine: built.codeLine + addedLines };
}

/** The MONARC editor's built-in styles, then the ones MONARC Motion adds. */
export const BUILTIN_STYLES: readonly BrandStyle[] = [...ENGINE_STYLES, ...MOTION_STYLES];
/** A style as a DESIGN.md file (the engine's composeDesignMd, with words for the package's patterns). */
export function composeDesignMd(s: BrandStyle): string {
  return engineComposeDesignMd(s.body.trim() ? s : { ...s, body: styleBody(s) });
}

/** Styles the MONARC editor knows (a pack item meant for the editor can stay within these). */
export const EDITOR_STYLES = ENGINE_STYLES;

export { GRAPHIC_FONTS, type FontSpec, fontSpecKey, parseFontSpec } from "./engine/graphic-fonts.js";
export {
  type BrandStyle,
  type ProgramStyle,
  EXPLAINER_STYLE_NAMES,
  findStyle,
  normalizeProgramStyle,
  parseDesignMd,
  programStyleOf,
  stylePalette,
} from "./engine/styles.js";
