/**
 * Checking a graphic before anyone renders it: run it at every aspect asked, frame by frame,
 * and report what the MONARC editor's check would — a throw, a frame that does not parse,
 * text wider than the frame, a word it waits for that is never spoken, a graphic that never
 * draws anything. What a pack test and an agent's fix loop both read.
 */
import { Resvg } from "@resvg/resvg-js";
import { type Aspect, ASPECT_NAMES, type BuildOptions, type MotionItem } from "../pack.js";
import { fontFilesForDocument } from "./fonts.js";
import { frameDocument, openSession } from "./render.js";

export interface AspectReport {
  aspect: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Frames run. */
  frames: number;
  /** Slowest program run, ms. */
  slowestMs: number;
  /** The graphic drew nothing at any sampled time. */
  blank: boolean;
}

export interface CheckReport {
  ref: string;
  ok: boolean;
  aspects: AspectReport[];
}

/** Run `item` at each aspect (its own, else all four), `fps` samples a second, and parse a few frames as images. */
export async function checkItem(item: MotionItem, opts: BuildOptions & { aspects?: Array<Aspect | { width: number; height: number }>; fps?: number } = {}): Promise<CheckReport> {
  const aspects = opts.aspects?.length ? opts.aspects : opts.aspect ? [opts.aspect] : (item.aspects ?? ASPECT_NAMES);
  const reports: AspectReport[] = [];
  for (const aspect of aspects) {
    const name = typeof aspect === "string" ? aspect : `${aspect.width}x${aspect.height}`;
    const r: AspectReport = { aspect: name, ok: true, errors: [], warnings: [], frames: 0, slowestMs: 0, blank: true };
    try {
      const s = await openSession(item, { ...opts, aspect, width: 480 });
      const fps = opts.fps ?? 10;
      const n = Math.max(2, Math.ceil(s.built.duration * fps) + 1);
      for (let i = 0; i < n; i++) {
        const t = Math.min(s.built.duration, i / fps);
        const f = s.runner.frame(t);
        r.frames++;
        r.slowestMs = Math.max(r.slowestMs, f.ms);
        if (f.svg.replace(/<g[^>]*>|<\/g>|\s+/g, "")) r.blank = false;
        for (const w of f.warnings) if (!r.warnings.includes(w)) r.warnings.push(w);
        // Parse a handful of frames the way a render would (catches unescaped text, broken tags).
        if (i % Math.max(1, Math.floor(n / 4)) === 0 || i === n - 1) {
          try {
            const doc = frameDocument(s.built.program, f, 480, Math.round((480 * s.built.program.height) / s.built.program.width));
            new Resvg(doc, { font: { fontFiles: fontFilesForDocument(doc), loadSystemFonts: false } });
          } catch (err) {
            r.errors.push(`at ${t.toFixed(2)} s the frame's SVG does not parse: ${String((err as Error).message).slice(0, 160)}`);
            break;
          }
        }
      }
      for (const w of s.warnings) if (!r.warnings.includes(w)) r.warnings.push(w);
      if (r.blank) r.errors.push("the graphic draws nothing at any time");
    } catch (err) {
      r.errors.push(String((err as Error).message ?? err));
    }
    r.ok = r.errors.length === 0;
    reports.push(r);
  }
  return { ref: item.ref, ok: reports.every((r) => r.ok), aspects: reports };
}

/** A check report in a few lines. */
export function describeReport(rep: CheckReport): string {
  const lines = [`${rep.ref}: ${rep.ok ? "ok" : "problems"}`];
  for (const a of rep.aspects) {
    lines.push(`  ${a.aspect}: ${a.ok ? "ok" : "FAILED"} · ${a.frames} frames · slowest ${a.slowestMs.toFixed(1)} ms`);
    for (const e of a.errors) lines.push(`    error: ${e}`);
    for (const w of a.warnings) lines.push(`    warning: ${w}`);
  }
  return lines.join("\n");
}
