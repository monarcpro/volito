/**
 * Graphic specs on disk: load one, find the item or program it names, turn it into render options, and
 * validate it against that item (props, parts, aspects, length) and the files it points at. Paths inside
 * a spec (a program, a DESIGN.md, a transcript, image props) are relative to the spec file.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { BUILTIN_STYLES } from "../engine.js";
import { normalizeMotion } from "../kit.js";
import { type MotionItem, MotionError, customItem, parseAspect, resolveProps } from "../pack.js";
import { type GraphicSpec, SPEC_VERSION, type SpecIssue, parseSpec } from "../spec.js";
import { normalizeWords, readWords } from "./inputs.js";
import { type Library, findItem, library } from "./packs.js";
import type { RenderOptions } from "./render.js";

export interface LoadedSpec {
  spec: GraphicSpec;
  /** The folder its paths are relative to. */
  dir: string;
  file?: string;
}

/** A path that holds a Volito spec: a .json file whose top level has "volito". */
export function isSpecFile(path: string): boolean {
  if (!/\.json$/i.test(path)) return false;
  const p = resolve(path);
  if (!existsSync(p) || !statSync(p).isFile()) return false;
  try {
    const doc = JSON.parse(readFileSync(p, "utf8")) as unknown;
    return !!doc && typeof doc === "object" && !Array.isArray(doc) && "volito" in doc;
  } catch {
    return false;
  }
}

/** Read and shape-check a spec file; throws with every problem listed. */
export function loadSpecFile(path: string): LoadedSpec {
  const file = resolve(path);
  let doc: unknown;
  try {
    doc = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new MotionError(`${path} is not valid JSON: ${(e as Error).message}`);
  }
  const { spec, errors } = parseSpec(doc);
  if (!spec) throw new MotionError(`${path} is not a valid spec:\n${formatIssues(errors)}`);
  return { spec, dir: dirname(file), file };
}

const at = (dir: string, p: string) => (isAbsolute(p) ? p : resolve(dir, p));
const isUrl = (s: string) => /^(https?:|data:)/i.test(s);

/** The item a spec draws: a pack item, a program file or inline code. */
export function itemOfSpec(loaded: LoadedSpec, lib: Library = library()): MotionItem {
  const { spec, dir } = loaded;
  if (spec.code?.trim()) return customItem(spec.code, { placement: spec.placement, duration: spec.duration, id: idFrom(spec.name ?? "graphic") });
  if (spec.program) {
    const p = at(dir, spec.program);
    if (!existsSync(p)) throw new MotionError(`program ${spec.program} not found (looked in ${p})`);
    if (statSync(p).isDirectory()) return findItem(p, lib);
    return customItem(readFileSync(p, "utf8"), { placement: spec.placement, duration: spec.duration, id: idFrom(basename(p).replace(/\.[^.]+$/, "")) });
  }
  return findItem(spec.item!, lib);
}

const idFrom = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "graphic";

/** Render options from a spec (media not loaded yet: image props are resolved to absolute paths or URLs). */
export function specToOptions(loaded: LoadedSpec, item: MotionItem): RenderOptions {
  const { spec, dir } = loaded;
  const props: Record<string, unknown> = { ...(spec.props ?? {}) };
  for (const [name, p] of Object.entries(item.props)) {
    const v = props[name];
    if (p.type === "image" && typeof v === "string" && v.trim() && !isUrl(v)) props[name] = at(dir, v.trim());
  }
  const style = spec.style ? (/\.(md|markdown|txt)$/i.test(spec.style) ? readFileSync(at(dir, spec.style), "utf8") : spec.style) : undefined;
  const words = spec.words === undefined ? undefined : typeof spec.words === "string" ? readWords(at(dir, spec.words), spec.offset ?? 0) : normalizeWords(spec.words, spec.offset ?? 0);
  const sound = spec.sound;
  return {
    props,
    ...(spec.colors ? { colors: spec.colors } : {}),
    ...(style ? { style } : {}),
    ...(spec.aspect ? { aspect: parseAspect(spec.aspect) } : {}),
    ...(spec.duration ? { duration: spec.duration } : {}),
    ...(spec.fps ? { fps: spec.fps } : {}),
    ...(spec.width ? { width: spec.width } : {}),
    ...(spec.background ? { background: spec.background } : {}),
    ...(words?.length ? { words } : {}),
    ...(spec.beats ? { beats: spec.beats } : {}),
    ...(spec.motion ? { motion: spec.motion } : {}),
    ...(spec.mood ? { mood: spec.mood } : {}),
    ...(spec.seed !== undefined ? { seed: spec.seed } : {}),
    ...(spec.speed ? { speed: spec.speed } : {}),
    ...(sound ? { sound: typeof sound === "object" && sound.level !== undefined ? { level: sound.level } : true } : {}),
    ...(typeof sound === "object" && sound.bed ? { bed: sound.bed } : {}),
  };
}

export interface SpecReport {
  ok: boolean;
  errors: SpecIssue[];
  warnings: SpecIssue[];
  item?: string;
}

/**
 * Everything wrong with a spec, before anything renders: its shape, the item it names, files it points at,
 * props against the item's manifest, motion parts, the aspect and the length. Errors stop a render;
 * warnings would render but not as written (a name cut to fit, a part that does not exist).
 */
export function validateSpec(input: unknown, opts: { dir?: string; lib?: Library } = {}): SpecReport {
  const dir = opts.dir ?? process.cwd();
  const { spec, errors } = parseSpec(input);
  if (!spec) return { ok: false, errors, warnings: [] };
  const warnings: SpecIssue[] = [];
  const errs: SpecIssue[] = [];
  let item: MotionItem;
  try {
    item = itemOfSpec({ spec, dir }, opts.lib ?? library());
  } catch (e) {
    return { ok: false, errors: [{ path: spec.item ? "item" : spec.program ? "program" : "code", message: (e as Error).message }], warnings };
  }

  if (spec.style && /\.(md|markdown|txt)$/i.test(spec.style)) {
    if (!existsSync(at(dir, spec.style))) errs.push({ path: "style", message: `no DESIGN.md at ${spec.style} (relative to the spec)` });
  } else if (spec.style && !BUILTIN_STYLES.some((s) => s.name === spec.style)) {
    errs.push({ path: "style", message: `no built-in style "${spec.style}" — use one of ${BUILTIN_STYLES.map((s) => s.name).join(", ")}, or a path to a DESIGN.md` });
  }
  if (typeof spec.words === "string" && !existsSync(at(dir, spec.words))) errs.push({ path: "words", message: `no transcript at ${spec.words} (relative to the spec)` });

  if (spec.aspect) {
    try {
      const a = parseAspect(spec.aspect);
      if (typeof a === "string" && item.aspects?.length && !item.aspects.includes(a)) warnings.push({ path: "aspect", message: `${item.ref} is designed for ${item.aspects.join(", ")}; ${a} may not lay out well` });
    } catch (e) {
      errs.push({ path: "aspect", message: (e as Error).message });
    }
  }
  if (spec.duration && item.duration) {
    const { min, max } = item.duration;
    if ((min !== undefined && spec.duration < min) || (max !== undefined && spec.duration > max)) warnings.push({ path: "duration", message: `${item.ref} is designed for ${min ?? 0}–${max ?? "∞"} s; ${spec.duration} s will be clamped or look rushed` });
  }

  const props = { ...(spec.props ?? {}) };
  for (const [name, p] of Object.entries(item.props)) {
    const v = props[name];
    if (p.type === "image" && typeof v === "string" && v.trim() && !isUrl(v) && !existsSync(at(dir, v))) errs.push({ path: `props.${name}`, message: `no image at ${v} (relative to the spec)` });
  }
  for (const w of resolveProps(item, props).warnings) warnings.push({ path: `props${propName(w)}`, message: w });
  for (const w of normalizeMotion({ parts: spec.motion as never, mood: spec.mood, seed: spec.seed, speed: spec.speed }, Object.keys(item.parts ?? {})).warnings) warnings.push({ path: "motion", message: w });

  return { ok: errs.length === 0, errors: errs, warnings, item: item.ref };
}

/** ".name" for a resolveProps warning that starts with or quotes a prop name. */
function propName(w: string): string {
  const m = /^unknown prop "([^"]+)"/.exec(w) ?? /^([A-Za-z0-9_]+) /.exec(w);
  return m ? `.${m[1]}` : "";
}

export function formatIssues(list: SpecIssue[], mark = "✗"): string {
  return list.map((i) => `  ${mark} ${i.path ? `${i.path}: ` : ""}${i.message}`).join("\n");
}

/** A spec from the options a command line gave (the reverse of specToOptions), for `volito spec`. */
export function specFrom(fields: Omit<GraphicSpec, "volito" | "$schema">): GraphicSpec {
  const out: Record<string, unknown> = { $schema: "https://volito.dev/schema/graphic.v1.json", volito: SPEC_VERSION };
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return out as GraphicSpec;
}
