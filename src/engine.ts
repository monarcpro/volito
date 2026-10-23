/**
 * The engine MONARC Motion is built on — the same runtime, sandbox and brand styles the MONARC
 * editor draws its code graphics with, so a pack item renders here exactly as it does on a MONARC
 * timeline. src/engine/ is a copy of MONARC core's engine files (scripts/sync-engine.mjs keeps it in
 * step; SOURCE.json names the commit), so this package depends on nothing of MONARC's.
 */
export { MG_RUNTIME, MG_STD_DEFS, MG_ICON_NAMES, MG_SPRITE_NAMES } from "./engine/graphics-runtime.js";
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
  programWorkerSource,
} from "./engine/graphics.js";
export { GRAPHIC_FONTS, type FontSpec, fontSpecKey, parseFontSpec } from "./engine/graphic-fonts.js";
export {
  type BrandStyle,
  type ProgramStyle,
  BUILTIN_STYLES,
  EXPLAINER_STYLE_NAMES,
  composeDesignMd,
  findStyle,
  normalizeProgramStyle,
  parseDesignMd,
  programStyleOf,
  stylePalette,
} from "./engine/styles.js";
