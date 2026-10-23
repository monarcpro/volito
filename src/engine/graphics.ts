// Synced from MONARC core (packages/core/src/graphics.ts) by scripts/sync-engine.mjs. Change it there and sync.
/** Plain aliases for the editor's id and time types. */
type ID = string;
type Seconds = number;
import { MG_ICON_NAMES, MG_RUNTIME, MG_SPRITE_NAMES } from "./graphics-runtime.js";
import { GRAPHIC_FONTS, type FontSpec, fontSpecKey, parseFontSpec } from "./graphic-fonts.js";
import { type ProgramStyle, normalizeProgramStyle, styleFonts } from "./styles.js";

export { GRAPHIC_FONTS, type FontSpec, fontSpecKey, parseFontSpec };

/**
 * Motion graphics as programs. A graphic on the timeline can be code instead of a
 * template: `function frame(t, $)` returning the SVG of one frame, a pure function of the
 * clip's time — the way the video engines MONARC learned from draw a film (`seek(t)`
 * builds any frame from scratch). The designer model writes the program for one shot
 * (what is said over it, the words' times, the region it owns, the media it may show);
 * the desktop runs it in a sandboxed worker and draws each frame through the same
 * renderer in the player, the export and on the phone.
 *
 * Programs live on title clips (`title.program`), so the layer stack, transitions,
 * keyframes, trims and the title bake work for them unchanged.
 */

export interface GraphicWord {
  w: string;
  /** Start, clip seconds. */
  s: Seconds;
  /** End, clip seconds. */
  e: Seconds;
}

/** A box in the program's canvas, px. */
export interface GraphicBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A hole the renderer keeps clear in every frame so footage below shows through (a face bubble). */
export interface GraphicWindow extends GraphicBox {
  kind: "circle" | "rect";
  /** Corner radius for a rect window, px. */
  r?: number;
  /** A ring drawn round the hole. */
  ring?: { color: string; width: number };
}

export interface TitleProgram {
  version: 1;
  /** Plain JavaScript defining `function frame(t, $)` (and optionally `function setup($)`). */
  code: string;
  /** The canvas the code draws on, px — the project's frame size when it was written. */
  width: number;
  height: number;
  /** Faces the code uses, "Family:weight" with an "i" for italic ("Inter:800", "Playfair Display:400i"). */
  fonts: string[];
  /** The words spoken over the clip, in clip seconds — what `$.at(word)` reads. */
  words?: GraphicWord[];
  /** Named moments, clip seconds — `$.beat(name)`. */
  beats?: Record<string, number>;
  /** Free data the code reads as `$.data` (numbers, labels). */
  data?: Record<string, unknown>;
  /** Colours, the accent first — `$.palette` / `$.c`. */
  palette?: string[];
  /** Asset ids of pictures the code shows with `$.image(id, …)`. */
  media?: ID[];
  /** The part of the canvas the graphic owns (a split's top panel); drawing outside it is clipped. */
  region?: GraphicBox;
  /** A hole kept clear for the footage below. */
  window?: GraphicWindow;
  /** The picture no longer changes after this many seconds (the export holds the last frame). */
  holdAfter?: Seconds;
  /** What it shows, one or two lines — the inspector and the agent read it. */
  brief?: string;
  /** Which model (or person) wrote the code. */
  author?: string;
  /** The layout or placement it was designed for (face, split, broll, card, cutaway, overlay, panel, full, bubble) — a repair keeps its rules. */
  layout?: string;
  /** The brand style's tokens: the runtime's colours, faces, radius, surfaces and spring feel follow them. */
  style?: ProgramStyle;
}

export const PROGRAM_LIMITS = { code: 60_000, fonts: 10, words: 600, beats: 40, media: 8, brief: 600, data: 20_000 } as const;

/** Strip what a model wraps code in (fences, module syntax a classic worker script cannot run). */
export function normalizeProgramCode(code: string): string {
  let s = String(code ?? "").trim();
  const fence = /^```[a-zA-Z]*\s*\n([\s\S]*?)\n```\s*$/.exec(s);
  if (fence) s = fence[1]!;
  s = s.replace(/^\s*export\s+default\s+function\s+frame\b/m, "function frame");
  s = s.replace(/^\s*export\s+(function|const|let|var|async\s+function)\b/gm, "$1");
  s = s.replace(/^\s*export\s+default\s+/gm, "const __default = ");
  s = s.replace(/^\s*import\s[^\n]*\n/gm, "");
  return s.trim();
}

const FORBIDDEN = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "importScripts",
  "eval",
  "Function",
  "require",
  "import",
  "postMessage",
  "globalThis",
  "self",
  "window",
  "document",
  "navigator",
  "location",
  "indexedDB",
  "caches",
  "Worker",
  "setTimeout",
  "setInterval",
  "requestAnimationFrame",
] as const;

/** The code with string literals, template text and comments blanked (template ${…} kept), so a scan sees only code. */
export function codeOnly(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  const stack: Array<"tpl"> = [];
  let braceDepth: number[] = [];
  while (i < n) {
    const ch = src[i]!;
    const next = src[i + 1];
    if (ch === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      out += " ";
      continue;
    }
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      while (i < n && src[i] !== q && src[i] !== "\n") i += src[i] === "\\" ? 2 : 1;
      i++;
      out += '""';
      continue;
    }
    if (ch === "`" || (ch === "}" && stack.length && braceDepth[braceDepth.length - 1] === 0)) {
      // Template text until ` or ${.
      if (ch === "}") {
        stack.pop();
        braceDepth.pop();
      }
      i++;
      while (i < n && src[i] !== "`" && !(src[i] === "$" && src[i + 1] === "{")) i += src[i] === "\\" ? 2 : 1;
      if (src[i] === "$") {
        stack.push("tpl");
        braceDepth.push(0);
        i += 2;
        out += " ";
      } else {
        i++;
        out += '""';
      }
      continue;
    }
    if (stack.length) {
      if (ch === "{") braceDepth[braceDepth.length - 1]!++;
      else if (ch === "}") braceDepth[braceDepth.length - 1]!--;
    }
    out += ch;
    i++;
  }
  braceDepth = [];
  return out;
}

/**
 * What is wrong with a program before it runs: no frame function, too long, or a name the
 * sandbox does not have (network, timers, the page). The sandbox blocks these anyway;
 * this tells the designer early, in words it can act on.
 */
export function programProblems(code: string): string[] {
  const out: string[] = [];
  const src = normalizeProgramCode(code);
  if (!src) return ["The program is empty."];
  if (src.length > PROGRAM_LIMITS.code) out.push(`The program is ${src.length} characters — keep it under ${PROGRAM_LIMITS.code}.`);
  const bare = codeOnly(src);
  if (!/\bfunction\s+frame\s*\(/.test(bare) && !/\b(const|let|var)\s+frame\s*=/.test(bare)) out.push("Define `function frame(t, $)` returning the frame's SVG markup.");
  const used = new Set<string>();
  for (const name of FORBIDDEN) if (new RegExp(`(^|[^.\\w$])${name}\\b`).test(bare)) used.add(name);
  if (used.size) out.push(`Not available in a graphic: ${[...used].join(", ")}. A frame is a pure function of t — no network, timers, page or module APIs.`);
  if (/\bMath\.random\s*\(/.test(bare)) out.push("Math.random makes frames differ between renders — use $.hash(n) for fixed randomness.");
  if (/\bDate\b/.test(bare)) out.push("Date is not available — time is the frame's t.");
  return out;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const box = (b: unknown, w: number, h: number): GraphicBox | undefined => {
  const o = b as Partial<GraphicBox> | null;
  if (!o || !finite(o.x) || !finite(o.y) || !finite(o.w) || !finite(o.h) || o.w <= 0 || o.h <= 0) return undefined;
  const x = Math.max(0, Math.min(w, o.x));
  const y = Math.max(0, Math.min(h, o.y));
  return { x: r3(x), y: r3(y), w: r3(Math.min(w - x, o.w)), h: r3(Math.min(h - y, o.h)) };
};

/** A complete, bounded program from a partial one (the designer's, the agent's, an older file's). */
export function normalizeProgram(p: Partial<TitleProgram> | null | undefined, frame?: { width: number; height: number }): TitleProgram | undefined {
  if (!p || typeof p.code !== "string" || !p.code.trim()) return undefined;
  const width = finite(p.width) && p.width >= 16 ? Math.round(Math.min(8192, p.width)) : (frame?.width ?? 1080);
  const height = finite(p.height) && p.height >= 16 ? Math.round(Math.min(8192, p.height)) : (frame?.height ?? 1920);
  const style = normalizeProgramStyle(p.style);
  // The style's faces are the runtime's defaults, so they are embedded whether the code names them or not.
  const fonts = [...new Set([...(Array.isArray(p.fonts) ? p.fonts : ["Inter:700", "Inter:900"]), ...(style ? styleFonts(style) : [])].map((f) => fontSpecKey(parseFontSpec(String(f)))))].slice(0, PROGRAM_LIMITS.fonts);
  const words = Array.isArray(p.words)
    ? p.words
        .filter((w): w is GraphicWord => !!w && typeof w.w === "string" && finite(w.s) && finite(w.e))
        .slice(0, PROGRAM_LIMITS.words)
        .map((w) => ({ w: w.w.slice(0, 60), s: r3(w.s), e: r3(Math.max(w.s, w.e)) }))
    : undefined;
  const beats = p.beats && typeof p.beats === "object" ? Object.fromEntries(Object.entries(p.beats).filter(([k, v]) => k.length <= 40 && finite(v)).slice(0, PROGRAM_LIMITS.beats).map(([k, v]) => [k, r3(v as number)])) : undefined;
  let data: Record<string, unknown> | undefined;
  if (p.data && typeof p.data === "object" && !Array.isArray(p.data)) {
    try {
      const json = JSON.stringify(p.data);
      if (json.length <= PROGRAM_LIMITS.data) data = JSON.parse(json) as Record<string, unknown>;
    } catch {
      data = undefined;
    }
  }
  const palette = Array.isArray(p.palette) ? p.palette.filter((c) => typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c)).slice(0, 8) : undefined;
  const media = Array.isArray(p.media) ? [...new Set(p.media.filter((m) => typeof m === "string" && m.length < 80))].slice(0, PROGRAM_LIMITS.media) : undefined;
  const region = box(p.region, width, height);
  const wb = box(p.window, width, height);
  const window: GraphicWindow | undefined = wb
    ? {
        kind: p.window?.kind === "rect" ? "rect" : "circle",
        ...wb,
        ...(finite(p.window?.r) ? { r: r3(Math.max(0, p.window!.r!)) } : {}),
        ...(p.window?.ring && typeof p.window.ring.color === "string" && finite(p.window.ring.width) ? { ring: { color: p.window.ring.color, width: r3(Math.max(0, Math.min(40, p.window.ring.width))) } } : {}),
      }
    : undefined;
  return {
    version: 1,
    code: normalizeProgramCode(p.code).slice(0, PROGRAM_LIMITS.code),
    width,
    height,
    fonts,
    ...(words?.length ? { words } : {}),
    ...(beats && Object.keys(beats).length ? { beats } : {}),
    ...(data && Object.keys(data).length ? { data } : {}),
    ...(palette?.length ? { palette } : {}),
    ...(media?.length ? { media } : {}),
    ...(region ? { region } : {}),
    ...(window ? { window } : {}),
    ...(finite(p.holdAfter) && p.holdAfter >= 0 ? { holdAfter: r3(p.holdAfter) } : {}),
    ...(typeof p.brief === "string" && p.brief.trim() ? { brief: p.brief.trim().slice(0, PROGRAM_LIMITS.brief) } : {}),
    ...(typeof p.author === "string" && p.author.trim() ? { author: p.author.trim().slice(0, 80) } : {}),
    ...(typeof p.layout === "string" && /^[a-z]{2,16}$/.test(p.layout) ? { layout: p.layout } : {}),
    ...(style ? { style } : {}),
  };
}

/** A short stable hash of a program's code and inputs — the worker pool and the frame cache key on it. */
export function programHash(p: TitleProgram): string {
  const s = JSON.stringify([p.code, p.width, p.height, p.fonts, p.words, p.beats, p.data, p.palette, p.style, p.media, p.region, p.window]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** The picture changes at clip time t (a program moves until holdAfter). */
export const programIsMovingAt = (p: TitleProgram, t: Seconds): boolean => p.holdAfter === undefined || t < p.holdAfter - 1e-6;

// ---------------------------------------------------------------------------------------------
// The sandbox the desktop runs a program in
// ---------------------------------------------------------------------------------------------

/** Names the program sees as undefined (shadowed parameters of the function its code runs in). */
const SHADOWED = ["self", "globalThis", "window", "document", "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "postMessage", "Worker", "SharedWorker", "indexedDB", "caches", "navigator", "location", "setTimeout", "setInterval", "requestAnimationFrame", "Date", "performance", "Function", "close", "onmessage"];

/**
 * The full source of the worker that runs one program: a prelude that takes the network
 * and storage away, the runtime, the program inside a function whose parameters shadow
 * every outside name it could reach, and the message loop. Runs as a blob worker, so the
 * app's CSP still forbids eval inside it. `codeLine` is the line the program's first line
 * lands on (to map error lines back).
 */
export function programWorkerSource(code: string): { source: string; codeLine: number } {
  const prelude = [
    '"use strict";',
    "const __post = self.postMessage.bind(self);",
    "(() => {",
    "  for (const k of ['fetch','XMLHttpRequest','WebSocket','EventSource','importScripts','indexedDB','caches','Worker','SharedWorker','BroadcastChannel','Notification','WebTransport']) {",
    "    let o = self;",
    "    while (o) { try { if (Object.prototype.hasOwnProperty.call(o, k)) delete o[k]; } catch (e) {} o = Object.getPrototypeOf(o); }",
    "    try { Object.defineProperty(self, k, { value: undefined, configurable: false, writable: false }); } catch (e) {}",
    "  }",
    "})();",
    "let __seed = 1;",
    "Math.random = () => { __seed = (__seed * 16807) % 2147483647; return (__seed - 1) / 2147483646; };",
    MG_RUNTIME,
    `const __program = (function (${SHADOWED.join(", ")}) {`,
    '"use strict";',
  ].join("\n");
  const codeLine = prelude.split("\n").length + 1;
  const epilogue = [
    "",
    "return { frame: typeof frame === 'function' ? frame : null, setup: typeof setup === 'function' ? setup : null };",
    "})();",
    "let __env = null;",
    "let __state = undefined;",
    "async function __loadFonts(list) {",
    "  if (!list || !list.length || typeof FontFace === 'undefined' || !self.fonts) return;",
    "  await Promise.all(list.map(async (f) => { try { const ff = new FontFace(f.family, 'url(' + f.url + ')', { weight: String(f.weight), style: f.italic ? 'italic' : 'normal' }); await ff.load(); self.fonts.add(ff); } catch (e) {} }));",
    "}",
    "const __line = (err) => { const m = /:(\\d+):\\d+\\)?\\s*$/m.exec(String(err && err.stack || '')); return m ? Number(m[1]) : null; };",
    "self.onmessage = async (e) => {",
    "  const m = e.data || {};",
    "  if (m.type === 'init') {",
    "    await __loadFonts(m.fonts);",
    "    __env = m.env;",
    "    if (!__program.frame) { __post({ type: 'ready', error: 'The program defines no frame(t, $) function.' }); return; }",
    "    try { if (__program.setup) { __seed = 7; __state = __program.setup(MG.make(__env, 0)); } __post({ type: 'ready' }); }",
    "    catch (err) { __post({ type: 'ready', error: 'setup: ' + String(err && err.message || err), line: __line(err) }); }",
    "    return;",
    "  }",
    "  if (m.type === 'frame') {",
    "    const t = Number(m.t) || 0;",
    "    __seed = (Math.floor(t * 1000) % 2147483646) + 1;",
    "    const $ = MG.make(__env, t);",
    "    $.state = __state;",
    "    try {",
    "      const body = __program.frame(t, $);",
    "      __post({ type: 'frame', id: m.id, svg: $._post(body == null ? '' : String(body)), defs: $._defs(), warnings: $._warnings() });",
    "    } catch (err) {",
    "      __post({ type: 'frame', id: m.id, error: String(err && err.message || err), line: __line(err), warnings: $._warnings() });",
    "    }",
    "  }",
    // The sound trace: every frame run (nothing drawn kept), the runtime's marks counted per start.
    "  if (m.type === 'trace') {",
    "    const fps = Number(m.fps) || 30;",
    "    const dur = Math.max(0, Number(__env && __env.duration) || 0);",
    "    const n = Math.min(Math.ceil(dur * fps) + 1, 6000);",
    "    const counts = new Map();",
    "    let error = null, line = null;",
    "    MG.trace(true);",
    "    for (let i = 0; i < n; i++) {",
    "      const t = i / fps;",
    "      __seed = (Math.floor(t * 1000) % 2147483646) + 1;",
    "      const $ = MG.make(__env, t);",
    "      $.state = __state;",
    "      try { __program.frame(t, $); } catch (err) { error = String(err && err.message || err); line = __line(err); break; }",
    "      for (const k of MG.traced()) { const key = k[0] + '|' + Math.round(k[1] * 1000); const c = counts.get(key); if (c) c[4]++; else counts.set(key, [k[0], k[1], k[2], k[3], 1]); }",
    "    }",
    "    MG.trace(false);",
    "    __post({ type: 'trace', id: m.id, marks: Array.from(counts.values()).slice(0, 4000), frames: n, error, line });",
    "  }",
    "};",
  ].join("\n");
  return { source: `${prelude}\n${normalizeProgramCode(code)}\n${epilogue}`, codeLine };
}

/** What the program needs from the runner besides its code: the `$` environment. */
export interface ProgramEnv {
  width: number;
  height: number;
  duration: Seconds;
  fps: number;
  words: GraphicWord[];
  beats: Record<string, number>;
  data: Record<string, unknown>;
  palette?: string[];
  style?: ProgramStyle;
  region?: GraphicBox;
  window?: GraphicWindow | null;
  /** Asset id → data URL. */
  media: Record<string, string>;
}

export function programEnv(p: TitleProgram, duration: Seconds, fps: number, media: Record<string, string> = {}): ProgramEnv {
  return {
    width: p.width,
    height: p.height,
    duration,
    fps,
    words: p.words ?? [],
    beats: p.beats ?? {},
    data: p.data ?? {},
    ...(p.palette ? { palette: p.palette } : {}),
    ...(p.style ? { style: p.style } : {}),
    ...(p.region ? { region: p.region } : {}),
    window: p.window ?? null,
    media,
  };
}

// ---------------------------------------------------------------------------------------------
// The reference the designer writes against
// ---------------------------------------------------------------------------------------------

export const MG_API_REFERENCE = `MONARC motion graphic programs
A program is plain JavaScript (no imports/exports, no network, no DOM, no timers, no Date, no Math.random) that defines
  function frame(t, $) { return "<svg markup for this frame, without the <svg> root>"; }
t = seconds since the graphic's clip starts. frame must be a PURE function of t: it rebuilds the whole picture from scratch every call (any frame can be drawn alone, in any order). Optional: function setup($) { return precomputed; } runs once; its return value is $.state.
Coordinates are canvas px: (0,0) top-left, $.W × $.H (e.g. 1080×1920 for 9:16). Draw only inside $.region {x,y,w,h} (the part you own — a split's top panel, else the whole canvas); outside it is clipped. When $.window {kind,x,y,w,h} is set, the renderer keeps that hole clear (the creator's face shows through it): draw a ring round it if you like, never content inside it. Everything you do not draw is transparent: footage shows through.

Timing (clip seconds):
  $.at("word", n=0, edge="s") → when the n-th occurrence of a spoken word (or "two words") starts ("e" = ends); NaN when it is not spoken. $.atOr("word", fallbackSeconds) never fails. Use the exact words from the list you are given. Land an element 0.04–0.12 s BEFORE its word.
  $.beat("name", fallback) → a named moment. $.words → [{w, s, e}]. $.dur → clip length.
  $.sync(["Rows of *display* words"], start=0) → rows of {text, at, hl} timed to the voice (for $.headline).
Motion kit (pure functions of time, from the reel engines):
  $.seg(t,a,b) 0→1 through [a,b] · $.E.{lin,out2,out3,out5,in2,in3,inOut2,inOut3,sine,outBack,outElastic}(p) · $.spring(dt,f=2.4,d=7) damped 0→1 (overshoots) · $.pop(t,t0,f=2.2,d=6.5) = spring from t0
  $.fadeIn(t,t0,dur=.3) · $.fadeOut(t,t1,dur=.3) · $.bump(t,t0,up=.07,down=.25) up-then-down 0→1→0 · $.wave(t,period,phase) 0↔1 loop · $.shake(t,t0,amp=18,dur=.45) → [dx,dy] · $.hash(n) fixed 0–1 noise
  $.lerp(a,b,p) · $.clamp(v,a=0,b=1) · $.typed(t,t0,text,cps=14) · $.count(n) "12.4K" · $.counter(t,a,b,n,{from,dec,prefix,suffix,short}) "1,000,000" counting up · $.fx(n) 2-decimal string · $.esc(text) (ALWAYS escape text you put in markup yourself)
Poses → attributes for a <g>: $.enter(t,t0,{dx=0,dy=40,s0=.9,rot=0,ox,oy,f,d}) springs in (f/d default to the brand's motion feel); $.life(t,a,b,{...enter, out=.25, exitDy=30}) enters at a and leaves by b. Pass ox,oy = the element's centre so scale/rotate pivot there. $.g(attrs, ...children) wraps any number of children. $.tf({x,y,s,sx,sy,r,ox,oy}) → transform string.
Shapes (return markup strings): $.rect(x,y,w,h,{r,fill,stroke,sw,op,shadow:"sm"|"md"|"lg"|"glow",transform}) · $.circle(cx,cy,r,{...}) · $.path(d,{stroke,sw,fill,draw:0–1 draws it on,op}) · $.line(x1,y1,x2,y2,{p:0–1,stroke,sw,dash}) · $.arrow(x1,y1,x2,y2,{p,color,sw}) · $.ring(cx,cy,r,p,{color,sw}) · $.gradient(["#a","#b"],{angle|radial:true}) → "url(#…)" fill · $.clip(x,y,w,h,r,inner) · $.def(markup) adds to <defs> · $.uid() unique id
Text (y is the TOP of the text, not the baseline; text wider than the frame is reported by MONARC's check — size big words to fit, a 1080-wide canvas holds ~9 characters at 200 px, ~14 at 130): $.text(str,{x,y,size=64,weight=700,family="Inter",fill,anchor:"start"|"middle"|"end",ls (em, e.g. -0.03),lh=1.12,maxW (wraps),upper,italic,op,stroke,sw,shadow}) · $.measure(str,{size,weight,family,ls}) → px width · $.wrap(str,maxW,font) → lines · $.textHeight(str,opts)
  $.headline(t, $.sync([...]), {x,y,size=84,weight=800,anchor:"middle",fill,marker:"#FFE14D",hlFill,ls,lh,out}) words pop in on their spoken times, *runs* get a marker swipe
  $.letters(t,t0,"WORD",{x,y,size=160,weight=900,stagger=.03,fill,anchor}) letters pop in one by one · $.typing(t,t0,str,{x,y,size,cps,caret})
  $.underline(t,at,x,y,w,{color=accent2,sw,dur=.4}) a brush stroke drawn on under a word (y = just below the text) · $.reveal(t,t0,x,y,w,h,{from:"left"|"right"|"top"|"bottom"|"center",dur=.5}, ...children) wipes children in through a growing mask
Blocks: $.panel(t,{fill,grid,glow:[x,y]|false,grain,box}) the brand's ground + texture for $.region · $.texture(t,{box,kind}) the brand's texture alone · $.scrim(x,y,w,h,{to:"bottom"|"top"|"left"|"right",a=.55}) a soft dark gradient under text that sits on footage · $.card(x,y,w,h,{r,fill,stroke,shadow,t}) a card in the brand's radius and surface (soft shadow, flat, glass, bold outline + hard shadow, sketch outline — pass t to boil it —, cut paper, clay or a pixel box) · $.chip(text,x,y,{size=28,fill,color,stroke,icon,dot,anchor,upper}) pill ($.chip.size(text,opts) → {w,h}) · $.meter(x,y,w,h,p,{bg,fill,glow}) · $.button(t,"Subscribe",x,y,{size,fill,icon:"bell",pressAt,done:"Subscribed",anchor}) a pill button that is pressed at pressAt (squash + ripple, then the done label) — pair it with $.cursor gliding onto it · $.bars(t,at,x,y,w,h,[values],{highlight:i,labels,valueLabels,stagger}) a bar chart growing from its baseline
  $.icon(name,x,y,size,{color,sw=2,fill}) top-left placed; names: ${MG_ICON_NAMES.join(", ")}
  $.stamp(t,at,"DEAD",cx,cy,{size=120,color,rot=-9}) slams down with a jolt · $.strike(t,at,x1,y1,x2,y2,{color,w=26}) · $.burst(t,t0,x,y,{n=14,r=220,colors,size,dur=.8,g}) particles · $.rays(t,cx,cy,{n,r0,r1,w,color,op,spin,p}) · $.flash(t,at,{color,a=.55}) · $.glow(t,x,y,{r,color,a}) · $.grid(x,y,w,h,{step}) · $.grain(t,{op=.07}) · $.cursor(x,y,{press,ripple}) · $.phone(x,y,w,innerSvgOn390x844,{screen}) ($.phone.size(w)) · $.image(assetId,x,y,w,h,{r,fit:"cover"|"contain"}) (only ids in your media list)
Art styles (explainers — whiteboard, sketch, pastel, pixel, collage, diorama, clay, storybook; each has its own built-in brand style, and the brand's surface/texture make $.card and $.panel match):
  Time: $.step(t,fps=12) holds time on whole frames (stop motion, pixel art: animate with q = $.step(t,12) instead of t) · $.jitter(t,amp,fps=12,seed) → [dx,dy,rot°] re-rolled each held frame · $.mix(hexA,hexB,p) a shade between two colours
  Hand-drawn (points, then ink them): $.hand.line(x1,y1,x2,y2,o) · .curve(x1,y1,x2,y2,{bend=.2}) · .rect(x,y,w,h) · .circle(cx,cy,rx,ry,{turns=1.1}) · .arrow(x1,y1,x2,y2,{bend=.12,head}) → 2 strokes · .hatch(x,y,w,h,{gap}) · .check(x,y,size) · .cross(cx,cy,size); every one takes {rough (px), seed, boil: t (re-wobbles 8×/s)}
  $.ink(t,at,shape,{color=fg,sw,dur|speed=1500px/s,pen:"marker"|"pencil",fill,op}) draws a $.hand shape on from at, the pen leading (at=null → already drawn; one hand: only the newest stroke's pen shows) · $.write(t,at,"text",{...text options,cps=16,pen}) handwriting written on line by line, the nib bobbing · $.boil(t,{amp,fps=8},...children) any drawing wobbles like hand-drawn animation · $.smooth(points,close) → path d
  Pixel: $.sprite(rows|name,x,y,cell,{colors}) — rows of characters (k ink, w white, a/A accent/dark, b/B accent2/dark, g green, r red, y yellow, o orange, s silver, f fg, p paper, l light, d shade, . clear) or a built-in: ${MG_SPRITE_NAMES.join(", ")}; $.sprite.size(rows|name,cell) → {w,h} · $.pixelBox(x,y,w,h,{cell,fill,stroke,shadow}) a stepped-corner box with a hard pixel shadow
  Paper: $.cutout(x,y,w,h,{fill,edge:"torn"|"cut"|"wavy"|"straight",shape:"rect"|"circle",border (white margin px),rot (deg, 0 = straight),tape:true|"corners",shadow},...children) a paper piece with children on it · $.tape(cx,cy,w,{rot,h,color}) · $.halftone(x,y,w,h,{step,r,color,angle}) newsprint dots · $.ransom(t,at,"TEXT\nROW TWO",x,y,{size,anchor,maxW (wraps),lh=1.3,stagger,fills}) ransom-note letters landing on twelves, in rows
  Diorama: $.ridge(x,yTop,w,h,{fill,hills,amp,seed}) a paper layer cut along its top, casting a soft shadow on the layer behind · $.drift(t,{dx,dy,zoom,a,b}) a slow camera → {x,y,zoom} · $.parallax(depth 0–1,cam,...children) far layers move less
  Clay: $.clay(t,{depth=7,lumps,shine,light,boil:true,shadow},...children) shapes and type modelled in clay (lumpy edge, lit bevel, sheen, thumbprints, contact shadow; boil re-settles it on twelves)
  Storybook: $.wash(x,y,w,h,{color,a=.6,shape:"blob"|"rect",p (0–1 bleeds in),seed}) a watercolour wash (blend multiply) · $.inkFrame(x,y,w,h,{draw (0–1),color,sw,inset,corner}) a ruled storybook frame with scooped corners · $.vignette({color,a,inner,box}) darker edges
Colours: $.c.bg is the ground and $.c.fg the text on it (they follow the brand's mode: dark → bg = ink, fg = paper; light → bg = paper, fg = ink) — use bg/fg, not ink/paper, so a light brand works. $.c.surface (cards), $.c.accent (the one thing that matters), $.c.accent2 (markers, highlights), $.c.tint (a soft accent wash), $.c.mute (secondary text), $.c.line (hairlines), $.c.green / $.c.red, $.c.ink (darkest) / $.c.paper (lightest). $.on(fillColour) → ink or paper, whichever reads on that fill. $.rgba(hex, a). $.data holds any data you were given.
Brand: $.style {name, mode, case, motion, surface, texture, radius (px at this canvas)}. $.font("display" | "text" | "mono" | "accent") → {family, weight, italic} — spread it into text options: $.text("Hi", {...$.font("display"), size: 120}). $.case(str) applies the brand's case. Text with no family uses the brand's text face; $.headline and $.letters default to its display face and case. $.k = min(W, H) / 1080 — multiply sizes by it so a design reads the same on 9:16 and 16:9.
Raw SVG is welcome anywhere (<g>, <path>, <polygon>, <text>, gradients, masks, filters, stroke-dasharray draw-ons, pathLength). When a brand style is given, use its faces (they are embedded for you) and its colour roles — never invent other colours. Fonts available: Inter 300–900, Space Grotesk 400–700, Space Mono 400/700, Poppins 300–900, Playfair Display 400/700/900 (+italic), Montserrat 300–900, Anton 400, Outfit 700/900, Gabarito 700/900, Caveat 400/700, Press Start 2P 400 (pixel), Permanent Marker 400 (marker), Patrick Hand 400 (hand lettering), Fredoka 400/600/700 (rounded), IM Fell English 400 (+italic, old-style book serif) — list the ones you use in "fonts".`;
