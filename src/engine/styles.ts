// Synced from MONARC core (packages/core/src/styles.ts) by scripts/sync-engine.mjs. Change it there and sync.
/**
 * Brand styles — the look every graphic of a film is designed in, written down as a DESIGN.md.
 *
 * A style is design tokens (colour roles, type faces, case, corner radius, surfaces, texture and a
 * motion personality) plus prose and do/don't rules. MONARC reads them three ways:
 *
 *   - the agent sees a short brief in its editor context (so its graphic briefs, captions and
 *     palette choices follow the brand);
 *   - the motion designer gets the whole brief in every program it writes;
 *   - every placed program carries the tokens (`TitleProgram.style`), so the runtime's defaults —
 *     text colour and face, card radius and shadow, spring feel, grounds — are the brand's even
 *     where the code does not name them.
 *
 * The file format is MONARC's own front matter (below) — but `parseDesignMd` reads any DESIGN.md:
 * Google's design.md tokens (colors / typography / rounded), CSS custom properties, colour tables,
 * or plain prose that names hex colours and fonts. Whatever it cannot map falls back to sane roles
 * (ink = darkest, paper = lightest, accent = most saturated) and the bundled faces nearest the ones
 * named.
 *
 *   ---
 *   name: ember
 *   title: Ember
 *   description: Dark editorial with an orange signal colour
 *   mode: dark
 *   colors: { accent: "#FF6A3D", accent2: "#FFE14D", ink: "#0D0D11", paper: "#F6F1E7", surface: "#17171E" }
 *   fonts: { display: "Inter:900", text: "Inter:600", mono: "Space Mono:700" }
 *   case: upper · motion: punchy · surface: soft · texture: grid · radius: 28
 *   rules: [ … ]
 *   ---
 *   # Ember …prose…
 */
import { GRAPHIC_FONTS, fontSpecKey, parseFontSpec } from "./graphic-fonts.js";

export const STYLE_FILE = "DESIGN.md";
export const STYLE_NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
export const STYLE_LIMITS = { body: 20_000, briefBody: 3_200, rules: 16, rule: 240, description: 280, title: 60, markdown: 200_000 } as const;

export const BRAND_MODES = ["dark", "light"] as const;
export const BRAND_CASES = ["sentence", "upper", "title"] as const;
export const BRAND_MOTIONS = ["snappy", "punchy", "bouncy", "smooth", "calm"] as const;
export const BRAND_SURFACES = ["soft", "flat", "glass", "bold", "sketch", "paper", "clay", "pixel"] as const;
export const BRAND_TEXTURES = ["none", "grid", "glow", "grain", "paper", "board", "parchment", "pixel", "studio"] as const;
export type BrandMode = (typeof BRAND_MODES)[number];
export type BrandCase = (typeof BRAND_CASES)[number];
export type BrandMotion = (typeof BRAND_MOTIONS)[number];
export type BrandSurface = (typeof BRAND_SURFACES)[number];
export type BrandTexture = (typeof BRAND_TEXTURES)[number];

/** Colour roles. ink is always the dark one and paper the light one; `mode` says which is the ground. */
export interface BrandColors {
  /** The one thing that matters on screen. */
  accent: string;
  /** Markers, highlights, a second series. */
  accent2: string;
  ink: string;
  paper: string;
  /** Cards and panels on the ground. */
  surface?: string;
  positive?: string;
  negative?: string;
}

/** Font specs ("Inter:900", "Playfair Display:400i") — always bundled faces. */
export interface BrandFonts {
  display: string;
  text: string;
  mono: string;
  /** An occasional accent face (a serif italic word). */
  accent?: string;
}

export interface BrandStyle {
  name: string;
  title: string;
  description: string;
  mode: BrandMode;
  colors: BrandColors;
  fonts: BrandFonts;
  /** The faces the source named, when they had to be mapped to bundled ones ("Geist" → Inter). */
  fontsNamed?: string[];
  case: BrandCase;
  motion: BrandMotion;
  surface: BrandSurface;
  texture: BrandTexture;
  /** Corner radius of cards on a 1080-wide canvas, px. */
  radius: number;
  rules: string[];
  /** The DESIGN.md prose (without its front matter). */
  body: string;
  source: "builtin" | "user";
  path?: string;
  updatedAt?: number;
}

/** What travels with a turn and to the designer. */
export type StylePayload = Omit<BrandStyle, "path">;

/** The tokens a placed program carries — the runtime's defaults follow them. */
export interface ProgramStyle {
  name?: string;
  mode: BrandMode;
  colors: BrandColors;
  fonts: BrandFonts;
  case: BrandCase;
  motion: BrandMotion;
  surface: BrandSurface;
  texture: BrandTexture;
  radius: number;
}

export class StyleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StyleError";
  }
}

// ---------------------------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------------------------

/** "#abc" / "#AABBCC" / "#AABBCCDD" / "rgb(1, 2, 3)" → "#AABBCC"; anything else → null. */
export function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  let m = /^#?([0-9a-f]{3})$/i.exec(s);
  if (m) return `#${m[1]!.split("").map((c) => c + c).join("")}`.toUpperCase();
  m = /^#?([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(s);
  if (m && (s.startsWith("#") || /^[0-9a-f]{6}$/i.test(s))) return `#${m[1]}`.toUpperCase();
  m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(s);
  if (m) return `#${[m[1], m[2], m[3]].map((x) => Math.min(255, Number(x)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  return null;
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative lightness 0–1 (Rec. 709 weights). */
export function lightness(hex: string): number {
  const [r, g, b] = rgbOf(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function hsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = rgbOf(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h, s, l };
}

/** How colourful a colour reads (saturation, damped at the extremes of lightness). */
function chroma(hex: string): number {
  const { s, l } = hsl(hex);
  return s * (1 - Math.abs(2 * l - 1));
}

function hueGap(a: string, b: string): number {
  const d = Math.abs(hsl(a).h - hsl(b).h);
  return Math.min(d, 360 - d);
}

/** WCAG contrast ratio of two colours. */
export function contrastRatio(a: string, b: string): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L = (hex: string) => {
    const [r, g, b] = rgbOf(hex);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const [x, y] = [L(a), L(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

// ---------------------------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------------------------

/** A named family → the bundled face that reads closest. Order matters (mono before sans …). */
const FONT_MAP: Array<[RegExp, string]> = [
  [/\b(space mono|mono|monospace|code|courier|menlo|consolas|jetbrains|fira code|sf mono|plex mono|roboto mono|geist mono|ubuntu mono)\b/i, "Space Mono"],
  [/\b(press start|pixel(ated)? font|8-?bit|arcade|vt323|silkscreen|pixelify)\b/i, "Press Start 2P"],
  [/\b(permanent marker|rock salt|sharpie)\b/i, "Permanent Marker"],
  [/\b(patrick hand|indie flower|gloria|architects daughter|comic neue|shadows into light)\b/i, "Patrick Hand"],
  [/\b(im fell|fell english|storybook|fairy ?tale|caslon|old ?style|blackletter|medieval)\b/i, "IM Fell English"],
  [/\b(fredoka|baloo|chewy|bubbl\w*|cartoon|clay)\b/i, "Fredoka"],
  [/\b(caveat|handwrit\w*|hand-?drawn|script|marker|brush|kalam)\b/i, "Caveat"],
  [/\b(anton|bebas|oswald|league gothic|impact|condensed|compressed|druk|knockout|big shoulders)\b/i, "Anton"],
  [/\b(playfair|georgia|times|garamond|tiempos|new york|canela|freight|lora|merriweather|didot|bodoni|recoleta|gt super|dm serif|baskerville|fraunces|instrument serif|editorial new|serif)\b/i, "Playfair Display"],
  [/\b(poppins|circular|product sans|avenir|nunito|quicksand|varela|comfortaa|rounded)\b/i, "Poppins"],
  [/\b(montserrat|gotham|proxima|raleway|futura|josefin|brandon)\b/i, "Montserrat"],
  [/\b(space grotesk|grotesk|grotesque|neue haas|aeonik|satoshi|general sans|manrope|archivo|syne|clash)\b/i, "Space Grotesk"],
  [/\b(outfit|lexend|urbanist|plus jakarta|sora)\b/i, "Outfit"],
  [/\b(gabarito|cabinet|bricolage)\b/i, "Gabarito"],
  [/\b(inter|geist|helvetica|arial|sf pro|san francisco|system-ui|roboto|segoe|ibm plex sans|source sans|open sans|lato|work sans|dm sans|noto sans|sans-serif|sans)\b/i, "Inter"],
];

/** The bundled family nearest a named one ("Geist" → Inter, "Tiempos" → Playfair Display). */
export function bundledFamily(named: string): string {
  const s = named.trim();
  for (const fam of Object.keys(GRAPHIC_FONTS)) if (fam.toLowerCase() === s.toLowerCase()) return fam;
  // "sans-serif" must not read as a serif.
  const probe = s.replace(/sans-serif/gi, "sans");
  for (const [re, fam] of FONT_MAP) if (re.test(probe)) return fam;
  return "Inter";
}

/** "Geist:700" / "Tiempos Headline 500 italic" / "Inter" → a bundled spec, normalised. */
export function bundledSpec(named: string, weight?: number, italic?: boolean): string {
  const raw = named.trim();
  const [fam = "Inter", w] = raw.includes(":") ? raw.split(":") : [raw, undefined];
  const wNum = Number(String(w ?? "").replace(/[^0-9]/g, "")) || weight || 700;
  const it = italic ?? /i(talic)?$/i.test(String(w ?? ""));
  return fontSpecKey(parseFontSpec(`${bundledFamily(fam)}:${wNum}${it ? "i" : ""}`));
}

// ---------------------------------------------------------------------------------------------
// A small YAML: nested maps by indentation, `- item` lists, inline [a, b] and {k: v}, quotes
// ---------------------------------------------------------------------------------------------

type Yaml = string | number | boolean | null | Yaml[] | { [k: string]: Yaml };

function scalar(raw: string): Yaml {
  const t = raw.trim();
  if (!t) return "";
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1).replace(/\\"/g, '"').replace(/''/g, "'");
  if (t.startsWith("[") && t.endsWith("]")) return splitInline(t.slice(1, -1)).map(scalar);
  if (t.startsWith("{") && t.endsWith("}")) {
    const o: Record<string, Yaml> = {};
    for (const part of splitInline(t.slice(1, -1))) {
      const k = /^\s*["']?([^"':]+)["']?\s*:\s*([\s\S]*)$/.exec(part);
      if (k) o[k[1]!.trim()] = scalar(k[2]!);
    }
    return o;
  }
  if (/^(true|false)$/i.test(t)) return /^true$/i.test(t);
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t.replace(/\s+#.*$/, "");
}

/** Split "a, [b, c], {d: e}" at top-level commas. */
function splitInline(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let q: string | null = null;
  let cur = "";
  for (const ch of s) {
    if (q) {
      cur += ch;
      if (ch === q) q = null;
      continue;
    }
    if (ch === '"' || ch === "'") q = ch;
    if (ch === "[" || ch === "{") depth++;
    if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Parse the YAML subset front matter uses. Unknown shapes come back as strings. */
export function parseYamlLite(text: string): Record<string, Yaml> {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() && !l.trimStart().startsWith("#"));
  let i = 0;
  const indentOf = (l: string) => l.length - l.trimStart().length;
  function block(indent: number): Yaml {
    const first = lines[i];
    if (first !== undefined && first.trimStart().startsWith("- ") && indentOf(first) >= indent) {
      const list: Yaml[] = [];
      const ind = indentOf(first);
      while (i < lines.length && indentOf(lines[i]!) === ind && lines[i]!.trimStart().startsWith("-")) {
        const item = lines[i]!.trimStart().replace(/^-\s*/, "");
        i++;
        const kv = /^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(item);
        if (kv && !/^["']/.test(item)) {
          const o: Record<string, Yaml> = { [kv[1]!]: kv[2]!.trim() ? scalar(kv[2]!) : block(ind + 2) };
          while (i < lines.length && indentOf(lines[i]!) > ind && !lines[i]!.trimStart().startsWith("- ")) {
            const m = /^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(lines[i]!.trim());
            i++;
            if (m) o[m[1]!] = m[2]!.trim() ? scalar(m[2]!) : block(ind + 4);
          }
          list.push(o);
        } else list.push(scalar(item));
      }
      return list;
    }
    const o: Record<string, Yaml> = {};
    while (i < lines.length) {
      const l = lines[i]!;
      const ind = indentOf(l);
      if (ind < indent) break;
      const m = /^["']?([^"':]+?)["']?\s*:\s*(.*)$/.exec(l.trim());
      i++;
      if (!m) continue;
      const key = m[1]!.trim();
      const v = m[2]!.trim();
      if (v === "|" || v === ">" || v === "|-" || v === ">-") {
        const parts: string[] = [];
        while (i < lines.length && indentOf(lines[i]!) > ind) parts.push(lines[i++]!.trim());
        o[key] = parts.join(v.startsWith(">") ? " " : "\n");
      } else if (v) o[key] = scalar(v);
      else if (i < lines.length && indentOf(lines[i]!) > ind) o[key] = block(indentOf(lines[i]!));
      else o[key] = "";
    }
    return o;
  }
  const r = block(0);
  return r && typeof r === "object" && !Array.isArray(r) ? (r as Record<string, Yaml>) : {};
}

function splitDoc(md: string): { front: Record<string, Yaml>; body: string } {
  const text = md.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const m = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(text);
  if (!m) return { front: {}, body: text.trim() };
  return { front: parseYamlLite(m[1] ?? ""), body: text.slice(m[0].length).trim() };
}

// ---------------------------------------------------------------------------------------------
// Reading a DESIGN.md
// ---------------------------------------------------------------------------------------------

const str = (v: Yaml | undefined): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const isMap = (v: Yaml | undefined): v is { [k: string]: Yaml } => !!v && typeof v === "object" && !Array.isArray(v);

/** "Color Grading (v2)" → "color-grading-v2". */
export function slugifyStyleName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

const ROLE_WORDS: Array<[keyof BrandColors | "bg", RegExp]> = [
  ["accent2", /\b(accent[-_ ]?2|secondary|highlight|marker|tertiary|support(ing)?|accent[-_ ]?alt)\b/i],
  ["accent", /\b(accent|primary|brand|signal|key colou?r|main colou?r|cta|action)\b/i],
  ["negative", /\b(error|danger|negative|destructive|warning red|alert)\b/i],
  ["positive", /\b(success|positive|confirm|ok green)\b/i],
  ["surface", /\b(surface|card|panel|container|elevated|raised|tile)\b/i],
  ["bg", /\b(background|bg|canvas|ground|page|paper|base)\b/i],
  ["ink", /\b(ink|text|foreground|fg|on[-_ ]?(background|surface|primary)|body copy|heading colou?r)\b/i],
];

interface Labeled {
  hex: string;
  label: string;
}

/** Every colour a DESIGN.md names, with the words around it. */
function collectColors(front: Record<string, Yaml>, body: string): Labeled[] {
  const out: Labeled[] = [];
  const walk = (v: Yaml | undefined, label: string) => {
    if (typeof v === "string") {
      const hex = normalizeHex(v);
      if (hex) out.push({ hex, label });
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, label));
    else if (isMap(v)) for (const [k, x] of Object.entries(v)) walk(x, `${label} ${k}`.trim());
  };
  for (const key of ["colors", "colours", "color", "palette", "tokens", "theme"]) if (front[key] !== undefined) walk(front[key], "");
  for (const line of body.split("\n")) {
    for (const m of line.matchAll(/#[0-9a-f]{6}(?:[0-9a-f]{2})?\b|#[0-9a-f]{3}\b|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}[^)]*\)/gi)) {
      const hex = normalizeHex(m[0]);
      if (!hex) continue;
      const before = line.slice(0, m.index).replace(/[`*|:—–-]+/g, " ");
      const label = before.trim().split(/\s+/).slice(-4).join(" ");
      out.push({ hex, label: label || line.trim().slice(0, 40) });
    }
  }
  return out;
}

/** Colour roles from every colour named. Mode: the front matter's, else the labelled background's lightness, else the prose's hint, else dark. */
function assignColors(found: Labeled[], modeFront: BrandMode | null, modeProse: BrandMode | null = null): { colors: BrandColors; mode: BrandMode } {
  const role: Partial<Record<keyof BrandColors | "bg", string>> = {};
  for (const { hex, label } of found) {
    for (const [r, re] of ROLE_WORDS) {
      if (role[r]) continue;
      if (re.test(label)) {
        role[r] = hex;
        break;
      }
    }
  }
  const all = [...new Set(found.map((f) => f.hex))];
  if (!all.length) return { colors: { ...BUILTIN_STYLE_EMBER_COLORS }, mode: modeFront ?? modeProse ?? "dark" };
  const byLight = [...all].sort((a, b) => lightness(a) - lightness(b));
  const darkest = byLight[0]!;
  const lightest = byLight[byLight.length - 1]!;
  const ink = role.ink && lightness(role.ink) < 0.35 ? role.ink : lightness(darkest) < 0.3 ? darkest : "#0D0D11";
  const paper = role.ink && lightness(role.ink) > 0.7 ? role.ink : lightness(lightest) > 0.7 ? lightest : "#F6F1E7";
  const mode: BrandMode = modeFront ?? (role.bg ? (lightness(role.bg) < 0.45 ? "dark" : "light") : (modeProse ?? "dark"));
  const neutral = (h: string) => chroma(h) < 0.12;
  const colourful = all.filter((h) => !neutral(h) && h !== ink && h !== paper).sort((a, b) => chroma(b) - chroma(a));
  const accent = role.accent && !neutral(role.accent) ? role.accent : (colourful[0] ?? role.accent ?? "#FF6A3D");
  const accent2 = role.accent2 && role.accent2 !== accent ? role.accent2 : (colourful.find((h) => h !== accent && hueGap(h, accent) > 28) ?? colourful.find((h) => h !== accent) ?? (lightness(accent) > 0.6 ? "#7C5CFF" : "#FFE14D"));
  const surface = role.surface && role.surface !== ink && role.surface !== paper ? role.surface : undefined;
  const colors: BrandColors = { accent, accent2, ink, paper, ...(surface ? { surface } : {}), ...(role.positive ? { positive: role.positive } : {}), ...(role.negative ? { negative: role.negative } : {}) };
  return { colors, mode };
}

/** Faces a DESIGN.md names: front matter typography / fonts, then prose. */
function collectFonts(front: Record<string, Yaml>): { display?: string; text?: string; mono?: string; accent?: string; named: string[] } {
  const named: string[] = [];
  const out: { display?: string; text?: string; mono?: string; accent?: string } = {};
  const fonts = front.fonts ?? front.font ?? front.type;
  if (isMap(fonts)) {
    for (const [k, v] of Object.entries(fonts)) {
      const s = str(v);
      if (!s) continue;
      named.push(s.split(":")[0]!);
      const key = k.toLowerCase();
      const role = /display|head|title|hero/.test(key) ? "display" : /mono|code|label/.test(key) ? "mono" : /accent|serif|italic/.test(key) ? "accent" : "text";
      if (!out[role]) out[role] = s;
    }
  }
  const typo = front.typography;
  if (isMap(typo)) {
    for (const [k, v] of Object.entries(typo)) {
      const fam = isMap(v) ? str(v.fontFamily ?? v["font-family"] ?? v.family) : str(v);
      if (!fam) continue;
      const weight = isMap(v) ? Number(str(v.fontWeight ?? v["font-weight"] ?? v.weight)) || undefined : undefined;
      const famName = fam.split(",")[0]!.replace(/["']/g, "").trim();
      named.push(famName);
      const key = k.toLowerCase();
      const spec = `${famName}${weight ? `:${weight}` : ""}`;
      if (/display|headline|h1|title|hero/.test(key) && !out.display) out.display = spec;
      else if (/mono|code|label/.test(key) && !out.mono) out.mono = spec;
      else if (/body|text|paragraph|copy/.test(key) && !out.text) out.text = spec;
    }
  }
  return { ...out, named: [...new Set(named)] };
}

function fontsFromProse(body: string): string[] {
  const hits: string[] = [];
  for (const m of body.matchAll(/(?:font(?:-family)?|typeface|face|set in|uses?)\s*[:=]?\s*["'`]?([A-Z][A-Za-z0-9]+(?:\s[A-Z][A-Za-z0-9]+){0,2})/g)) hits.push(m[1]!);
  for (const fam of [...Object.keys(GRAPHIC_FONTS), "Geist", "Helvetica", "SF Pro", "Roboto", "Tiempos", "Satoshi", "JetBrains Mono", "IBM Plex", "Bebas Neue", "Oswald", "Georgia", "Söhne", "Aeonik"]) {
    if (new RegExp(`\\b${fam.replace(/\s+/g, "\\s+")}\\b`, "i").test(body)) hits.push(fam);
  }
  return [...new Set(hits)];
}

function pickEnum<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  const s = String(v ?? "").toLowerCase().trim();
  return (allowed as readonly string[]).includes(s) ? (s as T) : null;
}

function inferCase(text: string): BrandCase {
  if (/\bsentence[- ]case\b/i.test(text)) return "sentence";
  if (/\btitle[- ]case\b/i.test(text)) return "title";
  if (/\b(all[- ]caps|uppercase|upper[- ]case|caps lock)\b/i.test(text)) return "upper";
  return "sentence";
}

function inferMotion(text: string): BrandMotion {
  if (/\b(bouncy|bounce|playful|springy|elastic|squash)\b/i.test(text)) return "bouncy";
  if (/\b(punchy|bold motion|energetic|aggressive|slam|kinetic|hype)\b/i.test(text)) return "punchy";
  if (/\b(calm|subtle|gentle|quiet|restrained|slow)\b/i.test(text)) return "calm";
  if (/\b(smooth|elegant|graceful|fluid|luxur\w*|premium)\b/i.test(text)) return "smooth";
  return "snappy";
}

function inferSurface(text: string): BrandSurface {
  if (/\b(pixel ?art|8-?bit|16-?bit|retro game|arcade)\b/i.test(text)) return "pixel";
  if (/\b(clay(mation)?|plasticine|stop-?motion clay)\b/i.test(text)) return "clay";
  if (/\b(paper (cut-?outs?|collage|craft|diorama)|cut-?outs?|collage|torn paper|diorama)\b/i.test(text)) return "paper";
  if (/\b(hand-?drawn|sketch\w*|doodle\w*|whiteboard|scribble\w*)\b/i.test(text)) return "sketch";
  if (/\b(glass|frosted|translucent|blur(red)? panels?)\b/i.test(text)) return "glass";
  if (/\b(brutal\w*|neo-?brutal\w*|hard shadows?|thick (out)?lines?|bold outlines?)\b/i.test(text)) return "bold";
  if (/\bflat\b|\bno shadows?\b/i.test(text)) return "flat";
  return "soft";
}

function inferTexture(text: string): BrandTexture {
  if (/\b(pixel ?art|8-?bit|16-?bit|retro game|arcade)\b/i.test(text)) return "pixel";
  if (/\b(whiteboard|dry-?erase)\b/i.test(text)) return "board";
  if (/\b(parchment|storybook|fairy ?tale|aged paper|old book)\b/i.test(text)) return "parchment";
  if (/\b(clay(mation)?|plasticine|studio backdrop|cyclorama)\b/i.test(text)) return "studio";
  if (/\b(paper texture|cut paper|collage|torn paper|diorama|sketchbook|notebook|kraft)\b/i.test(text)) return "paper";
  if (/\b(grain|film grain|noise|analog)\b/i.test(text)) return "grain";
  if (/\b(neon|glow|glowing|luminous)\b/i.test(text)) return "glow";
  if (/\b(grid|graph paper|blueprint)\b/i.test(text)) return "grid";
  return "none";
}

/** Bullets under headings that read as rules (Do / Don't / Rules / Principles / Never / Always). */
function collectRules(body: string): string[] {
  const out: string[] = [];
  let inRules = false;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    const h = /^#{1,6}\s+(.*)$/.exec(line);
    if (h) {
      inRules = /\b(rules?|do'?s|don'?ts?|dos and don'?ts|guidelines|principles|never|always|voice|usage|avoid)\b/i.test(h[1]!);
      continue;
    }
    if (!inRules) continue;
    const b = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (b && b[1]!.trim()) out.push(b[1]!.replace(/\*\*/g, "").trim().slice(0, STYLE_LIMITS.rule));
    if (out.length >= STYLE_LIMITS.rules) break;
  }
  return out;
}

function firstParagraph(body: string): string {
  for (const block of body.split(/\n\s*\n/)) {
    const t = block.trim();
    if (!t || t.startsWith("#") || t.startsWith("|") || t.startsWith("```") || /^[-*]\s/.test(t)) continue;
    return t.replace(/\s+/g, " ").replace(/[*_`]/g, "").slice(0, STYLE_LIMITS.description);
  }
  return "";
}

/**
 * Read a DESIGN.md — MONARC's own, Google's design.md tokens, CSS variables or plain prose —
 * into a style. Throws StyleError only when there is nothing to name it by.
 */
export function parseDesignMd(markdown: string, opts: { source?: BrandStyle["source"]; fallbackName?: string; path?: string; updatedAt?: number } = {}): BrandStyle {
  if (markdown.length > STYLE_LIMITS.markdown) throw new StyleError(`The DESIGN.md is ${Math.round(markdown.length / 1000)} KB — keep it under ${STYLE_LIMITS.markdown / 1000} KB.`);
  const { front, body } = splitDoc(markdown);
  const h1 = /^#\s+(.+)$/m.exec(body)?.[1]?.replace(/[*_`]/g, "").trim();
  const title = (str(front.title) || str(front.name) || h1 || opts.fallbackName || "").slice(0, STYLE_LIMITS.title).trim();
  const name = slugifyStyleName(str(front.name) || title || opts.fallbackName || "");
  if (!name || !STYLE_NAME_RE.test(name)) throw new StyleError("The style needs a name — add `name:` to the front matter or a # heading.");
  const all = `${body}\n${JSON.stringify(front)}`;
  const modeFront = pickEnum<BrandMode>(front.mode ?? front.theme ?? front.scheme, BRAND_MODES);
  const modeProse: BrandMode | null = /\b(dark (mode|theme|ground|background)s?|on dark|black background)\b/i.test(body) ? "dark" : /\b(light (mode|theme|ground|background)s?|cream (ground|background)|white background|paper white)\b/i.test(body) ? "light" : null;
  // Colours: MONARC's explicit roles win; otherwise every colour named, mapped to roles.
  const explicit = isMap(front.colors) ? front.colors : isMap(front.colours) ? front.colours : null;
  const exp = (k: string) => (explicit ? normalizeHex(str(explicit[k])) : null);
  const { colors: guessed, mode } = assignColors(collectColors(front, body), modeFront, modeProse);
  const colors: BrandColors = {
    accent: exp("accent") ?? guessed.accent,
    accent2: exp("accent2") ?? guessed.accent2,
    ink: exp("ink") ?? guessed.ink,
    paper: exp("paper") ?? guessed.paper,
    ...((exp("surface") ?? guessed.surface) ? { surface: (exp("surface") ?? guessed.surface)! } : {}),
    ...((exp("positive") ?? guessed.positive) ? { positive: (exp("positive") ?? guessed.positive)! } : {}),
    ...((exp("negative") ?? guessed.negative) ? { negative: (exp("negative") ?? guessed.negative)! } : {}),
  };
  if (lightness(colors.ink) > lightness(colors.paper)) [colors.ink, colors.paper] = [colors.paper, colors.ink];
  // Faces: named roles, then whatever the prose mentions, mapped to bundled ones.
  const f = collectFonts(front);
  const prose = fontsFromProse(body);
  const named = [...new Set([...f.named, ...prose])].filter((n) => !/^(Display|Text|Mono)$/i.test(n));
  const firstSans = named.find((n) => !/mono|serif|caveat|hand/i.test(bundledFamily(n)) || bundledFamily(n) === "Inter");
  const display = bundledSpec(f.display ?? firstSans ?? "Inter", 900);
  const text = bundledSpec(f.text ?? f.display?.split(":")[0] ?? firstSans ?? "Inter", 600);
  const mono = bundledSpec(f.mono ?? named.find((n) => bundledFamily(n) === "Space Mono") ?? "Space Mono", 700);
  const accentNamed = f.accent ?? named.find((n) => bundledFamily(n) === "Playfair Display");
  const fonts: BrandFonts = { display, text, mono, ...(accentNamed ? { accent: bundledSpec(accentNamed, 400, true) } : {}) };
  const mapped = named.filter((n) => bundledFamily(n).toLowerCase() !== n.toLowerCase());
  const radiusRaw = front.radius ?? (isMap(front.rounded) ? (front.rounded.md ?? front.rounded.lg ?? Object.values(front.rounded)[0]) : front.rounded);
  const radiusNum = Number(String(radiusRaw ?? "").replace(/[^0-9.]/g, ""));
  // Web tokens are 1× CSS px; a 1080-wide video canvas reads about twice that.
  const radius = Number.isFinite(radiusNum) && String(radiusRaw ?? "").trim() !== "" ? Math.round(Math.min(80, Math.max(0, front.radius !== undefined ? radiusNum : radiusNum * 2))) : 28;
  const rulesFront = Array.isArray(front.rules) ? front.rules.map((r) => str(r)).filter(Boolean) : [];
  const rules = [...new Set([...rulesFront, ...collectRules(body)])].slice(0, STYLE_LIMITS.rules).map((r) => r.slice(0, STYLE_LIMITS.rule));
  return {
    name,
    title: title || name,
    description: (str(front.description) || firstParagraph(body)).slice(0, STYLE_LIMITS.description),
    mode,
    colors,
    fonts,
    ...(mapped.length ? { fontsNamed: mapped.slice(0, 6) } : {}),
    case: pickEnum<BrandCase>(front.case ?? front.textCase, BRAND_CASES) ?? inferCase(all),
    motion: pickEnum<BrandMotion>(front.motion, BRAND_MOTIONS) ?? inferMotion(all),
    surface: pickEnum<BrandSurface>(front.surface ?? front.surfaces, BRAND_SURFACES) ?? inferSurface(all),
    texture: pickEnum<BrandTexture>(front.texture, BRAND_TEXTURES) ?? inferTexture(all),
    radius,
    rules,
    body: body.slice(0, STYLE_LIMITS.body),
    source: opts.source ?? "user",
    ...(opts.path ? { path: opts.path } : {}),
    ...(opts.updatedAt ? { updatedAt: opts.updatedAt } : {}),
  };
}

// ---------------------------------------------------------------------------------------------
// Writing one
// ---------------------------------------------------------------------------------------------

const q = (s: string) => JSON.stringify(s);

const MOTION_WORDS: Record<BrandMotion, string> = {
  snappy: "quick springs that settle cleanly, a small overshoot",
  punchy: "fast, hard landings — slams, stamps, a jolt on the punch word",
  bouncy: "springy and playful — visible overshoot, things pop and wobble into place",
  smooth: "long eased moves without overshoot, elegant crossfades and slides",
  calm: "slow, gentle fades and drifts; nothing jumps",
};
const SURFACE_WORDS: Record<BrandSurface, string> = {
  soft: "cards float on soft layered shadows",
  flat: "flat fills, no shadows — separation by colour alone",
  glass: "translucent frosted panels with a thin light border",
  bold: "thick ink outlines and hard offset shadows",
  sketch: "hand-drawn wobbly ink outlines that boil gently, hatched instead of shaded",
  paper: "cut-paper pieces with torn or scissor edges and soft drop shadows, held by tape",
  clay: "chunky rounded clay forms with a soft sheen and a contact shadow",
  pixel: "pixel-art boxes with stepped corners, chunky borders and hard pixel shadows",
};
const TEXTURE_WORDS: Record<BrandTexture, string> = {
  none: "clean grounds, no texture",
  grid: "a faint line grid and a drifting glow on grounds",
  glow: "neon glows on the accent, dark grounds",
  grain: "a light film grain over grounds",
  paper: "a paper-fibre texture on warm grounds",
  board: "a whiteboard: a soft sheen and faint ghosts of erased marker",
  parchment: "aged parchment: blotchy tone, darker burnt edges",
  pixel: "a faint pixel grid and scanlines",
  studio: "a soft studio backdrop sweeping into the floor, light from above",
};
const CASE_WORDS: Record<BrandCase, string> = { sentence: "Sentence case everywhere", upper: "UPPERCASE headlines, sentence-case supporting lines", title: "Title Case headlines" };

/** The prose MONARC writes when a style has none of its own. */
export function defaultStyleBody(s: Pick<BrandStyle, "title" | "description" | "mode" | "colors" | "fonts" | "case" | "motion" | "surface" | "texture" | "radius" | "rules">): string {
  const c = s.colors;
  const lines = [
    `# ${s.title}`,
    "",
    s.description || `${s.mode === "dark" ? "Dark" : "Light"} grounds, ${spec(s.fonts.display)} headlines.`,
    "",
    "## Colour",
    `- Accent \`${c.accent}\` — the one thing that matters in a frame: the number, the key word, the action.`,
    `- Accent 2 \`${c.accent2}\` — markers under words, highlights, a second series.`,
    `- Ink \`${c.ink}\` — ${s.mode === "dark" ? "the ground" : "text and outlines"}.`,
    `- Paper \`${c.paper}\` — ${s.mode === "dark" ? "text on the ground" : "the ground"}.`,
    ...(c.surface ? [`- Surface \`${c.surface}\` — cards and panels.`] : []),
    "",
    "## Type",
    `- Display: ${spec(s.fonts.display)} · Text: ${spec(s.fonts.text)} · Labels: ${spec(s.fonts.mono)}${s.fonts.accent ? ` · Accent: ${spec(s.fonts.accent)}` : ""}.`,
    `- ${CASE_WORDS[s.case]}.`,
    "",
    "## Shape and surface",
    `- Corners ${s.radius} px on a 1080-wide frame; ${SURFACE_WORDS[s.surface]}; ${TEXTURE_WORDS[s.texture]}.`,
    "",
    "## Motion",
    `- ${MOTION_WORDS[s.motion][0]!.toUpperCase()}${MOTION_WORDS[s.motion].slice(1)}.`,
  ];
  if (s.rules.length) lines.push("", "## Rules", ...s.rules.map((r) => `- ${r}`));
  return lines.join("\n");
}

function spec(s: string): string {
  const f = parseFontSpec(s);
  return `${f.family} ${f.weight}${f.italic ? " italic" : ""}`;
}

/** A style as a DESIGN.md MONARC (and any reader) understands. */
export function composeDesignMd(s: Omit<BrandStyle, "source" | "path" | "updatedAt"> & { source?: BrandStyle["source"] }): string {
  const c = s.colors;
  const front = [
    "---",
    `name: ${s.name}`,
    `title: ${q(s.title)}`,
    `description: ${q(s.description)}`,
    `mode: ${s.mode}`,
    "colors:",
    `  accent: ${q(c.accent)}`,
    `  accent2: ${q(c.accent2)}`,
    `  ink: ${q(c.ink)}`,
    `  paper: ${q(c.paper)}`,
    ...(c.surface ? [`  surface: ${q(c.surface)}`] : []),
    ...(c.positive ? [`  positive: ${q(c.positive)}`] : []),
    ...(c.negative ? [`  negative: ${q(c.negative)}`] : []),
    "fonts:",
    `  display: ${q(s.fonts.display)}`,
    `  text: ${q(s.fonts.text)}`,
    `  mono: ${q(s.fonts.mono)}`,
    ...(s.fonts.accent ? [`  accent: ${q(s.fonts.accent)}`] : []),
    `case: ${s.case}`,
    `motion: ${s.motion}`,
    `surface: ${s.surface}`,
    `texture: ${s.texture}`,
    `radius: ${Math.round(s.radius)}`,
    ...(s.rules.length ? ["rules:", ...s.rules.map((r) => `  - ${q(r)}`)] : []),
    "---",
    "",
  ];
  const body = s.body.trim() || defaultStyleBody(s);
  return `${front.join("\n")}${body}\n`;
}

// ---------------------------------------------------------------------------------------------
// What prompts and programs read
// ---------------------------------------------------------------------------------------------

/** The tokens a program carries. */
export function programStyleOf(s: Pick<BrandStyle, "name" | "mode" | "colors" | "fonts" | "case" | "motion" | "surface" | "texture" | "radius">): ProgramStyle {
  return { name: s.name, mode: s.mode, colors: { ...s.colors }, fonts: { ...s.fonts }, case: s.case, motion: s.motion, surface: s.surface, texture: s.texture, radius: s.radius };
}

/** The palette array programs also get (accent first; the runtime reads roles from `style`). */
export function stylePalette(s: Pick<BrandStyle, "colors">): string[] {
  return [s.colors.accent, s.colors.accent2, s.colors.ink, s.colors.paper];
}

/** Every bundled face a style draws with (to embed in the frames). */
export function styleFonts(s: Pick<BrandStyle, "fonts">): string[] {
  return [s.fonts.display, s.fonts.text, s.fonts.mono, ...(s.fonts.accent ? [s.fonts.accent] : [])];
}

/** Validate a program's style tokens (from a model or a file); null when unusable. */
export function normalizeProgramStyle(v: unknown): ProgramStyle | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const col = (o.colors ?? {}) as Record<string, unknown>;
  const accent = normalizeHex(col.accent);
  const ink = normalizeHex(col.ink);
  const paper = normalizeHex(col.paper);
  if (!accent || !ink || !paper) return null;
  const fonts = (o.fonts ?? {}) as Record<string, unknown>;
  const fspec = (x: unknown, dflt: string) => (typeof x === "string" && x.trim() ? fontSpecKey(parseFontSpec(x)) : dflt);
  const opt = (k: string) => normalizeHex(col[k]);
  const radius = Number(o.radius);
  return {
    ...(typeof o.name === "string" && o.name ? { name: o.name.slice(0, 64) } : {}),
    mode: pickEnum<BrandMode>(o.mode, BRAND_MODES) ?? "dark",
    colors: { accent, accent2: opt("accent2") ?? "#FFE14D", ink, paper, ...(opt("surface") ? { surface: opt("surface")! } : {}), ...(opt("positive") ? { positive: opt("positive")! } : {}), ...(opt("negative") ? { negative: opt("negative")! } : {}) },
    fonts: { display: fspec(fonts.display, "Inter:900"), text: fspec(fonts.text, "Inter:600"), mono: fspec(fonts.mono, "Space Mono:700"), ...(typeof fonts.accent === "string" && fonts.accent ? { accent: fspec(fonts.accent, "Playfair Display:400i") } : {}) },
    case: pickEnum<BrandCase>(o.case, BRAND_CASES) ?? "sentence",
    motion: pickEnum<BrandMotion>(o.motion, BRAND_MOTIONS) ?? "snappy",
    surface: pickEnum<BrandSurface>(o.surface, BRAND_SURFACES) ?? "soft",
    texture: pickEnum<BrandTexture>(o.texture, BRAND_TEXTURES) ?? "none",
    radius: Number.isFinite(radius) ? Math.max(0, Math.min(80, Math.round(radius))) : 28,
  };
}

/** The style in words, for the agent and the designer. `full` adds the DESIGN.md prose. */
export function styleBrief(s: Pick<BrandStyle, "name" | "title" | "description" | "mode" | "colors" | "fonts" | "fontsNamed" | "case" | "motion" | "surface" | "texture" | "radius" | "rules" | "body">, opts: { full?: boolean } = {}): string {
  const c = s.colors;
  const lines = [
    `Brand style "${s.title}" (${s.name})${s.description ? ` — ${s.description}` : ""}.`,
    `Mode ${s.mode}: ${s.mode === "dark" ? `grounds are ink ${c.ink}, text is paper ${c.paper}` : `grounds are paper ${c.paper}, text is ink ${c.ink}`}${c.surface ? `, cards ${c.surface}` : ""}.`,
    `Colour roles: accent ${c.accent} (the one thing that matters) · accent2 ${c.accent2} (markers, highlights)${c.positive ? ` · positive ${c.positive}` : ""}${c.negative ? ` · negative ${c.negative}` : ""}.`,
    `Type: display ${spec(s.fonts.display)}, text ${spec(s.fonts.text)}, labels ${spec(s.fonts.mono)}${s.fonts.accent ? `, accent ${spec(s.fonts.accent)}` : ""}${s.fontsNamed?.length ? ` (the brand names ${s.fontsNamed.join(", ")} — these are the nearest bundled faces)` : ""}. ${CASE_WORDS[s.case]}.`,
    `Shape: corners ${s.radius} px at 1080 wide; ${SURFACE_WORDS[s.surface]}; ${TEXTURE_WORDS[s.texture]}. Motion: ${s.motion} — ${MOTION_WORDS[s.motion]}.`,
  ];
  if (s.rules.length) lines.push(`Rules: ${s.rules.map((r) => r.replace(/\s+/g, " ")).join(" · ")}`);
  if (opts.full && s.body.trim()) {
    const prose = s.body.replace(/```[\s\S]*?```/g, "").replace(/\n{3,}/g, "\n\n").trim();
    lines.push("", "From the brand's DESIGN.md:", prose.length > STYLE_LIMITS.briefBody ? `${prose.slice(0, STYLE_LIMITS.briefBody)}…` : prose);
  }
  return lines.join("\n");
}

/** A one-line catalogue entry ("ember — Dark editorial with an orange signal colour"). */
export function styleCatalogLine(s: Pick<BrandStyle, "name" | "description" | "mode" | "colors">): string {
  return `${s.name} — ${s.description || s.mode} (${s.mode}, accent ${s.colors.accent})`;
}

export function toStylePayload(s: BrandStyle): StylePayload {
  const { path: _path, ...rest } = s;
  return { ...rest, body: rest.body.slice(0, STYLE_LIMITS.body) };
}

// ---------------------------------------------------------------------------------------------
// Built-in styles
// ---------------------------------------------------------------------------------------------

const BUILTIN_STYLE_EMBER_COLORS: BrandColors = { accent: "#FF6A3D", accent2: "#FFE14D", ink: "#0D0D11", paper: "#F6F1E7", surface: "#17171E", positive: "#34D27B", negative: "#FF4A3D" };

const BUILTIN_STYLE_SOURCES: Array<Omit<BrandStyle, "source" | "body"> & { body?: string }> = [
  {
    name: "ember",
    title: "Ember",
    description: "Dark creator-explainer: ink grounds, an orange signal colour, a yellow marker, punchy springs",
    mode: "dark",
    colors: BUILTIN_STYLE_EMBER_COLORS,
    fonts: { display: "Inter:900", text: "Inter:700", mono: "Space Mono:700", accent: "Playfair Display:700i" },
    case: "upper",
    motion: "punchy",
    surface: "soft",
    texture: "grid",
    radius: 28,
    rules: ["Orange marks the one thing that matters in a frame — never more than one orange hero", "Yellow is only a marker swiped under a key word", "Every element lands on the word that says it", "Mono labels are small, tracked out 0.12–0.2 em"],
  },
  {
    name: "cream",
    title: "Cream Flat",
    description: "Friendly and flat: a cream ground, ink type, orange only as small marks, lavender and butter-yellow tiles",
    mode: "light",
    colors: { accent: "#FF512F", accent2: "#C5C5FE", ink: "#1A1A1A", paper: "#FCF5EA", surface: "#FFFFFF", positive: "#1F7A4D", negative: "#D93A2B" },
    fonts: { display: "Inter:700", text: "Inter:500", mono: "Space Mono:400" },
    fontsNamed: ["Geist"],
    case: "sentence",
    motion: "bouncy",
    surface: "soft",
    texture: "none",
    radius: 44,
    rules: ["Sentence case everywhere; never uppercase headlines", "Text is ink — never orange text", "Orange only as small marks: dots, meters, rings, chart series", "White cards with soft layered shadows on the cream ground", "Lavender #C5C5FE and butter #FEEE98 as tile and chip fills", "No emoji; line icons at 2 px"],
  },
  {
    name: "mono",
    title: "Editorial Mono",
    description: "Magazine-calm: near-black and bone, one red, a serif italic accent word, film grain",
    mode: "dark",
    colors: { accent: "#E23B2E", accent2: "#D9C9A3", ink: "#0B0B0C", paper: "#F2F0EB", surface: "#161617", negative: "#E23B2E", positive: "#7FB685" },
    fonts: { display: "Inter:800", text: "Inter:500", mono: "Space Mono:400", accent: "Playfair Display:400i" },
    case: "sentence",
    motion: "smooth",
    surface: "flat",
    texture: "grain",
    radius: 6,
    rules: ["One red element per frame at most", "Pair a heavy sans line with one Playfair italic word", "Thin 2 px rules and generous margins; nothing crowded", "Fades and slow slides — no bounces"],
  },
  {
    name: "neon",
    title: "Neon Night",
    description: "Tech-forward: deep night grounds, violet and mint glows, glass panels, crisp grotesk type",
    mode: "dark",
    colors: { accent: "#8B5CF6", accent2: "#2EE6B6", ink: "#07070C", paper: "#F4F3FF", surface: "#14121F", positive: "#2EE6B6", negative: "#FF4D6D" },
    fonts: { display: "Space Grotesk:700", text: "Inter:600", mono: "Space Mono:700" },
    case: "upper",
    motion: "snappy",
    surface: "glass",
    texture: "glow",
    radius: 22,
    rules: ["Glow only on the accent element", "Glass panels: 60 % surface with a 1.5 px light border", "Data in mono, tracked out", "Lines draw on; numbers count up"],
  },
  {
    name: "pop",
    title: "Bold Pop",
    description: "Loud and playful: butter ground, hot pink and yellow, condensed caps, thick ink outlines with hard shadows",
    mode: "light",
    colors: { accent: "#FF3D7F", accent2: "#FFD400", ink: "#111111", paper: "#FFF8E7", surface: "#FFFFFF", positive: "#00B37E", negative: "#FF3B30" },
    fonts: { display: "Anton:400", text: "Poppins:700", mono: "Space Mono:700" },
    case: "upper",
    motion: "bouncy",
    surface: "bold",
    texture: "none",
    radius: 18,
    rules: ["Every card has a 4 px ink outline and a hard 10 px offset shadow", "Headlines in Anton caps, big", "Stickers tilt −4° to 6°", "Pink is the hero; yellow fills behind words"],
  },
  {
    name: "studio",
    title: "Clean Studio",
    description: "Calm and credible: light grey ground, slate ink, one confident blue, teal for data",
    mode: "light",
    colors: { accent: "#2563EB", accent2: "#14B8A6", ink: "#0F172A", paper: "#F7F8FA", surface: "#FFFFFF", positive: "#16A34A", negative: "#DC2626" },
    fonts: { display: "Inter:800", text: "Inter:500", mono: "Space Mono:400" },
    case: "sentence",
    motion: "smooth",
    surface: "soft",
    texture: "none",
    radius: 20,
    rules: ["Blue for the single call to action or key figure", "Charts in blue and teal; labels in slate", "Generous white space, left-aligned", "Eased slides and fades; small, precise motion"],
  },
  {
    name: "whiteboard",
    title: "Whiteboard",
    description: "Whiteboard explainer: black marker on a white board, red for the key point, blue for arrows — everything draws itself on",
    mode: "light",
    colors: { accent: "#E03131", accent2: "#1C7ED6", ink: "#1E1E24", paper: "#FBFBF8", surface: "#FFFFFF", positive: "#2F9E44", negative: "#E03131" },
    fonts: { display: "Permanent Marker:400", text: "Patrick Hand:400", mono: "Space Mono:400" },
    case: "sentence",
    motion: "smooth",
    surface: "sketch",
    texture: "board",
    radius: 12,
    rules: ["Everything draws itself on with the marker leading — $.ink for lines, boxes and arrows, $.write for words", "Black marker for words, red only for the one key point, blue for arrows and labels", "No fills except quick hatching or a highlighter swipe", "One idea per board; draw in the order the voice explains it"],
  },
  {
    name: "sketch",
    title: "Sketchbook",
    description: "Hand-drawn sketchbook: graphite lines that boil, handwritten notes, coral doodles and a yellow highlighter on warm paper",
    mode: "light",
    colors: { accent: "#F06548", accent2: "#FFD84D", ink: "#2B2B30", paper: "#F7F1E3", surface: "#FFFDF7", positive: "#3A9D5D", negative: "#D9480F" },
    fonts: { display: "Caveat:700", text: "Patrick Hand:400", mono: "Space Mono:400" },
    case: "sentence",
    motion: "bouncy",
    surface: "sketch",
    texture: "paper",
    radius: 16,
    rules: ["Lines boil — re-draw the wobble 8 times a second ($.boil or hand shapes with boil: t)", "Hatching and highlighter swipes instead of gradients", "Doodled arrows and circles point at the key word", "Handwritten labels, tilted a few degrees"],
  },
  {
    name: "pastel",
    title: "Pastel Flat",
    description: "Flat 2D explainer: soft pastel shapes, deep indigo ink, rounded type, pop-in squash and stretch",
    mode: "light",
    colors: { accent: "#FF7A8A", accent2: "#7FD1C1", ink: "#2D2A4A", paper: "#FDF6EE", surface: "#FFFFFF", positive: "#5CB88A", negative: "#F2545B" },
    fonts: { display: "Fredoka:700", text: "Fredoka:600", mono: "Space Mono:400" },
    case: "sentence",
    motion: "bouncy",
    surface: "flat",
    texture: "none",
    radius: 32,
    rules: ["Flat shapes, no outlines, no gradients — depth from overlapping pastel tones", "Build objects and characters from circles and rounded rectangles", "Things pop in with squash and stretch and settle", "Four pastel tones a frame at most, plus indigo ink for type"],
  },
  {
    name: "pixel",
    title: "Pixel Arcade",
    description: "8-bit pixel art: night-purple grounds, hot pink and cyan, chunky pixel type, stepped boxes, animation on twelves",
    mode: "dark",
    colors: { accent: "#FF3864", accent2: "#2DE2E6", ink: "#0F0E17", paper: "#FFFFFE", surface: "#261447", positive: "#F9C80E", negative: "#FF3864" },
    fonts: { display: "Press Start 2P:400", text: "Space Mono:700", mono: "Press Start 2P:400" },
    case: "upper",
    motion: "snappy",
    surface: "pixel",
    texture: "pixel",
    radius: 0,
    rules: ["Animate on twelves: step time with $.step(t, 12) so motion jumps frame to frame", "Pixel sprites ($.sprite) for icons — hearts, coins, stars — never smooth vector icons", "Press Start 2P only for short headings (it is wide); body lines in Space Mono", "Hard pixel shadows, no blur, no gradients"],
  },
  {
    name: "collage",
    title: "Paper Collage",
    description: "Cut-paper collage: torn pieces with white borders and tape, halftone, ransom-note letters, stop-motion jumps",
    mode: "light",
    colors: { accent: "#E4572E", accent2: "#F3A712", ink: "#1D1A16", paper: "#EFE6D8", surface: "#FFFFFF", positive: "#4C956C", negative: "#C0392B" },
    fonts: { display: "Anton:400", text: "Inter:600", mono: "Space Mono:700", accent: "Playfair Display:900i" },
    case: "upper",
    motion: "punchy",
    surface: "paper",
    texture: "paper",
    radius: 0,
    rules: ["Everything is a cut-out ($.cutout): torn or scissor edges, a white margin, a soft shadow", "Tape strips hold pieces down; tilt each piece −6° to 6°", "Stop-motion: pieces jump in on twelves with a little jitter, never glide", "Mix type — Anton caps, ransom-note letters ($.ransom), one Playfair italic word"],
  },
  {
    name: "diorama",
    title: "Paper Diorama",
    description: "Layered paper diorama: stacked cut-paper landscapes with deep shadows and a slow parallax camera",
    mode: "light",
    colors: { accent: "#E76F51", accent2: "#2A9D8F", ink: "#2A2420", paper: "#F4EDE1", surface: "#FFFBF2", positive: "#6A994E", negative: "#BC4749" },
    fonts: { display: "Outfit:900", text: "Outfit:700", mono: "Space Mono:400" },
    case: "sentence",
    motion: "smooth",
    surface: "paper",
    texture: "studio",
    radius: 24,
    rules: ["Build depth from 3–5 paper layers ($.ridge), lighter toward the back, each casting a soft shadow on the one behind", "The camera drifts ($.drift + $.parallax): back layers move less than front ones", "Edges are cut by hand — slightly wavy, never perfect", "Light from the top left; shadows fall down and right"],
  },
  {
    name: "clay",
    title: "Claymation",
    description: "Clay stop-motion: chunky rounded forms with a soft sheen on a studio backdrop, squash on landing, a wobble on twelves",
    mode: "light",
    colors: { accent: "#FF6B4A", accent2: "#4DA3FF", ink: "#2B2622", paper: "#F3EEE8", surface: "#FFFFFF", positive: "#5DBB63", negative: "#E5484D" },
    fonts: { display: "Fredoka:700", text: "Fredoka:600", mono: "Space Mono:400" },
    case: "sentence",
    motion: "bouncy",
    surface: "clay",
    texture: "studio",
    radius: 48,
    rules: ["Wrap shapes and type in $.clay so they read as modelled clay with a contact shadow", "Squash on landing; boil the clay on twelves ($.clay boil) like stop motion", "Saturated but soft colours, no outlines, no thin lines", "For clay characters and sets, generate a clip with the clay recipe and set the type over it"],
  },
  {
    name: "storybook",
    title: "Storybook",
    description: "Illustrated storybook: watercolour washes on parchment, sepia ink frames, an old-style serif, calm page-turn pacing",
    mode: "light",
    colors: { accent: "#B23A48", accent2: "#D4A73A", ink: "#2E2418", paper: "#F5ECD7", surface: "#FBF5E6", positive: "#5B8E55", negative: "#9E2A2B" },
    fonts: { display: "IM Fell English:400", text: "IM Fell English:400", mono: "Space Mono:400", accent: "IM Fell English:400i" },
    case: "title",
    motion: "calm",
    surface: "paper",
    texture: "parchment",
    radius: 8,
    rules: ["Colour arrives as watercolour washes ($.wash) that bleed in, under sepia ink lines", "Frame scenes and quotes with an ink frame ($.inkFrame) that draws itself on", "Calm: slow fades and drifts, never bounces", "For painted characters and scenes, generate stills with the storybook recipe and frame them"],
  },
];

/** The explainer art styles (whiteboard … storybook): each has an example program and its own runtime helpers. */
export const EXPLAINER_STYLE_NAMES = ["whiteboard", "sketch", "pastel", "pixel", "collage", "diorama", "clay", "storybook"] as const;

export const BUILTIN_STYLES: readonly BrandStyle[] = BUILTIN_STYLE_SOURCES.map((s) => ({ ...s, body: s.body ?? defaultStyleBody(s), source: "builtin" as const }));

/** User styles over built-ins by name. */
export function mergeStyles(builtin: readonly BrandStyle[], user: readonly BrandStyle[]): BrandStyle[] {
  const byName = new Map<string, BrandStyle>();
  for (const s of builtin) byName.set(s.name, s);
  for (const s of user) byName.set(s.name, s);
  return [...byName.values()];
}

export function findStyle(name: string | null | undefined, styles: readonly BrandStyle[] = BUILTIN_STYLES): BrandStyle | null {
  if (!name) return null;
  const k = slugifyStyleName(name);
  return styles.find((s) => s.name === k) ?? null;
}

/** The built-in catalogue for the system prompt (static, so it caches). */
export function builtinStylesPromptBlock(): string {
  return BUILTIN_STYLES.map((s) => `- ${styleCatalogLine(s)}`).join("\n");
}

/** A style payload from a client, validated: tokens through normalizeProgramStyle, text capped. Null when unusable. */
export function normalizeStylePayload(v: unknown): StylePayload | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const name = slugifyStyleName(String(o.name ?? ""));
  if (!name || !STYLE_NAME_RE.test(name)) return null;
  const tokens = normalizeProgramStyle({ ...o, name });
  if (!tokens) return null;
  const text = (x: unknown, max: number) => (typeof x === "string" ? x.slice(0, max) : "");
  return {
    name,
    title: text(o.title, STYLE_LIMITS.title) || name,
    description: text(o.description, STYLE_LIMITS.description),
    mode: tokens.mode,
    colors: tokens.colors,
    fonts: tokens.fonts,
    ...(Array.isArray(o.fontsNamed) ? { fontsNamed: o.fontsNamed.filter((f): f is string => typeof f === "string").slice(0, 6).map((f) => f.slice(0, 40)) } : {}),
    case: tokens.case,
    motion: tokens.motion,
    surface: tokens.surface,
    texture: tokens.texture,
    radius: tokens.radius,
    rules: Array.isArray(o.rules) ? o.rules.filter((r): r is string => typeof r === "string").slice(0, STYLE_LIMITS.rules).map((r) => r.slice(0, STYLE_LIMITS.rule)) : [],
    body: text(o.body, STYLE_LIMITS.body),
    source: o.source === "builtin" ? "builtin" : "user",
  };
}
