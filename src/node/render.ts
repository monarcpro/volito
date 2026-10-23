/**
 * Rendering in Node: every frame of a program run in its sandbox, wrapped in the same SVG
 * document the MONARC editor decodes, rasterised by resvg with the package's own faces, and
 * either written as stills or piped as raw RGBA to ffmpeg — ProRes 4444 and HEVC keep the
 * alpha (overlays drop straight onto footage in Premiere, Resolve, Final Cut), WebM VP9 keeps it
 * for the web, MP4 and GIF draw on a background. Frames that do not change are drawn once.
 */
import { spawn } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Resvg, renderAsync } from "@resvg/resvg-js";
import { MG_STD_DEFS, type ProgramEnv, type TitleProgram, programEnv } from "../engine.js";
import { type BuildOptions, type BuiltProgram, type MotionItem, MotionError, buildProgram } from "../pack.js";
import { FfmpegMissing, probeFfmpeg } from "./ffmpeg.js";
import { fontFaceCss, fontFilesFor, fontFilesForDocument } from "./fonts.js";
import { outlineText } from "./outline.js";
import { resolvePathLength } from "./pathlength.js";
import { type ProgramFrame, ProgramRunner } from "./sandbox.js";

export const VIDEO_FORMATS = ["mov", "webm", "mp4", "hevc", "gif", "png"] as const;
export type VideoFormat = (typeof VIDEO_FORMATS)[number];
export type StillFormat = "png" | "svg";

/** What each format is, for help text and agents. */
export const FORMAT_NOTES: Record<VideoFormat, string> = {
  mov: "ProRes 4444 with alpha (.mov) — drops onto footage in Premiere, Resolve, Final Cut, After Effects",
  webm: "VP9 with alpha (.webm) — for the web and CapCut; needs an ffmpeg built with libvpx",
  mp4: "H.264 (.mp4) — no alpha: drawn on --bg (black by default)",
  hevc: "HEVC with alpha (.mov) — small files for Final Cut, iMovie and Safari; macOS only (VideoToolbox)",
  gif: "animated GIF — 1-bit transparency, or drawn on --bg",
  png: "a folder of PNG frames with alpha — no ffmpeg needed",
};

export interface RenderOptions extends BuildOptions {
  /** Frames per second (30). */
  fps?: number;
  /** Output width in px; the height follows the canvas. The canvas width when omitted. */
  width?: number;
  /** A colour drawn under the graphic ("#000000"), or "transparent" (the default where the format has alpha). */
  background?: string;
  /** Frames rasterised at once (the machine's cores). */
  concurrency?: number;
  /** Bound on one frame's program run, ms. */
  frameTimeoutMs?: number;
  onProgress?: (done: number, total: number) => void;
}

export interface Session {
  item: MotionItem;
  built: BuiltProgram;
  env: ProgramEnv;
  runner: ProgramRunner;
  fps: number;
  /** Output size, px. */
  width: number;
  height: number;
  warnings: string[];
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function backgroundOf(opts: RenderOptions): string | null {
  const b = opts.background?.trim();
  if (!b || b === "transparent" || b === "none") return null;
  if (!HEX.test(b)) throw new MotionError(`background "${b}" must be a hex colour (#000000) or "transparent"`);
  return b;
}

/** Build the program and start its sandbox. */
export async function openSession(item: MotionItem, opts: RenderOptions = {}): Promise<Session> {
  const built = buildProgram(item, opts);
  const fps = Math.max(1, Math.min(120, Math.round(opts.fps ?? 30)));
  const env = programEnv(built.program, built.duration, fps, built.media);
  const runner = await ProgramRunner.create(built.program, env, 5000, built.codeOffset);
  const p = built.program;
  const width = Math.max(16, Math.min(8192, Math.round(opts.width ?? p.width)));
  const height = Math.max(16, Math.round((width * p.height) / p.width / 2) * 2);
  return { item, built, env, runner, fps, width: width % 2 ? width + 1 : width, height, warnings: [...built.warnings] };
}

/**
 * The complete SVG document for one frame body (the region clipped, a background under it). For resvg,
 * text beyond its family's Latin cut is set as outlines (see outline.ts); with `css` (a standalone SVG
 * for browsers) the faces are embedded instead and the text left as written.
 */
export function frameDocument(program: TitleProgram, frame: Pick<ProgramFrame, "svg" | "defs">, width: number, height: number, opts: { background?: string | null; css?: string } = {}): string {
  let body = opts.css ? frame.svg : resolvePathLength(outlineText(frame.svg));
  let defs = MG_STD_DEFS + frame.defs;
  if (program.region) {
    const r = program.region;
    defs += `<clipPath id="__mm_region"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/></clipPath>`;
    body = `<g clip-path="url(#__mm_region)">${body}</g>`;
  }
  const bg = opts.background ? `<rect x="0" y="0" width="${program.width}" height="${program.height}" fill="${opts.background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${program.width} ${program.height}">${opts.css ? `<style>${opts.css}</style>` : ""}<defs>${defs}</defs>${bg}${body}</svg>`;
}

const resvgOptions = (fontFiles: string[], width: number) => ({
  font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Inter" },
  fitTo: { mode: "width" as const, value: width },
  imageRendering: 0 as const,
  shapeRendering: 2 as const,
  textRendering: 1 as const,
});

/** resvg's pixels are premultiplied; video encoders and PNG want straight alpha. */
function unpremultiply(px: Buffer): Buffer {
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3]!;
    if (a === 255 || a === 0) continue;
    const k = 255 / a;
    px[i] = Math.min(255, Math.round(px[i]! * k));
    px[i + 1] = Math.min(255, Math.round(px[i + 1]! * k));
    px[i + 2] = Math.min(255, Math.round(px[i + 2]! * k));
  }
  return px;
}

/** One frame of the session as an SVG document and its font files. */
function frameAt(s: Session, t: number, background: string | null, timeoutMs?: number): { doc: string; fonts: string[]; frame: ProgramFrame } {
  const frame = s.runner.frame(Math.max(0, Math.min(s.built.duration, t)), timeoutMs);
  for (const w of frame.warnings) if (!s.warnings.includes(w)) s.warnings.push(w);
  const doc = frameDocument(s.built.program, frame, s.width, s.height, { background });
  return { doc, fonts: fontFilesForDocument(doc), frame };
}

function parseError(err: unknown): MotionError {
  return new MotionError(`the frame's SVG does not parse (${String((err as Error)?.message ?? err).slice(0, 200)}) — escape text with $.esc() and close every tag`);
}

// ---------------------------------------------------------------------------------------------
// Stills
// ---------------------------------------------------------------------------------------------

export interface StillResult {
  format: StillFormat;
  /** PNG bytes, or the SVG document. */
  data: Buffer;
  width: number;
  height: number;
  t: number;
  warnings: string[];
  file?: string;
}

/** One frame at `t` seconds as a PNG (alpha kept) or a standalone SVG (its faces embedded). */
export async function renderStill(item: MotionItem, opts: RenderOptions & { t?: number; format?: StillFormat; out?: string } = {}): Promise<StillResult> {
  const s = await openSession(item, opts);
  const t = opts.t ?? Math.min(s.built.duration * 0.5, Math.max(0, s.built.duration - 0.6));
  const bg = backgroundOf(opts);
  const format = opts.format ?? "png";
  let data: Buffer;
  if (format === "svg") {
    const f = frameAt(s, t, bg, opts.frameTimeoutMs);
    data = Buffer.from(frameDocument(s.built.program, f.frame, s.width, s.height, { background: bg, css: fontFaceCss(f.frame.svg) }));
  } else {
    const f = frameAt(s, t, bg, opts.frameTimeoutMs);
    try {
      data = Buffer.from(new Resvg(f.doc, resvgOptions(f.fonts, s.width)).render().asPng());
    } catch (err) {
      throw parseError(err);
    }
  }
  const result: StillResult = { format, data, width: s.width, height: s.height, t, warnings: s.warnings };
  if (opts.out) {
    const file = resolve(opts.out);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, data);
    result.file = file;
  }
  return result;
}

/** Times spread over a graphic for a contact sheet: early, entering, holding, leaving. */
export function sheetTimes(duration: number, n = 8): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Math.round(Math.min(duration - 1 / 60, (duration * (i + 0.5)) / n) * 100) / 100);
  return out;
}

/**
 * A contact sheet: frames across the graphic's time in one PNG, each labelled with its time — how
 * an agent (or a reviewer) sees motion in one look. Overlays sit on a footage-grey ground.
 */
export async function renderSheet(item: MotionItem, opts: RenderOptions & { times?: number[]; cols?: number; tileWidth?: number } = {}): Promise<{ png: Buffer; times: number[]; warnings: string[]; width: number; height: number }> {
  const s = await openSession(item, { ...opts, width: opts.tileWidth ?? 640 });
  const times = (opts.times?.length ? opts.times : sheetTimes(s.built.duration)).slice(0, 24);
  const bg = backgroundOf(opts);
  const tiles: string[] = [];
  for (const t of times) {
    const f = frameAt(s, t, bg, opts.frameTimeoutMs);
    let png: Buffer;
    try {
      png = Buffer.from((await renderAsync(f.doc, resvgOptions(f.fonts, s.width))).asPng());
    } catch (err) {
      throw parseError(err);
    }
    tiles.push(png.toString("base64"));
  }
  const cols = Math.max(1, Math.min(times.length, opts.cols ?? (s.width > s.height ? 2 : 4)));
  const rows = Math.ceil(times.length / cols);
  const gap = 12, label = 26;
  const W = cols * s.width + (cols + 1) * gap;
  const H = rows * (s.height + label) + (rows + 1) * gap;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a5563"/><stop offset="1" stop-color="#262c35"/></linearGradient></defs><rect width="${W}" height="${H}" fill="#121418"/>`;
  times.forEach((t, i) => {
    const x = gap + (i % cols) * (s.width + gap);
    const y = gap + Math.floor(i / cols) * (s.height + label + gap);
    svg += `<text x="${x + 2}" y="${y + 18}" font-family="Inter" font-weight="600" font-size="16" fill="#9aa3ad">${t.toFixed(2)} s</text>`;
    if (!bg && s.item.placement === "overlay") svg += `<rect x="${x}" y="${y + label}" width="${s.width}" height="${s.height}" fill="url(#g)"/>`;
    svg += `<image x="${x}" y="${y + label}" width="${s.width}" height="${s.height}" href="data:image/png;base64,${tiles[i]}"/>`;
  });
  svg += "</svg>";
  const png = Buffer.from(new Resvg(svg, resvgOptions(fontFilesFor(["Inter"]), W)).render().asPng());
  return { png, times, warnings: s.warnings, width: W, height: H };
}

// ---------------------------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------------------------

export interface VideoResult {
  file: string;
  format: VideoFormat;
  width: number;
  height: number;
  fps: number;
  frames: number;
  duration: number;
  /** Frames actually rasterised (the rest repeated an unchanged frame). */
  drawn: number;
  bytes: number;
  ms: number;
  warnings: string[];
}

const EXT: Record<VideoFormat, string> = { mov: ".mov", webm: ".webm", mp4: ".mp4", hevc: ".mov", gif: ".gif", png: "" };

/** The format a file name asks for (".mov" → ProRes, ".webm", ".mp4", ".gif", a folder → PNG frames). */
export function formatFromPath(path: string): VideoFormat | null {
  const ext = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase();
  if (!ext) return "png";
  return ext === "mov" ? "mov" : ext === "webm" ? "webm" : ext === "mp4" || ext === "m4v" ? "mp4" : ext === "gif" ? "gif" : null;
}

export function defaultOutput(item: MotionItem, format: VideoFormat, s: { width: number; height: number }): string {
  return `${item.id}-${s.width}x${s.height}${format === "hevc" ? "-hevc" : ""}${EXT[format]}`;
}

function encoderArgs(format: VideoFormat, s: Session, alpha: boolean, encoders: Set<string>): string[] {
  const input = ["-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${s.width}x${s.height}`, "-r", String(s.fps), "-i", "-"];
  switch (format) {
    case "mov":
      if (!encoders.has("prores_ks")) throw new MotionError("this ffmpeg has no ProRes encoder (prores_ks)");
      return [...input, "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", alpha ? "yuva444p10le" : "yuv444p10le", "-vendor", "apl0"];
    case "webm":
      if (!encoders.has("libvpx-vp9")) throw new MotionError("WebM needs an ffmpeg built with libvpx (libvpx-vp9) — this one has none; use --format mov or png, or install an ffmpeg with libvpx");
      return [...input, "-c:v", "libvpx-vp9", "-pix_fmt", alpha ? "yuva420p" : "yuv420p", "-b:v", "0", "-crf", "30", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", ...(alpha ? ["-auto-alt-ref", "0"] : [])];
    case "mp4":
      if (!encoders.has("libx264")) throw new MotionError("this ffmpeg has no H.264 encoder (libx264)");
      return [...input, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "medium", "-movflags", "+faststart"];
    case "hevc":
      if (!encoders.has("hevc_videotoolbox")) throw new MotionError("HEVC with alpha needs macOS VideoToolbox (hevc_videotoolbox) — use --format mov on this machine");
      return [...input, "-vf", "format=bgra", "-c:v", "hevc_videotoolbox", "-allow_sw", "1", "-alpha_quality", "0.9", "-q:v", "65", "-tag:v", "hvc1"];
    case "gif":
      return [...input, "-filter_complex", alpha ? "[0:v]split[a][b];[a]palettegen=reserve_transparent=1:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:alpha_threshold=128" : "[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a", "-loop", "0"];
    case "png":
      return [];
  }
}

/**
 * Render the whole graphic to a video file (or a folder of PNG frames). The output's format comes
 * from `format`, else from `out`'s extension, else ProRes 4444 .mov.
 */
export async function renderVideo(item: MotionItem, opts: RenderOptions & { format?: VideoFormat; out?: string; outDir?: string } = {}): Promise<VideoResult> {
  const started = performance.now();
  const format: VideoFormat = opts.format ?? (opts.out ? formatFromPath(opts.out) : null) ?? "mov";
  if (!(VIDEO_FORMATS as readonly string[]).includes(format)) throw new MotionError(`unknown format "${format}" — use ${VIDEO_FORMATS.join(", ")}`);
  const ff = format === "png" ? null : probeFfmpeg();
  if (format !== "png" && !ff) throw new FfmpegMissing(`--format ${format}`);
  const s = await openSession(item, opts);
  let bg = backgroundOf(opts);
  if (!bg && (format === "mp4" || (format === "gif" && item.placement === "full"))) {
    bg = "#000000";
    if (item.placement === "overlay" && format === "mp4") s.warnings.push("MP4 has no alpha: the overlay is drawn on black — pass --bg, or use mov/webm/hevc/png to keep it transparent");
  }
  const alpha = !bg;
  const file = resolve(opts.out ?? join(opts.outDir ?? ".", defaultOutput(item, format, s)));
  if (format === "png") mkdirSync(file, { recursive: true });
  else mkdirSync(dirname(file), { recursive: true });

  const total = Math.max(1, Math.round(s.built.duration * s.fps));
  const concurrency = Math.max(1, Math.min(16, opts.concurrency ?? availableParallelism()));
  const holdAfter = s.built.program.holdAfter;

  let enc: ReturnType<typeof spawn> | null = null;
  let encError = "";
  let encDone: Promise<number> | null = null;
  if (ff) {
    enc = spawn(ff.path, [...encoderArgs(format, s, alpha, ff.encoders), file], { stdio: ["pipe", "ignore", "pipe"] });
    enc.stderr!.on("data", (d: Buffer) => {
      encError = (encError + d.toString()).slice(-4000);
    });
    encDone = new Promise<number>((res, rej) => {
      enc!.on("error", rej);
      enc!.on("close", (code) => res(code ?? 0));
    });
  }
  const write = (buf: Buffer) =>
    new Promise<void>((res, rej) => {
      if (!enc?.stdin) return res();
      enc.stdin.write(buf, (err) => (err ? rej(new MotionError(`ffmpeg stopped: ${encError.trim() || err.message}`)) : res()));
    });

  // Frames are run in order (the program is cheap), rasterised `concurrency` at a time, written in order.
  type Job = Promise<Buffer>;
  const queue: Job[] = [];
  let lastDoc = "";
  let lastJob: Job | null = null;
  let drawn = 0;
  let done = 0;
  const rasterise = (doc: string, fonts: string[]): Job =>
    renderAsync(doc, resvgOptions(fonts, s.width)).then(
      (img) => {
        if (format === "png") return Buffer.from(img.asPng());
        const px = Buffer.from(img.pixels);
        return alpha ? unpremultiply(px) : px;
      },
      (err) => {
        throw parseError(err);
      },
    );
  const flush = async (keep: number) => {
    while (queue.length > keep) {
      const buf = await queue.shift()!;
      if (format === "png") writeFileSync(join(file, `frame_${String(done + 1).padStart(5, "0")}.png`), buf);
      else await write(buf);
      done++;
      opts.onProgress?.(done, total);
    }
  };
  try {
    for (let i = 0; i < total; i++) {
      const t = i / s.fps;
      let job: Job;
      if (lastJob && holdAfter !== undefined && t >= holdAfter) job = lastJob;
      else {
        const f = frameAt(s, t, bg, opts.frameTimeoutMs);
        if (lastJob && f.doc === lastDoc) job = lastJob;
        else {
          job = rasterise(f.doc, f.fonts);
          job.catch(() => {});
          drawn++;
          lastDoc = f.doc;
        }
      }
      lastJob = job;
      queue.push(job);
      await flush(concurrency);
    }
    await flush(0);
  } catch (err) {
    enc?.stdin?.destroy();
    enc?.kill("SIGKILL");
    throw err;
  }
  if (enc) {
    enc.stdin!.end();
    const code = await encDone!;
    if (code !== 0) throw new MotionError(`ffmpeg failed (${code}): ${encError.trim().slice(-600)}`);
  }
  let bytes = 0;
  try {
    bytes = format === "png" ? 0 : statSync(file).size;
  } catch {
    /* reported as 0 */
  }
  return { file, format, width: s.width, height: s.height, fps: s.fps, frames: total, duration: s.built.duration, drawn, bytes, ms: Math.round(performance.now() - started), warnings: s.warnings };
}
