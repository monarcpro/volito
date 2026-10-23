/** Reading what callers hand in: transcripts (to sync to a voice), pictures for image props, DESIGN.md files. */
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import type { GraphicWord } from "../engine.js";
import { type MotionItem, MotionError, type StyleInput } from "../pack.js";

const num = (v: unknown): number => (typeof v === "number" ? v : Number.parseFloat(String(v)));

/**
 * Words with times from the transcript shapes people have: [{w, s, e}], [{word|text, start, end}],
 * Whisper's {segments: [{words: […]}]}, or {words: […]}. Times in seconds from the graphic's start;
 * `offset` shifts them (a graphic that starts 12 s into the voice: offset 12).
 */
export function normalizeWords(input: unknown, offset = 0): GraphicWord[] {
  const rows: unknown[] = Array.isArray(input)
    ? input
    : input && typeof input === "object"
      ? Array.isArray((input as { words?: unknown[] }).words)
        ? (input as { words: unknown[] }).words
        : Array.isArray((input as { segments?: unknown[] }).segments)
          ? (input as { segments: Array<{ words?: unknown[] }> }).segments.flatMap((s) => s.words ?? [])
          : []
      : [];
  const out: GraphicWord[] = [];
  for (const r of rows) {
    const o = (r ?? {}) as Record<string, unknown>;
    const w = String(o.w ?? o.word ?? o.text ?? "").trim();
    const s = num(o.s ?? o.start) - offset;
    const e = num(o.e ?? o.end) - offset;
    if (!w || !Number.isFinite(s)) continue;
    if (s < -0.01) continue;
    out.push({ w, s: Math.max(0, s), e: Number.isFinite(e) ? Math.max(s, e) : s + 0.3 });
  }
  return out.slice(0, 600);
}

export function readWords(file: string, offset = 0): GraphicWord[] {
  const path = resolve(file);
  if (!existsSync(path)) throw new MotionError(`no transcript at ${path}`);
  const words = normalizeWords(JSON.parse(readFileSync(path, "utf8")), offset);
  if (!words.length) throw new MotionError(`${path} has no timed words (expected [{w, s, e}] or Whisper JSON)`);
  return words;
}

const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };

/** A picture (path or http(s) URL) as a data: URL. */
export async function loadImage(src: string): Promise<string> {
  if (src.startsWith("data:image/")) return src;
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new MotionError(`${src}: HTTP ${res.status}`);
    const type = res.headers.get("content-type")?.split(";")[0] ?? MIME[extname(new URL(src).pathname).toLowerCase()] ?? "image/png";
    if (!type.startsWith("image/")) throw new MotionError(`${src} is not an image (${type})`);
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  }
  const path = resolve(src);
  if (!existsSync(path)) throw new MotionError(`no picture at ${path}`);
  const type = MIME[extname(path).toLowerCase()];
  if (!type) throw new MotionError(`${path}: pictures are PNG, JPEG, WebP, GIF or SVG`);
  return `data:${type};base64,${readFileSync(path).toString("base64")}`;
}

/** Every image prop the caller set, loaded. */
export async function loadMedia(item: MotionItem, props: Record<string, unknown> = {}): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [name, spec] of Object.entries(item.props)) {
    const v = props[name] ?? spec.default;
    if (spec.type !== "image" || typeof v !== "string" || !v.trim()) continue;
    out[name] = await loadImage(v.trim());
  }
  return out;
}

/** A style argument: a built-in name, or a path to a DESIGN.md (read here). */
export function readStyleArg(arg: string | undefined): StyleInput {
  if (!arg) return undefined;
  const path = resolve(arg);
  if (/\.(md|markdown|txt)$/i.test(arg) || (existsSync(path) && !/^[a-z0-9-]+$/i.test(arg))) {
    if (!existsSync(path)) throw new MotionError(`no style file at ${path}`);
    return readFileSync(path, "utf8");
  }
  return arg;
}
