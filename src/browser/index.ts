/**
 * Volito in the browser: play any item (or your own program) live on a canvas — the same
 * sandboxed worker and SVG → image → canvas path MONARC PRO's player uses, so a web page
 * shows exactly what a render will be.
 *
 *   import { loadRegistry, findItem, createPlayer } from "volito/browser";
 *   const reg = await loadRegistry();
 *   const player = await createPlayer(canvas, findItem(reg, "essentials/lower-third"), { props: { name: "Priya" }, style: "ember" });
 *   player.play();
 *
 * Fonts and the registry load from `base` (the package's folder on jsDelivr by default); serve the
 * package's fonts/ and dist/registry.json yourself and pass their folder to keep it offline.
 */
import { MG_STD_DEFS, type ProgramEnv, type TitleProgram, parseFontSpec, programEnv, programWorkerSource } from "../engine.js";
import { type BuildOptions, type BuiltProgram, type MotionItem, type MotionPack, MotionError, buildProgram, customItem, glyphFaces, registerLibrary, resolveStyle } from "../pack.js";
import { TrueTypeFace, glyphFaceFile, glyphTable, setGlyphSource } from "../glyphs.js";
import { type Face, type FontPayload, facesFor, fontWants, wideCodepoints } from "./fonts.js";

declare const __MOTION_VERSION__: string;
declare const __MOTION_NAME__: string;

export { ASPECTS, ASPECT_NAMES, CATEGORIES, MotionError, buildProgram, customItem, describeItem, parseAspect, resolveProps, resolveStyle } from "../pack.js";
export type { Aspect, BuildOptions, ItemManifest, MotionItem, MotionPack, PropSpec } from "../pack.js";
export { BUILTIN_STYLES, MG_API_REFERENCE } from "../engine.js";
export { PATTERN_NAMES } from "../patterns.js";
export { type MotionConfig, type MotionInput, type MotionOverrides, type MotionSpec, DIRECTIONS, EASES, HITS, IDLES, MOODS, MOVES, MOVE_NOTES, ORDERS, ORIGINS, SPLITS, parseMotionArgs } from "../kit.js";

export const VERSION = __MOTION_VERSION__;
/** Where fonts/ and dist/registry.json are fetched from unless told otherwise. */
export const CDN_BASE = `https://cdn.jsdelivr.net/npm/${__MOTION_NAME__}@${__MOTION_VERSION__}/`;

export interface Registry {
  format: number;
  package: string;
  version: string;
  packs: MotionPack[];
  /** Libraries that ship as files ("world"): name → code. */
  libs?: Record<string, string>;
}

const registries = new Map<string, Promise<Registry>>();

/** Every pack's items and code (dist/registry.json under `base`). */
export function loadRegistry(base = CDN_BASE): Promise<Registry> {
  const url = new URL("dist/registry.json", base).href;
  let p = registries.get(url);
  if (!p) {
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new MotionError(`${url}: HTTP ${r.status}`);
      const reg = (await r.json()) as Registry;
      for (const [name, code] of Object.entries(reg.libs ?? {})) registerLibrary(name, code);
      return reg;
    });
    registries.set(url, p);
    p.catch(() => registries.delete(url));
  }
  return p;
}

/** An item from the registry by ref ("essentials/lower-third") or id. */
export function findItem(reg: Registry, name: string): MotionItem {
  const all = reg.packs.flatMap((p) => p.entries);
  const hit = all.find((i) => i.ref === name) ?? all.filter((i) => i.id === name)[0];
  if (!hit) throw new MotionError(`no item "${name}"`);
  return hit;
}

// ---------------------------------------------------------------------------------------------
// 3D text: glyph tables are read from the same font files the frames embed, before a build.
// ---------------------------------------------------------------------------------------------

const glyphTables = new Map<string, ReturnType<typeof glyphTable>>();
const glyphLoads = new Map<string, Promise<void>>();
setGlyphSource((key) => glyphTables.get(key));

/** Fetch and read the faces an item's 3D text needs (no-op for items without 3D). */
async function preloadGlyphs(item: MotionItem, opts: BuildOptions, base: string): Promise<void> {
  const faces = glyphFaces(item, resolveStyle(opts.style ?? item.style, opts.colors));
  await Promise.all(
    faces.map((face) => {
      const { key, file } = glyphFaceFile(face);
      if (glyphTables.has(key)) return Promise.resolve();
      const pending = glyphLoads.get(key);
      if (pending) return pending;
      const p: Promise<void> = fontBlob(new URL(`fonts/${file}`, base).href)
        .then((b) => b.arrayBuffer())
        .then((buf) => {
          glyphTables.set(key, glyphTable(new TrueTypeFace(new Uint8Array(buf)), key));
        })
        .catch(() => {
          // A face that cannot be fetched draws no 3D text; the build reports it.
          glyphLoads.delete(key);
        });
      glyphLoads.set(key, p);
      return p;
    }),
  );
}

// ---------------------------------------------------------------------------------------------
// Fonts. An SVG drawn as an image cannot reach the page's fonts, so each frame embeds the faces it
// draws with, and only those: every face of every family in every frame cost ~2 MB of base64 and
// most of the time a frame took. The worker measures text with the faces the program declares
// plus any its frames are seen drawing with. Each file is fetched once and shared.
// ---------------------------------------------------------------------------------------------

const faceLists = new Map<string, Promise<Face[]>>();
const fontBlobs = new Map<string, Promise<Blob>>();
const fontObjectUrls = new Map<string, Promise<string>>();
const fontDataUrls = new Map<string, Promise<string>>();

function facesAt(base: string): Promise<Face[]> {
  const url = new URL("fonts/faces.json", base).href;
  let p = faceLists.get(url);
  if (!p) {
    p = fetch(url).then(async (r) => {
      if (!r.ok) throw new MotionError(`${url}: HTTP ${r.status}`);
      return ((await r.json()) as { faces: Face[] }).faces;
    });
    faceLists.set(url, p);
    p.catch(() => faceLists.delete(url));
  }
  return p;
}

/** One fetch per font file, whoever asks: the worker, the frames, the 3D glyph reader. */
function fontBlob(url: string): Promise<Blob> {
  let p = fontBlobs.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new MotionError(`${url}: HTTP ${r.status}`);
      return r.blob();
    });
    fontBlobs.set(url, p);
    p.catch(() => fontBlobs.delete(url));
  }
  return p;
}

/** A blob: URL for the worker's FontFace (same origin as the page, so it loads without a refetch). */
function fontObjectUrl(url: string): Promise<string> {
  let p = fontObjectUrls.get(url);
  if (!p) {
    p = fontBlob(url).then((b) => URL.createObjectURL(b));
    fontObjectUrls.set(url, p);
    p.catch(() => fontObjectUrls.delete(url));
  }
  return p;
}

/** A data: URL for a frame's @font-face (an SVG image may only use what it carries). */
function fontDataUrl(url: string): Promise<string> {
  let p = fontDataUrls.get(url);
  if (!p) {
    p = fontBlob(url).then(
      (b) =>
        new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result));
          fr.onerror = () => rej(fr.error);
          fr.readAsDataURL(b);
        }),
    );
    fontDataUrls.set(url, p);
    p.catch(() => fontDataUrls.delete(url));
  }
  return p;
}

const faceUrl = (base: string, f: Face) => new URL(`fonts/${f.file}`, base).href;

async function payloadFor(faces: Face[], base: string, url: (u: string) => Promise<string>): Promise<FontPayload[]> {
  return Promise.all(faces.map(async (f) => ({ family: f.family, weight: f.weight, italic: f.italic, range: f.range, url: await url(faceUrl(base, f)) })));
}

const fontCss = (fonts: FontPayload[]) => fonts.map((f) => `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:${f.italic ? "italic" : "normal"};${f.range ? `unicode-range:${f.range};` : ""}src:url(${f.url});}`).join("");

// ---------------------------------------------------------------------------------------------
// The program's worker
// ---------------------------------------------------------------------------------------------

interface WorkerFrame {
  svg: string;
  defs: string;
  warnings: string[];
}

class ProgramWorker {
  private readonly worker: Worker;
  private readonly url: string;
  private readonly codeLine: number;
  private seq = 0;
  private readonly pending = new Map<number, { res: (f: WorkerFrame) => void; rej: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  readonly ready: Promise<void>;
  private dead: Error | null = null;

  constructor(program: TitleProgram, env: ProgramEnv, fonts: FontPayload[], lineOffset = 0) {
    const { source, codeLine } = programWorkerSource(program.code);
    this.codeLine = codeLine + Math.max(0, lineOffset);
    this.url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    this.worker = new Worker(this.url);
    this.ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject((this.dead = new MotionError("the graphic did not start in time"))), 8000);
      this.worker.onerror = (ev) => {
        ev.preventDefault();
        clearTimeout(timer);
        this.dead = new MotionError(`${String(ev.message || "the program does not run").replace(/^Uncaught\s+/, "")}${this.line(ev.lineno)}`);
        reject(this.dead);
        this.fail(this.dead);
      };
      this.worker.onmessage = (e: MessageEvent) => {
        const m = e.data as { type: string; id?: number; svg?: string; defs?: string; warnings?: string[]; error?: string; line?: number };
        if (m.type === "ready") {
          clearTimeout(timer);
          if (m.error) reject((this.dead = new MotionError(`${m.error}${this.line(m.line)}`)));
          else resolve();
          return;
        }
        if (m.type === "frame" && m.id !== undefined) {
          const p = this.pending.get(m.id);
          if (!p) return;
          this.pending.delete(m.id);
          clearTimeout(p.timer);
          if (m.error) p.rej(new MotionError(`${m.error}${this.line(m.line)}`));
          else p.res({ svg: m.svg ?? "", defs: m.defs ?? "", warnings: m.warnings ?? [] });
        }
      };
    });
    this.ready.catch(() => {});
    this.worker.postMessage({ type: "init", env, fonts: fonts.map(({ family, weight, italic, url }) => ({ family, weight, italic, url })) });
  }

  private line(n: number | null | undefined): string {
    return n && n >= this.codeLine ? ` (line ${n - this.codeLine + 1})` : "";
  }

  private fail(err: Error): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.rej(err);
    }
    this.pending.clear();
  }

  async frame(t: number, timeoutMs = 2000): Promise<WorkerFrame> {
    await this.ready;
    if (this.dead) throw this.dead;
    const id = ++this.seq;
    return new Promise<WorkerFrame>((res, rej) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.dead = new MotionError(`a frame took longer than ${(timeoutMs / 1000).toFixed(1)} s — an endless loop, or far too much drawing`);
        this.fail(this.dead);
        rej(this.dead);
        this.stop();
      }, timeoutMs);
      this.pending.set(id, { res, rej, timer });
      this.worker.postMessage({ type: "frame", id, t });
    });
  }

  stop(): void {
    this.worker.terminate();
    URL.revokeObjectURL(this.url);
  }
}

// ---------------------------------------------------------------------------------------------
// The player
// ---------------------------------------------------------------------------------------------

export interface PlayerOptions extends BuildOptions {
  /** Where fonts/ (and dist/registry.json) live — the package on jsDelivr by default. */
  base?: string;
  fps?: number;
  /** Play again from the start at the end (true). */
  loop?: boolean;
  /** A colour drawn under the graphic; transparent by default. */
  background?: string;
  /** Called with the program's warnings (text off the frame, props that do not fit) whenever they change. */
  onWarnings?: (warnings: string[]) => void;
  /** Called with a failure (the program threw, a frame did not parse). */
  onError?: (err: Error) => void;
  /** Called on every drawn frame with its time. */
  onFrame?: (t: number) => void;
}

function frameDocument(p: TitleProgram, f: WorkerFrame, css: string, w: number, h: number, bg?: string): string {
  const body = p.region ? `<clipPath id="__mm_region"><rect x="${p.region.x}" y="${p.region.y}" width="${p.region.w}" height="${p.region.h}"/></clipPath>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${p.width} ${p.height}">${css ? `<style>${css}</style>` : ""}<defs>${MG_STD_DEFS}${f.defs}${body}</defs>${bg ? `<rect width="${p.width}" height="${p.height}" fill="${bg}"/>` : ""}${p.region ? `<g clip-path="url(#__mm_region)">${f.svg}</g>` : f.svg}</svg>`;
}

function decode(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const img = new Image();
  return new Promise<HTMLImageElement>((res, rej) => {
    img.onload = () => res(img);
    img.onerror = () => rej(new MotionError("the frame's SVG does not parse — escape text with $.esc() and close every tag"));
    img.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

export class MotionPlayer {
  readonly canvas: HTMLCanvasElement;
  private item: MotionItem;
  private opts: PlayerOptions;
  private built!: BuiltProgram;
  private worker: ProgramWorker | null = null;
  private env!: ProgramEnv;
  /** Every face the package has (fonts/faces.json), and the files the worker has loaded. */
  private all: Face[] = [];
  private loaded = new Set<string>();
  private readonly css = new Map<string, Promise<string>>();
  private widening: Promise<void> | null = null;
  private gone = false;
  private lastT = 0;
  private raf = 0;
  private started = 0;
  private offset = 0;
  private playing = false;
  private drawing = false;
  private lastSvg = "";
  private warned = "";

  private constructor(canvas: HTMLCanvasElement, item: MotionItem, opts: PlayerOptions) {
    this.canvas = canvas;
    this.item = item;
    this.opts = opts;
  }

  static async create(canvas: HTMLCanvasElement, item: MotionItem, opts: PlayerOptions = {}): Promise<MotionPlayer> {
    const p = new MotionPlayer(canvas, item, opts);
    await p.load();
    return p;
  }

  /** Seconds the graphic runs. */
  get duration(): number {
    return this.built.duration;
  }

  /** The time shown now, seconds. */
  get time(): number {
    if (!this.playing) return this.offset;
    const t = (performance.now() - this.started) / 1000;
    return this.opts.loop === false ? Math.min(t, this.duration) : t % this.duration;
  }

  get program(): TitleProgram {
    return this.built.program;
  }

  private get base(): string {
    return this.opts.base ?? CDN_BASE;
  }

  private async load(): Promise<void> {
    const old = this.worker;
    this.worker = null;
    old?.stop();
    await preloadGlyphs(this.item, this.opts, this.base);
    this.built = buildProgram(this.item, this.opts);
    this.env = programEnv(this.built.program, this.built.duration, this.opts.fps ?? 30, this.built.media);
    this.all = await facesAt(this.base);
    this.lastSvg = "";
    this.report(this.built.warnings);
    // The worker measures text with the faces the program declares, in latin and the scripts its
    // props need (as a render does)...
    let faces = facesFor(this.all, this.built.program.fonts.map((f) => parseFontSpec(f)), wideCodepoints(JSON.stringify(this.built.props)));
    let worker = await this.startWorker(faces);
    // ...and any its frames draw with: a few frames across it find those before the first is shown.
    const have = new Set(faces.map((f) => f.file));
    const more: Face[] = [];
    try {
      for (const k of [0.1, 0.35, 0.6, 0.85]) for (const f of this.facesOf(await worker.frame(this.built.duration * k))) if (!have.has(f.file) && have.add(f.file)) more.push(f);
    } catch {
      // A frame that fails here fails again when drawn, and is reported there.
    }
    if (more.length) {
      worker.stop();
      faces = [...faces, ...more];
      worker = await this.startWorker(faces);
    }
    if (this.gone) return worker.stop();
    this.worker = worker;
    this.loaded = have;
    await this.draw(this.offset);
  }

  private async startWorker(faces: Face[]): Promise<ProgramWorker> {
    const fonts = await payloadFor(faces, this.base, fontObjectUrl);
    const w = new ProgramWorker(this.built.program, this.env, fonts, this.built.codeOffset);
    await w.ready;
    return w;
  }

  /** The faces a frame draws with. */
  private facesOf(f: WorkerFrame): Face[] {
    const svg = f.defs + f.svg;
    return facesFor(this.all, fontWants(svg), wideCodepoints(svg));
  }

  /** The @font-face rules for a set of faces, as data: URLs; one string per set, made once. */
  private cssOf(faces: Face[]): Promise<string> {
    const key = faces
      .map((f) => f.file)
      .sort()
      .join("|");
    let p = this.css.get(key);
    if (!p) {
      p = payloadFor(faces, this.base, fontDataUrl).then(fontCss);
      this.css.set(key, p);
      p.catch(() => this.css.delete(key));
    }
    return p;
  }

  /** A frame drew with a face the worker lacks (so measured without it): restart it with that face, then redraw. */
  private widen(faces: Face[]): Promise<void> {
    if (this.widening) return this.widening;
    const program = this.built.program;
    this.widening = (async () => {
      const files = new Set(this.loaded);
      for (const f of faces) files.add(f.file);
      try {
        const next = await this.startWorker(this.all.filter((f) => files.has(f.file)));
        const old = this.worker;
        if (this.gone || !old || this.built.program !== program) return next.stop();
        this.worker = next;
        this.loaded = files;
        // Frames already on their way finish on the old worker first.
        setTimeout(() => old.stop(), 2500);
        this.lastSvg = "";
        if (!this.playing) await this.draw(this.lastT);
      } catch {
        // Keep the worker there is; its text is measured with the nearest face it has.
      }
    })().finally(() => {
      this.widening = null;
    });
    return this.widening;
  }

  private report(w: string[]): void {
    const key = w.join("\n");
    if (key === this.warned) return;
    this.warned = key;
    this.opts.onWarnings?.(w);
  }

  /** Change props, style, aspect or duration; the frame redraws. */
  async update(opts: Partial<PlayerOptions>): Promise<void> {
    this.opts = { ...this.opts, ...opts };
    await this.load();
  }

  /** Play another item (or program) with the current options. */
  async setItem(item: MotionItem | string): Promise<void> {
    this.item = typeof item === "string" ? customItem(item) : item;
    await this.load();
  }

  /** Draw the frame at `t` seconds. */
  async draw(t: number): Promise<void> {
    if (!this.worker) return;
    const p = this.built.program;
    const w = this.canvas.width || p.width;
    const h = this.canvas.height || Math.round((w * p.height) / p.width);
    this.lastT = t;
    try {
      const f = await this.worker.frame(Math.max(0, Math.min(this.duration, t)));
      this.report([...this.built.warnings, ...f.warnings]);
      const faces = this.facesOf(f);
      if (faces.some((x) => !this.loaded.has(x.file))) void this.widen(faces);
      const doc = frameDocument(p, f, await this.cssOf(faces), w, h, this.opts.background);
      if (doc !== this.lastSvg) {
        const img = await decode(doc);
        const ctx = this.canvas.getContext("2d")!;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.lastSvg = doc;
      }
      this.opts.onFrame?.(t);
    } catch (err) {
      this.pause();
      this.opts.onError?.(err as Error);
      if (!this.opts.onError) throw err;
    }
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.started = performance.now() - this.offset * 1000;
    const tick = () => {
      if (!this.playing) return;
      const t = this.time;
      if (!this.drawing) {
        this.drawing = true;
        void this.draw(t).finally(() => {
          this.drawing = false;
        });
      }
      if (this.opts.loop === false && t >= this.duration) {
        this.pause();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  pause(): void {
    if (!this.playing) return;
    this.offset = this.time;
    this.playing = false;
    cancelAnimationFrame(this.raf);
  }

  async seek(t: number): Promise<void> {
    this.offset = Math.max(0, Math.min(this.duration, t));
    if (this.playing) this.started = performance.now() - this.offset * 1000;
    else await this.draw(this.offset);
  }

  destroy(): void {
    this.gone = true;
    this.pause();
    this.worker?.stop();
    this.worker = null;
  }
}

/** A player on `canvas` for `item` (an item, or program code); its first frame is drawn when this resolves. */
export function createPlayer(canvas: HTMLCanvasElement, item: MotionItem | string, opts: PlayerOptions = {}): Promise<MotionPlayer> {
  return MotionPlayer.create(canvas, typeof item === "string" ? customItem(item) : item, opts);
}
