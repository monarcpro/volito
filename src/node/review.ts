/**
 * `volito review`: what a render will look like, measured, before anyone renders it. It runs the check at
 * each aspect, then reads the frames themselves:
 *
 *   - timing: when the graphic appears, when it settles, how long it holds still and when it starts to leave
 *     (a frame that stops changing has landed), so a slow entrance or a hold too short to read is caught;
 *   - platform safe zones: on 9:16, how much of an overlay sits under Instagram Reels', YouTube Shorts' and
 *     TikTok's own interface (the caption block, the button column, the header);
 *   - a contact sheet per aspect, written beside a report, for a person or an agent to look at.
 *
 * Everything is measured on pixels, so it works the same for pack items and anyone's own program.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { type Aspect, ASPECT_NAMES, type MotionItem } from "../pack.js";
import { checkItem } from "./check.js";
import { type RenderOptions, framePixels, openSession, renderSheet } from "./render.js";

/**
 * Where each platform's interface sits over a 9:16 video, as fractions of the frame (x, y, w, h). The same
 * numbers as MONARC PRO's safe-zone picker: Meta's Reels guidance (14% top, 35% bottom, 6% sides, the button
 * column lower right) and the apps as they looked in 2026 where a platform publishes none.
 */
export const PLATFORM_COVERS: Record<string, { name: string; covers: { area: string; rect: [number, number, number, number] }[] }> = {
  reels: {
    name: "Instagram Reels",
    covers: [
      { area: "header", rect: [0, 0, 1, 0.1] },
      { area: "like, comment and share buttons", rect: [0.86, 0.46, 0.14, 0.24] },
      { area: "username, caption and audio", rect: [0, 0.7, 1, 0.3] },
    ],
  },
  shorts: {
    name: "YouTube Shorts",
    covers: [
      { area: "search and menu", rect: [0, 0, 1, 0.07] },
      { area: "like, comment and share buttons", rect: [0.86, 0.38, 0.14, 0.4] },
      { area: "title, channel and Subscribe", rect: [0, 0.78, 1, 0.22] },
    ],
  },
  tiktok: {
    name: "TikTok",
    covers: [
      { area: "Following and For You", rect: [0, 0, 1, 0.075] },
      { area: "profile, like, comment and share buttons", rect: [0.87, 0.4, 0.13, 0.38] },
      { area: "username, caption and sound", rect: [0, 0.78, 1, 0.22] },
    ],
  },
};

export interface ReviewIssue {
  level: "error" | "warning" | "note";
  message: string;
  fix?: string;
}

export interface ReviewTiming {
  /** When anything first shows, s. */
  visibleAt: number;
  /** When it stops changing after its entrance, s; null if it never holds still. */
  settledAt: number | null;
  /** When it starts to change again for its exit, s; null when it holds to the end. */
  exitAt: number | null;
  /** Seconds it holds still. */
  hold: number;
  duration: number;
}

export interface ReviewAspect {
  aspect: string;
  ok: boolean;
  timing: ReviewTiming;
  /** Share of the graphic's pixels under each platform's interface, 9:16 overlays only. */
  zones: { platform: string; area: string; share: number }[];
  issues: ReviewIssue[];
  sheet?: string;
}

export interface ReviewReport {
  ref: string;
  placement: string;
  ok: boolean;
  aspects: ReviewAspect[];
  /** Where the report and sheets were written. */
  dir?: string;
}

const FPS = 20;
/** A frame counts as still when under this share of its pixels visibly changed (a cursor or a slow ground drift stays under it). */
const STILL = 0.004;
const ANALYSIS_WIDTH = 270;

/** The share of pixels that visibly changed between two frames (any channel by more than ~10%), 0–1. */
export function frameChange(a: Uint8Array, b: Uint8Array): number {
  let changed = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 4) if (Math.abs(a[i]! - b[i]!) > 24 || Math.abs(a[i + 1]! - b[i + 1]!) > 24 || Math.abs(a[i + 2]! - b[i + 2]!) > 24 || Math.abs(a[i + 3]! - b[i + 3]!) > 24) changed++;
  return changed / (n / 4);
}

/**
 * Entrance, hold and exit from the change between consecutive frames: the hold is the longest run of still
 * frames (≥ 0.3 s) once something shows — so a still moment before an entrance is not mistaken for it — and
 * the exit starts where that run ends.
 */
export function readTiming(changes: number[], visible: boolean[], fps: number, duration: number, still = STILL): ReviewTiming {
  const n = visible.length;
  const firstVisible = visible.findIndex(Boolean);
  const visibleAt = firstVisible < 0 ? duration : firstVisible / fps;
  const min = Math.max(2, Math.round(0.3 * fps));
  let best = { from: -1, to: -1 };
  for (let i = Math.max(1, firstVisible + 1); i < n; ) {
    if ((changes[i] ?? 1) > still) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && (changes[j + 1] ?? 1) <= still) j++;
    if (j - i + 1 >= min && j - i > best.to - best.from) best = { from: i - 1, to: j };
    i = j + 1;
  }
  if (best.from < 0) return { visibleAt, settledAt: null, exitAt: null, hold: 0, duration };
  const settledAt = best.from / fps;
  const exitAt = best.to >= n - 1 ? null : best.to / fps;
  return { visibleAt, settledAt, exitAt, hold: (exitAt ?? duration) - settledAt, duration };
}

/** Share of the graphic's opaque pixels inside each cover of each platform. */
export function zoneShares(px: Uint8Array, width: number, height: number): { platform: string; area: string; share: number }[] {
  let total = 0;
  const opaque = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < px.length; i += 4, p++) if (px[i + 3]! > 128) {
    opaque[p] = 1;
    total++;
  }
  const out: { platform: string; area: string; share: number }[] = [];
  if (!total) return out;
  for (const z of Object.values(PLATFORM_COVERS)) {
    for (const c of z.covers) {
      const [fx, fy, fw, fh] = c.rect;
      const x0 = Math.floor(fx * width), x1 = Math.ceil((fx + fw) * width), y0 = Math.floor(fy * height), y1 = Math.ceil((fy + fh) * height);
      let inside = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) inside += opaque[y * width + x]!;
      out.push({ platform: z.name, area: c.area, share: inside / total });
    }
  }
  return out;
}

const aspectName = (a: Aspect | { width: number; height: number }) => (typeof a === "string" ? a : `${a.width}x${a.height}`);
const s2 = (x: number) => `${x.toFixed(2)} s`;

/** Review an item at each aspect: the check, measured timing, safe zones, and a sheet each when `outDir` is given. */
export async function reviewItem(item: MotionItem, opts: RenderOptions & { aspects?: Array<Aspect | { width: number; height: number }>; outDir?: string } = {}): Promise<ReviewReport> {
  const aspects = opts.aspects?.length ? opts.aspects : opts.aspect ? [opts.aspect] : (item.aspects ?? ASPECT_NAMES);
  const dir = opts.outDir ? resolve(opts.outDir) : undefined;
  if (dir) mkdirSync(dir, { recursive: true });
  const out: ReviewAspect[] = [];
  for (const aspect of aspects) {
    const name = aspectName(aspect);
    const issues: ReviewIssue[] = [];
    const check = await checkItem(item, { ...opts, aspects: [aspect] });
    const cr = check.aspects[0]!;
    for (const e of cr.errors) issues.push({ level: "error", message: e });
    for (const w of cr.warnings) issues.push({ level: "warning", message: w });

    let timing: ReviewTiming = { visibleAt: 0, settledAt: null, exitAt: null, hold: 0, duration: 0 };
    let zones: ReviewAspect["zones"] = [];
    if (cr.ok) {
      const s = await openSession(item, { ...opts, aspect, width: ANALYSIS_WIDTH });
      const duration = s.built.duration;
      const n = Math.max(2, Math.floor(duration * FPS) + 1);
      const frames: Uint8Array[] = [];
      const visible: boolean[] = [];
      const changes: number[] = [0];
      let size = { width: 0, height: 0 };
      for (let i = 0; i < n; i++) {
        const f = framePixels(s, Math.min(duration, i / FPS));
        size = { width: f.width, height: f.height };
        let any = false;
        for (let k = 3; k < f.data.length; k += 16) if (f.data[k]! > 8) {
          any = true;
          break;
        }
        visible.push(any);
        if (i > 0) changes.push(frameChange(frames[i - 1]!, f.data));
        frames.push(f.data);
      }
      timing = readTiming(changes, visible, FPS, duration);

      // Words a viewer reads: the text props only (not choices, colours or icons), at about 0.25 s each.
      const words = Object.entries(item.props)
        .filter(([, p]) => p.type === "text" || p.type === "longtext")
        .map(([k]) => String(s.built.props[k] ?? ""))
        .join(" ")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      if (timing.settledAt === null) issues.push({ level: "note", message: "it never holds still (an idle, a moving ground or a long entrance) — fine for grounds; check the sheet that text is readable while it moves" });
      else {
        const entrance = timing.settledAt - timing.visibleAt;
        if (entrance > 1.5) issues.push({ level: "warning", message: `its entrance takes ${s2(entrance)} to settle — viewers wait for it`, fix: "--speed 1.25, a faster mood, or a shorter entrance move" });
        const needed = Math.max(1.5, words * 0.25);
        if (words && timing.hold < needed) issues.push({ level: "warning", message: `it holds still for ${s2(timing.hold)}; ${words} words need about ${s2(needed)} to read`, fix: `a longer --duration, or --beat out to start the exit later` });
        if (timing.visibleAt > 1) issues.push({ level: "note", message: `nothing shows until ${s2(timing.visibleAt)}` });
      }

      // Transitions cover the whole frame on purpose; the platform zones matter for what stays on screen.
      if (item.placement !== "full" && item.category !== "transition" && size.width && size.height > size.width * 1.5) {
        const mid = timing.settledAt !== null ? Math.min(duration, timing.settledAt + Math.min(0.5, timing.hold / 2)) : duration / 2;
        const f = framePixels(s, mid);
        zones = zoneShares(f.data, f.width, f.height);
        const worst = new Map<string, { area: string; share: number }>();
        for (const z of zones) if (z.share > (worst.get(z.platform)?.share ?? 0)) worst.set(z.platform, z);
        for (const [platform, z] of worst) if (z.share >= 0.05) issues.push({ level: "warning", message: `${Math.round(z.share * 100)}% of the graphic sits under ${platform}${platform.endsWith("s") ? "'" : "'s"} ${z.area}`, fix: "a top or centre placement, or keep it for 16:9 and 1:1" });
      }
    }

    let sheet: string | undefined;
    if (dir && cr.ok) {
      const r = await renderSheet(item, { ...opts, aspect, tileWidth: 360 });
      sheet = join(dir, `${item.id}-${name.replace(":", "x")}.png`);
      writeFileSync(sheet, r.png);
    }
    out.push({ aspect: name, ok: !issues.some((i) => i.level === "error"), timing, zones, issues, ...(sheet ? { sheet } : {}) });
  }
  const report: ReviewReport = { ref: item.ref, placement: item.placement, ok: out.every((a) => a.ok), aspects: out, ...(dir ? { dir } : {}) };
  if (dir) {
    writeFileSync(join(dir, "review.json"), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(join(dir, "review.md"), `${describeReview(report, { markdown: true })}\n`);
  }
  return report;
}

/** A review in plain lines (or Markdown with the sheets inline). */
export function describeReview(rep: ReviewReport, opts: { markdown?: boolean } = {}): string {
  const md = !!opts.markdown;
  const lines = [md ? `# Review: ${rep.ref}` : `${rep.ref}: ${rep.ok ? "ready" : "problems"}`];
  for (const a of rep.aspects) {
    const t = a.timing;
    const timing = t.settledAt === null ? "keeps moving" : `in by ${s2(t.settledAt)} · holds ${s2(t.hold)}${t.exitAt !== null ? ` · leaves at ${s2(t.exitAt)}` : " to the end"}`;
    lines.push(md ? `\n## ${a.aspect} — ${a.ok ? "ok" : "problems"}\n\n${timing}` : `  ${a.aspect}: ${a.ok ? "ok" : "FAILED"} · ${timing}`);
    for (const i of a.issues) lines.push(`${md ? "- " : "    "}${i.level}: ${i.message}${i.fix ? ` → ${i.fix}` : ""}`);
    if (a.sheet) lines.push(md ? `\n![${a.aspect}](${a.sheet.split("/").pop()})` : `    sheet: ${a.sheet}`);
  }
  return lines.join("\n");
}
