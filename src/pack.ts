/**
 * Packs and items: the library format. A pack is a folder of items that share a look and a
 * helper file; an item is one motion graphic — `item.json` (what it is, the props it takes,
 * how long it runs, the aspects it fits) and `frame.js` (a `function frame(t, $)` program that
 * reads its props as `$.data`). Nothing here touches the filesystem or the DOM, so the CLI,
 * the MCP server and the browser player all build programs the same way.
 */
import {
  type BrandStyle,
  type GraphicWord,
  type ProgramStyle,
  type TitleProgram,
  BUILTIN_STYLES,
  findStyle,
  normalizeProgram,
  normalizeProgramStyle,
  parseDesignMd,
  programProblems,
  programStyleOf,
  stylePalette,
} from "./engine.js";
import { type GlyphTable, GLYPH_CHARS, glyphLibrary, glyphsFor } from "./glyphs.js";
import { type MotionInput, MOTION_KIT_CODE, normalizeMotion } from "./kit.js";
import { MOTION_3D_CODE } from "./three.js";

export const MOTION_FORMAT = 1;

export const CATEGORIES = ["lower-third", "title", "cta", "stat", "list", "quote", "end-card", "callout", "social", "chart", "logo", "transition", "banner", "timer", "text", "scene"] as const;
export type Category = (typeof CATEGORIES)[number];

/** overlay: transparent, sits over footage · full: draws its own ground (a card, a scene). */
export type Placement = "overlay" | "full";

export const ASPECTS = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350] } as const;
export type Aspect = keyof typeof ASPECTS;
export const ASPECT_NAMES = Object.keys(ASPECTS) as Aspect[];

export type PropType = "text" | "longtext" | "number" | "boolean" | "choice" | "color" | "list" | "image" | "icon";

/** One field of a list prop's rows ({ label: "text", value: "number" }). */
export type ListField = "text" | "number";

export interface PropSpec {
  type: PropType;
  label?: string;
  description?: string;
  default?: unknown;
  /** choice: the values allowed. */
  options?: string[];
  /** number: bounds and step. */
  min?: number;
  max?: number;
  step?: number;
  /** text / longtext: the most characters that still fit the design. */
  maxLength?: number;
  /** list: rows are text (the default) or objects with these fields. */
  of?: ListField | Record<string, ListField>;
  minItems?: number;
  maxItems?: number;
  /** Shown only when another prop has a value ({ prop: "side", is: ["left"] }). */
  when?: { prop: string; is: unknown[] };
}

export interface ItemManifest {
  /** Unique in its pack: lowercase words joined by hyphens ("lower-third"). */
  id: string;
  name: string;
  description: string;
  category: Category;
  tags?: string[];
  placement: Placement;
  /** Seconds. */
  duration: { default: number; min?: number; max?: number };
  /** The aspects the design is laid out for; all four when omitted. */
  aspects?: Aspect[];
  props: Record<string, PropSpec>;
  /** Named moments the code reads with $.beat(name): seconds from the start, or from the end when negative. */
  beats?: Record<string, number>;
  /** Faces the code names besides the brand style's (Family:weight, "i" for italic). */
  fonts?: string[];
  /** The style it is shown in when none is asked for. */
  style?: string;
  /** The picture stops changing after this many seconds before the end (renders hold the last frame). */
  holdFromEnd?: number;
  /** The parts a creator can animate on their own (name → what it is): the names motion overrides use. */
  parts?: Record<string, string>;
  /** Libraries the code uses besides the motion kit: "3d" (scene3d), "world" (country shapes). */
  libs?: LibraryName[];
  /** Faces whose glyphs 3D text is built from: brand roles ("display") or specs ("Anton:400"). Default: display. */
  faces3d?: string[];
}

export interface PackManifest {
  format: number;
  /** Lowercase words joined by hyphens ("essentials"). */
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  /** The default brand style of the pack's items. */
  style?: string;
  /** Item ids, in the order a gallery shows them. */
  items: string[];
  /** A file of helpers prepended to every item's code. */
  shared?: string;
}

/** An item ready to build: its manifest, the pack it belongs to and its own code. */
export interface MotionItem extends ItemManifest {
  pack: string;
  /** "essentials/lower-third". */
  ref: string;
  /** The pack's helpers and the item's frame.js. The kit and libraries are added when it is built. */
  code: string;
  libs: LibraryName[];
}

export interface MotionPack extends PackManifest {
  entries: MotionItem[];
}

export class MotionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MotionError";
  }
}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

/** Problems with an item manifest (empty when it is usable). */
export function manifestProblems(m: Partial<ItemManifest>): string[] {
  const out: string[] = [];
  if (!m.id || !SLUG.test(m.id)) out.push(`id "${m.id ?? ""}" must be lowercase words joined by hyphens`);
  if (!m.name?.trim()) out.push("name is missing");
  if (!m.description?.trim()) out.push("description is missing");
  if (!m.category || !(CATEGORIES as readonly string[]).includes(m.category)) out.push(`category must be one of ${CATEGORIES.join(", ")}`);
  if (m.placement !== "overlay" && m.placement !== "full") out.push('placement must be "overlay" or "full"');
  const d = m.duration;
  if (!d || !(d.default > 0)) out.push("duration.default must be a positive number of seconds");
  else if ((d.min !== undefined && d.min > d.default) || (d.max !== undefined && d.max < d.default)) out.push("duration.default must sit between duration.min and duration.max");
  for (const a of m.aspects ?? []) if (!(a in ASPECTS)) out.push(`aspect "${a}" is not one of ${ASPECT_NAMES.join(", ")}`);
  for (const l of m.libs ?? []) if (!(LIBRARY_NAMES as readonly string[]).includes(l)) out.push(`library "${l}" is not one of ${LIBRARY_NAMES.join(", ")}`);
  for (const [name, p] of Object.entries(m.props ?? {})) {
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,31}$/.test(name)) out.push(`prop "${name}" must be a camelCase name`);
    if (!["text", "longtext", "number", "boolean", "choice", "color", "list", "image", "icon"].includes(p?.type)) out.push(`prop "${name}" has an unknown type`);
    if (p?.type === "choice" && !p.options?.length) out.push(`prop "${name}" is a choice with no options`);
    if (p?.when && !(p.when.prop in (m.props ?? {}))) out.push(`prop "${name}" depends on an unknown prop "${p.when.prop}"`);
  }
  return out;
}

/** An item from its manifest and code, checked; `shared` is the pack's helper file. */
export function makeItem(pack: string, manifest: ItemManifest, frameCode: string, shared = ""): MotionItem {
  const problems = manifestProblems(manifest);
  if (problems.length) throw new MotionError(`${pack}/${manifest.id ?? "?"}: ${problems.join("; ")}`);
  const code = `${shared.trim() ? `${shared.trim()}\n\n` : ""}${frameCode.trim()}\n`;
  // The 60 000-character limit is on what the item's author wrote; the kit and libraries ship with the package.
  const codeProblems = programProblems(code);
  if (codeProblems.length) throw new MotionError(`${pack}/${manifest.id}: ${codeProblems.join("; ")}`);
  return { ...manifest, pack, ref: `${pack}/${manifest.id}`, code, libs: manifest.libs ?? librariesUsed(code) };
}

// ---------------------------------------------------------------------------------------------
// Libraries: code that ships with the package and is added to a program when it is built
// ---------------------------------------------------------------------------------------------

export const LIBRARY_NAMES = ["3d", "world"] as const;
export type LibraryName = (typeof LIBRARY_NAMES)[number];

/** What code calls when it needs a library — so a program someone writes gets it without asking. */
const LIBRARY_USE: Record<LibraryName, RegExp> = { "3d": /\bscene3d\s*\(/, world: /\b(worldMap|worldShapes|MM_WORLD)\b/ };

export function librariesUsed(code: string): LibraryName[] {
  return LIBRARY_NAMES.filter((n) => LIBRARY_USE[n].test(code));
}

const libraries = new Map<string, () => string>([["3d", () => MOTION_3D_CODE]]);
const loaded = new Map<string, string>();

/** Make a library's code available (Node reads it from disk, the browser from the registry). */
export function registerLibrary(name: string, code: string | (() => string)): void {
  libraries.set(name, typeof code === "string" ? () => code : code);
  loaded.delete(name);
}

export function libraryCode(name: string): string | undefined {
  if (!loaded.has(name)) {
    const get = libraries.get(name);
    if (!get) return undefined;
    loaded.set(name, get());
  }
  return loaded.get(name);
}

/** The faces an item's 3D text is built from, under a style: "Inter:900", … */
export function glyphFaces(item: Pick<MotionItem, "libs" | "faces3d">, style: ProgramStyle): string[] {
  if (!item.libs.includes("3d")) return [];
  const roles = item.faces3d?.length ? item.faces3d : ["display"];
  const fonts: Record<string, string | undefined> = { ...style.fonts };
  return [...new Set(roles.map((r) => fonts[r] ?? r))];
}

/** Digits and signs 3D text may compute (counters, prices) on top of the characters in its props. */
const GLYPH_EXTRAS = "0123456789 .,:;%+-–×$€£#&!?'\"()/";

// ---------------------------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------------------------

export interface PropsResult {
  props: Record<string, unknown>;
  warnings: string[];
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function coerceRow(row: unknown, of: ListField | Record<string, ListField>): unknown {
  if (typeof of === "string") return of === "number" ? Number(row) : String(row ?? "");
  // "Label: 42" or "Label=42" from a command line becomes { label, value } for a two-field row.
  if (typeof row === "string") {
    // Only the first separators split: the last field keeps the rest ("Sam: see you at 10:30").
    const keys = Object.keys(of);
    const parts: string[] = [];
    let rest = row;
    for (let i = 0; i < keys.length - 1; i++) {
      const m = /\s*[:=|]\s*/.exec(rest);
      if (!m) break;
      parts.push(rest.slice(0, m.index));
      rest = rest.slice(m.index + m[0].length);
    }
    parts.push(rest);
    row = Object.fromEntries(keys.map((k, i) => [k, parts[i] ?? ""]));
  }
  const o = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(of).map(([k, t]) => [k, t === "number" ? Number(o[k]) || 0 : String(o[k] ?? "")]));
}

/**
 * The props an item draws with: its defaults, overridden by `input` (strings from a command line
 * are read as the prop's type), clamped to the spec. Unknown names and values that do not fit are
 * reported, never thrown, so a render always has something to draw.
 */
export function resolveProps(item: Pick<ItemManifest, "props">, input: Record<string, unknown> = {}): PropsResult {
  const warnings: string[] = [];
  const props: Record<string, unknown> = {};
  for (const name of Object.keys(input)) if (!(name in item.props)) warnings.push(`unknown prop "${name}" (props: ${Object.keys(item.props).join(", ") || "none"})`);
  for (const [name, spec] of Object.entries(item.props)) {
    const given = name in input && input[name] !== undefined && input[name] !== null;
    let v: unknown = given ? input[name] : spec.default;
    switch (spec.type) {
      case "text":
      case "longtext": {
        let s = v == null ? "" : String(v);
        if (spec.type === "text") s = s.replace(/\s*\n\s*/g, " ");
        if (spec.maxLength && s.length > spec.maxLength) {
          warnings.push(`${name} is ${s.length} characters; the design fits ${spec.maxLength} — cut to fit`);
          s = s.slice(0, spec.maxLength).trimEnd();
        }
        v = s;
        break;
      }
      case "number": {
        let n = typeof v === "number" ? v : Number.parseFloat(String(v).replace(/,/g, ""));
        if (!Number.isFinite(n)) {
          if (given) warnings.push(`${name} "${String(v)}" is not a number`);
          n = Number(spec.default) || 0;
        }
        if (spec.min !== undefined && n < spec.min) n = spec.min;
        if (spec.max !== undefined && n > spec.max) n = spec.max;
        v = n;
        break;
      }
      case "boolean":
        v = typeof v === "boolean" ? v : /^(1|true|yes|on)$/i.test(String(v));
        break;
      case "choice": {
        const s = String(v ?? "");
        if (!spec.options!.includes(s)) {
          if (given) warnings.push(`${name} "${s}" is not one of ${spec.options!.join(", ")}`);
          v = spec.options!.includes(String(spec.default)) ? spec.default : spec.options![0];
        } else v = s;
        break;
      }
      case "color": {
        const s = String(v ?? "").trim();
        if (s && !HEX.test(s)) {
          warnings.push(`${name} "${s}" is not a hex colour (#RRGGBB)`);
          v = typeof spec.default === "string" && HEX.test(spec.default) ? spec.default : "";
        } else v = s;
        break;
      }
      case "list": {
        let rows: unknown[] = Array.isArray(v) ? v : typeof v === "string" ? (v.trim().startsWith("[") ? safeJson(v, []) : v.split(/\s*;\s*|\n/).filter(Boolean)) : [];
        const of = spec.of ?? "text";
        rows = rows.map((r) => coerceRow(r, of));
        if (spec.maxItems && rows.length > spec.maxItems) {
          warnings.push(`${name} has ${rows.length} rows; the design fits ${spec.maxItems}`);
          rows = rows.slice(0, spec.maxItems);
        }
        if (spec.minItems && rows.length < spec.minItems) {
          warnings.push(`${name} needs at least ${spec.minItems} rows — the defaults fill in`);
          const fill = (Array.isArray(spec.default) ? spec.default : []).map((r) => coerceRow(r, of));
          rows = [...rows, ...fill.slice(rows.length)];
        }
        v = rows;
        break;
      }
      case "image":
        // A picture is passed to the program as media (see buildProgram); the prop says whether there is one.
        v = typeof v === "string" && v.trim() ? v.trim() : "";
        break;
      case "icon":
        v = String(v ?? spec.default ?? "");
        break;
    }
    props[name] = v;
  }
  return { props, warnings };
}

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------------------------
// Brand styles
// ---------------------------------------------------------------------------------------------

/** What a caller may pass as a style: a built-in name, DESIGN.md text, a BrandStyle or program tokens. */
export type StyleInput = string | BrandStyle | ProgramStyle | null | undefined;

export interface StyleOverrides {
  accent?: string;
  accent2?: string;
  ink?: string;
  paper?: string;
  surface?: string;
  mode?: "dark" | "light";
  display?: string;
  text?: string;
  mono?: string;
}

/** The style tokens a program carries, from a name, DESIGN.md text or tokens, with overrides on top. */
export function resolveStyle(input: StyleInput, overrides: StyleOverrides = {}, fallback = "ember"): ProgramStyle {
  let base: ProgramStyle | null = null;
  if (typeof input === "string" && input.trim()) {
    const s = input.trim();
    const named = /^[a-z0-9-]{1,64}$/i.test(s) ? findStyle(s.toLowerCase(), BUILTIN_STYLES) : null;
    if (named) base = programStyleOf(named);
    else if (/\n/.test(s) || /^---/.test(s) || /^#/.test(s)) base = programStyleOf(parseDesignMd(s, { fallbackName: "custom" }));
    else throw new MotionError(`unknown style "${s}" — built-in styles: ${BUILTIN_STYLES.map((b) => b.name).join(", ")}, or pass a DESIGN.md`);
  } else if (input && typeof input === "object") {
    base = normalizeProgramStyle(input);
    if (!base) throw new MotionError("the style object needs colors.accent, colors.ink and colors.paper as hex colours");
  }
  base ??= programStyleOf(findStyle(fallback, BUILTIN_STYLES) ?? BUILTIN_STYLES[0]!);
  const o = overrides;
  const merged = {
    ...base,
    ...(o.mode ? { mode: o.mode } : {}),
    colors: {
      ...base.colors,
      ...(o.accent ? { accent: o.accent } : {}),
      ...(o.accent2 ? { accent2: o.accent2 } : {}),
      ...(o.ink ? { ink: o.ink } : {}),
      ...(o.paper ? { paper: o.paper } : {}),
      ...(o.surface ? { surface: o.surface } : {}),
    },
    fonts: { ...base.fonts, ...(o.display ? { display: o.display } : {}), ...(o.text ? { text: o.text } : {}), ...(o.mono ? { mono: o.mono } : {}) },
  };
  const out = normalizeProgramStyle(merged);
  if (!out) throw new MotionError("a colour override is not a hex colour (#RRGGBB)");
  return out;
}

// ---------------------------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------------------------

export interface BuildOptions {
  props?: Record<string, unknown>;
  style?: StyleInput;
  colors?: StyleOverrides;
  /** An aspect name, or a canvas size in px. */
  aspect?: Aspect | { width: number; height: number };
  /** Seconds; the item's default when omitted. */
  duration?: number;
  /** Words spoken over the graphic (clip seconds) — items land their text on them. */
  words?: GraphicWord[];
  /** Named moments, overriding the item's. */
  beats?: Record<string, number>;
  /** Image props as data: URLs, by prop name (the caller loads the files). */
  media?: Record<string, string>;
  /** How each part moves: { "*": {…every part}, name: { in: "pop", ease: "bouncy", … } } (see MOVES). */
  motion?: MotionInput;
  /** A choreography mood (energetic, elegant, playful, cinematic, glitchy, minimal, retro, kinetic). */
  mood?: string;
  /** A seed for a new choreography: every seed moves differently, the same seed the same way. */
  seed?: number;
  /** Plays every move faster (2) or slower (0.5). */
  speed?: number;
}

export interface BuiltProgram {
  program: TitleProgram;
  /** Lines of kit and libraries before the item's own code (errors are reported in the author's lines). */
  codeOffset: number;
  duration: number;
  props: Record<string, unknown>;
  style: ProgramStyle;
  /** Image props the program shows, prop name → data URL. */
  media: Record<string, string>;
  warnings: string[];
}

export function canvasFor(aspect: BuildOptions["aspect"]): { width: number; height: number } {
  if (!aspect) return { width: 1920, height: 1080 };
  if (typeof aspect === "string") {
    const a = ASPECTS[aspect as Aspect];
    if (!a) throw new MotionError(`unknown aspect "${aspect}" — use ${ASPECT_NAMES.join(", ")} or WIDTHxHEIGHT`);
    return { width: a[0], height: a[1] };
  }
  const width = Math.round(aspect.width), height = Math.round(aspect.height);
  if (!(width >= 16 && height >= 16 && width <= 8192 && height <= 8192)) throw new MotionError("the canvas must be 16–8192 px each way");
  return { width, height };
}

/** "16:9" / "1920x1080" / "9:16" → an aspect or canvas. */
export function parseAspect(s: string): Aspect | { width: number; height: number } {
  const t = s.trim().toLowerCase();
  if (t in ASPECTS) return t as Aspect;
  const m = /^(\d{2,4})\s*[x×]\s*(\d{2,4})$/.exec(t);
  if (m) return { width: Number(m[1]), height: Number(m[2]) };
  const r = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(t);
  if (r) {
    const w = Number(r[1]), h = Number(r[2]);
    return w >= h ? { width: Math.round((1080 * w) / h / 2) * 2, height: 1080 } : { width: 1080, height: Math.round((1080 * h) / w / 2) * 2 };
  }
  throw new MotionError(`unknown aspect "${s}" — use ${ASPECT_NAMES.join(", ")} or WIDTHxHEIGHT`);
}

/** The program for one item with these options: props resolved, style applied, timed and sized. */
export function buildProgram(item: MotionItem, opts: BuildOptions = {}): BuiltProgram {
  const { width, height } = canvasFor(opts.aspect);
  const warnings: string[] = [];
  const d = item.duration;
  let duration = opts.duration ?? d.default;
  if (!(duration > 0)) duration = d.default;
  if (d.min !== undefined && duration < d.min) {
    warnings.push(`${item.ref} needs at least ${d.min} s — rendering ${d.min} s`);
    duration = d.min;
  }
  if (d.max !== undefined && duration > d.max) {
    warnings.push(`${item.ref} runs at most ${d.max} s — rendering ${d.max} s`);
    duration = d.max;
  }
  const ratio = width / height;
  if (item.aspects?.length && !item.aspects.some((a) => Math.abs(ASPECTS[a][0] / ASPECTS[a][1] - ratio) < 0.02)) warnings.push(`${item.ref} is laid out for ${item.aspects.join(", ")}; ${width}×${height} may crowd`);
  const { props, warnings: pw } = resolveProps(item, opts.props);
  warnings.push(...pw);
  const mo = normalizeMotion({ parts: opts.motion, mood: opts.mood, seed: opts.seed, speed: opts.speed }, Object.keys(item.parts ?? {}));
  warnings.push(...mo.warnings);
  const style = resolveStyle(opts.style ?? item.style, opts.colors);
  const beats: Record<string, number> = {};
  for (const [k, v] of Object.entries({ ...(item.beats ?? {}), ...(opts.beats ?? {}) })) if (Number.isFinite(v)) beats[k] = Math.max(0, Math.min(duration, v < 0 ? duration + v : v));
  const media: Record<string, string> = {};
  for (const [name, spec] of Object.entries(item.props)) {
    if (spec.type !== "image" || !props[name]) continue;
    const url = opts.media?.[name];
    if (url) media[name] = url;
    else warnings.push(`${name}: no picture loaded for "${String(props[name])}"`);
  }
  const program = normalizeProgram(
    {
      code: item.code,
      width,
      height,
      fonts: item.fonts ?? [],
      style,
      palette: stylePalette(style),
      data: Object.keys(mo.motion).length ? { ...props, __motion: mo.motion } : props,
      ...(opts.words?.length ? { words: opts.words } : {}),
      ...(Object.keys(beats).length ? { beats } : {}),
      ...(Object.keys(media).length ? { media: Object.keys(media) } : {}),
      ...(item.holdFromEnd !== undefined ? { holdAfter: Math.max(0, duration - item.holdFromEnd) } : {}),
      brief: item.description,
      author: `MONARC Motion · ${item.ref}`,
      layout: item.placement === "full" ? "full" : "overlay",
    },
    { width, height },
  );
  if (!program) throw new MotionError(`${item.ref} has no code`);
  // The kit, then each library (3D text brings the glyphs of its faces), then the item's own code.
  const prefix: string[] = [MOTION_KIT_CODE];
  for (const lib of item.libs) {
    if (lib === "3d") {
      const chars = Object.keys(item.props).length ? charsOf(props) : GLYPH_CHARS;
      const tables: GlyphTable[] = [];
      for (const face of glyphFaces(item, style)) {
        const t = glyphsFor(face);
        if (t) tables.push(subsetGlyphs(t, chars));
        else warnings.push(`3D text: no glyphs for ${face} here — it draws nothing`);
      }
      prefix.push(glyphLibrary(tables));
    }
    const code = libraryCode(lib);
    if (code) prefix.push(code);
    else warnings.push(`library "${lib}" is not available here`);
  }
  const head = `${prefix.join("\n\n")}\n\n`;
  program.code = head + program.code;
  return { program, codeOffset: head.split("\n").length - 1, duration, props, style, media, warnings };
}

/** The characters a program's props can put on screen, both cases, plus digits and common signs. */
function charsOf(props: Record<string, unknown>): string {
  const s = JSON.stringify(props) + GLYPH_EXTRAS;
  return [...new Set(Array.from(s + s.toUpperCase() + s.toLowerCase()))].join("");
}

function subsetGlyphs(t: GlyphTable, chars: string): GlyphTable {
  const g: GlyphTable["g"] = {};
  for (const ch of chars) {
    const k = String(ch.codePointAt(0));
    if (t.g[k]) g[k] = t.g[k];
  }
  return { ...t, g };
}

/** A one-off item from a program someone wrote (an agent, a developer): no props, data passed through. */
export function customItem(code: string, opts: { id?: string; placement?: Placement; duration?: number; description?: string } = {}): MotionItem {
  const manifest: ItemManifest = {
    id: opts.id && SLUG.test(opts.id) ? opts.id : "custom",
    name: "Custom program",
    description: opts.description?.trim() || "A program written against the MONARC Motion API",
    category: "scene",
    placement: opts.placement ?? "overlay",
    duration: { default: opts.duration && opts.duration > 0 ? opts.duration : 4, min: 0.1, max: 600 },
    props: {},
  };
  return makeItem("local", manifest, code);
}

/** A compact description of an item for an agent or a terminal: what it is and every prop it takes. */
export function describeItem(item: MotionItem): string {
  const props = Object.entries(item.props).map(([k, p]) => {
    const dflt = p.default === undefined ? "" : ` = ${JSON.stringify(p.default)}`;
    const extra = p.type === "choice" ? ` (${p.options!.join(" | ")})` : p.type === "list" ? ` (rows: ${typeof p.of === "object" ? Object.entries(p.of).map(([f, t]) => `${f}:${t}`).join(", ") : (p.of ?? "text")}${p.maxItems ? `, ≤${p.maxItems}` : ""})` : p.maxLength ? ` (≤${p.maxLength} chars)` : p.type === "number" && (p.min !== undefined || p.max !== undefined) ? ` (${p.min ?? "…"}–${p.max ?? "…"})` : "";
    return `  ${k}: ${p.type}${extra}${dflt}${p.description ? ` — ${p.description}` : p.label ? ` — ${p.label}` : ""}`;
  });
  const d = item.duration;
  const parts = Object.entries(item.parts ?? {}).map(([k, v]) => `  ${k} — ${v}`);
  return [
    `${item.ref} — ${item.name} (${item.category}, ${item.placement === "overlay" ? "transparent overlay" : "full frame"})`,
    item.description,
    `duration ${d.default} s${d.min !== undefined || d.max !== undefined ? ` (${d.min ?? "…"}–${d.max ?? "…"} s)` : ""} · aspects ${(item.aspects ?? ASPECT_NAMES).join(", ")}`,
    props.length ? `props:\n${props.join("\n")}` : "props: none",
    parts.length ? `parts (animate each with motion — see moves):\n${parts.join("\n")}` : "",
  ].filter(Boolean).join("\n");
}
