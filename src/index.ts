/**
 * MONARC Motion for Node: list the packs, build a graphic from an item with your text, brand
 * and aspect, and render it — a still, a contact sheet, or a video with alpha.
 *
 *   import { findItem, renderVideo } from "@monarcpro/motion";
 *   const item = findItem("essentials/lower-third");
 *   await renderVideo(item, { props: { name: "Priya Sharma", role: "Product designer" }, style: "ember", aspect: "16:9", out: "priya.mov" });
 */
export {
  type Aspect,
  type BuildOptions,
  type BuiltProgram,
  type Category,
  type ItemManifest,
  type MotionItem,
  type MotionPack,
  type PackManifest,
  type Placement,
  type PropSpec,
  type PropType,
  type StyleInput,
  type StyleOverrides,
  ASPECTS,
  ASPECT_NAMES,
  CATEGORIES,
  MOTION_FORMAT,
  MotionError,
  buildProgram,
  canvasFor,
  customItem,
  describeItem,
  makeItem,
  manifestProblems,
  parseAspect,
  resolveProps,
  resolveStyle,
} from "./pack.js";
export { type Library, type ItemQuery, builtinPacks, findItem, library, loadPack, packsIn, searchItems } from "./node/packs.js";
export {
  type RenderOptions,
  type StillFormat,
  type StillResult,
  type VideoFormat,
  type VideoResult,
  FORMAT_NOTES,
  VIDEO_FORMATS,
  defaultOutput,
  formatFromPath,
  frameDocument,
  openSession,
  renderSheet,
  renderStill,
  renderVideo,
  sheetTimes,
} from "./node/render.js";
export { type AspectReport, type CheckReport, checkItem, describeReport } from "./node/check.js";
export { ProgramError, ProgramRunner } from "./node/sandbox.js";
export { loadImage, loadMedia, normalizeWords, readStyleArg, readWords } from "./node/inputs.js";
export { FfmpegMissing, probeFfmpeg } from "./node/ffmpeg.js";
export { fontsDir, packageVersion } from "./node/paths.js";
export { BUILTIN_STYLES, MG_API_REFERENCE, MG_ICON_NAMES, MG_SPRITE_NAMES, parseDesignMd } from "./engine.js";
export { AUTHORING_GUIDE, MOTION_GUIDE } from "./guide.js";
export { type MotionConfig, type MotionInput, type MotionOverrides, type MotionSpec, DIRECTIONS, EASES, HITS, IDLES, MOODS, MOVES, MOVE_NOTES, ORDERS, ORIGINS, SPLITS, normalizeMotion, parseMotionArgs } from "./kit.js";
