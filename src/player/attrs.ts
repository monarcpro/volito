/**
 * The <volito-player> element's attribute parsing and clock arithmetic: pure functions, no DOM, so
 * they are tested in Node and the element stays a thin layer over them.
 */
import { parseMotionArgs, type MotionInput } from "../kit.js";
import { ASPECTS, ASPECT_NAMES, parseAspect } from "../pack.js";

/** A JSON object attribute (props, posters, beats); anything else is an error the element reports. */
export function parseJsonObject(value: string | null, attr: string): Record<string, unknown> | undefined {
  if (value == null || !value.trim()) return undefined;
  let v: unknown;
  try {
    v = JSON.parse(value);
  } catch {
    throw new Error(`${attr} must be a JSON object, like {"title":"Hello"}`);
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`${attr} must be a JSON object, like {"title":"Hello"}`);
  return v as Record<string, unknown>;
}

/** "16:9, 9:16" or "all" → the aspects to offer as tabs, in the order given. Unknown ones throw. */
export function parseAspects(value: string | null): string[] {
  if (value == null || !value.trim()) return [];
  if (value.trim().toLowerCase() === "all") return [...ASPECT_NAMES];
  const out: string[] = [];
  for (const raw of value.split(/[\s,]+/)) {
    const a = raw.trim().toLowerCase();
    if (!a) continue;
    parseAspect(a);
    if (!out.includes(a)) out.push(a);
  }
  return out;
}

/** An aspect's canvas size at 1080p: a name from ASPECTS, or WIDTHxHEIGHT / W:H. */
export function aspectSize(aspect: string): { width: number; height: number } {
  const a = parseAspect(aspect);
  if (typeof a === "string") {
    const [width, height] = ASPECTS[a];
    return { width, height };
  }
  return a;
}

/**
 * The canvas's pixel size: the frame's CSS width times the device pixel ratio, its long side kept
 * between 240 px and `cap`, in the aspect's proportions. The player draws at the canvas's own size.
 */
export function canvasSize(aspect: string, cssWidth: number, dpr: number, cap = 1920): { width: number; height: number } {
  const { width: w, height: h } = aspectSize(aspect);
  const want = Math.max(1, cssWidth) * Math.max(1, dpr);
  const long = Math.max(w, h);
  const scale = Math.min(Math.max(want / w, 240 / long), cap / long);
  return { width: Math.max(2, Math.round(w * scale)), height: Math.max(2, Math.round(h * scale)) };
}

/**
 * The motion attribute: settings separated by ";" or new lines, each "part.setting=value" as the
 * CLI's --motion takes them ("*.in=pop; title.split=letters"), or one JSON object.
 */
export function parseMotionAttr(value: string | null): MotionInput | undefined {
  if (value == null || !value.trim()) return undefined;
  const v = value.trim();
  if (v.startsWith("{")) return parseMotionArgs([v]);
  return parseMotionArgs(v.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean));
}

/** The beats attribute: "in=0.4; out=-0.6" or a JSON object of numbers. */
export function parseBeats(value: string | null): Record<string, number> | undefined {
  if (value == null || !value.trim()) return undefined;
  const v = value.trim();
  const pairs: [string, unknown][] = v.startsWith("{")
    ? Object.entries(parseJsonObject(v, "beats") ?? {})
    : v
        .split(/[;,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const eq = s.indexOf("=");
          if (eq < 1) throw new Error(`beats take name=seconds (got "${s}")`);
          return [s.slice(0, eq).trim(), Number(s.slice(eq + 1))];
        });
  const out: Record<string, number> = {};
  for (const [k, n] of pairs) {
    if (typeof n !== "number" || !Number.isFinite(n)) throw new Error(`beat "${k}" must be a number of seconds`);
    out[k] = n;
  }
  return out;
}

/** A number attribute, or undefined when absent or not a finite number. */
export function numberAttr(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** The part of the graphic that plays: [start, end) inside [0, duration], or the whole of it. */
export function playRange(duration: number, start?: number, end?: number): { start: number; end: number } {
  let s = Math.max(0, Math.min(start ?? 0, duration));
  let e = end == null ? duration : Math.max(0, Math.min(end, duration));
  if (e <= s) {
    s = 0;
    e = duration;
  }
  return { start: s, end: e };
}

/**
 * Where the clock is after `elapsed` seconds of wall time from `from`, at `rate`, inside the range:
 * looping wraps to the start, otherwise it stops one frame before the end and reports `ended`.
 */
export function advance(from: number, elapsed: number, rate: number, range: { start: number; end: number }, loop: boolean, fps = 30): { t: number; ended: boolean } {
  const t = from + elapsed * rate;
  if (t < range.end) return { t: Math.max(range.start, t), ended: false };
  const span = range.end - range.start;
  if (loop && span > 0) return { t: range.start + ((t - range.start) % span), ended: false };
  return { t: Math.max(range.start, range.end - 1 / fps), ended: true };
}

/** "1.20 / 5.00 s". */
export function formatTime(t: number, duration: number): string {
  return `${Math.max(0, Math.min(t, duration)).toFixed(2)} / ${duration.toFixed(2)} s`;
}

/** The ground behind a transparent graphic: a footage stand-in, a checkerboard, nothing, or a colour. */
export function groundOf(value: string | null): { kind: "footage" | "checker" | "none" | "color"; color?: string } {
  const v = (value ?? "footage").trim();
  if (v === "" || v === "footage") return { kind: "footage" };
  if (v === "checker" || v === "none") return { kind: v };
  return { kind: "color", color: v };
}
