/**
 * monarc-motion — the command line: find a graphic, fill it with your words and brand, render it.
 *
 *   monarc-motion list
 *   monarc-motion info lower-third
 *   monarc-motion render lower-third --prop name="Priya Sharma" --prop role="Product designer" --style ember --out priya.mov
 *   monarc-motion still title-card --aspect 9:16 --t 1.2 --out frame.png
 *   monarc-motion sheet stat --prop value=3.2 --prop suffix=×
 *   monarc-motion check ./my-graphic.js
 *   monarc-motion mcp            (an MCP server on stdio for Claude Code, Cursor, …)
 */
import { availableParallelism } from "node:os";
process.env.UV_THREADPOOL_SIZE ??= String(Math.max(4, Math.min(16, availableParallelism())));
// Output piped into head/less that closes early is not an error.
process.stdout.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EPIPE") process.exit(0);
});

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { AUTHORING_GUIDE, LIBRARY_GUIDE, MOTION_GUIDE } from "./guide.js";
import { BUILTIN_STYLES, MG_API_REFERENCE } from "./engine.js";
import { ASPECT_NAMES, type BuildOptions, CATEGORIES, type MotionItem, MotionError, describeItem, parseAspect } from "./pack.js";
import { DIRECTIONS, EASES, HITS, IDLES, MOODS, MOVES, MOVE_NOTES, ORDERS, ORIGINS, SPLITS, parseMotionArgs } from "./kit.js";
import { checkItem, describeReport } from "./node/check.js";
import { loadMedia, readStyleArg, readWords } from "./node/inputs.js";
import { findItem, library, searchItems } from "./node/packs.js";
import { packageVersion, packsDir } from "./node/paths.js";
import { FORMAT_NOTES, type RenderOptions, VIDEO_FORMATS, type VideoFormat, renderSheet, renderStill, renderVideo } from "./node/render.js";

const HELP = `MONARC Motion ${packageVersion()} — brand-aware, voice-synced motion graphics as code

Usage: monarc-motion <command> [item] [options]

Commands
  list [--search words] [--category c] [--json]   the graphics in the packs
  info <item> [--json] [--code]                   what an item is and every prop it takes
  styles [--json]                                 the built-in brand styles
  moves [--json]                                  every move, ease, idle, hit and mood the motion settings take
  render <item> [--out file] [--format f]         render to video (ProRes 4444 .mov by default)
  still <item> [--t seconds] [--out file.png|.svg] one frame
  sheet <item> [--out sheet.png]                  frames across its time in one picture
  check <item|file.js> [--aspect a]               run it at every aspect and report problems
  add <item> [--dir ./motion]                     copy an item's source into your project to edit
  new <id> [--dir ./motion]                       start a new item from a template
  api                                             the program API (for writing your own graphics)
  guide                                           how items and packs are written
  mcp                                             run the MCP server on stdio

An item is "pack/id" (essentials/lower-third), its id alone (lower-third), an item folder, or a .js program.

Options
  --prop name=value      set a prop (repeat it); lists take "a; b; c" or JSON
  --props <json|file>    every prop at once
  --image name=path      a picture for an image prop (file or URL)
  --style <name|DESIGN.md> a built-in style (${BUILTIN_STYLES.map((s) => s.name).join(", ")}) or your DESIGN.md
  --accent #hex --accent2 #hex --ink #hex --paper #hex --mode dark|light --display Font:900 --text Font:600
  --aspect <a>           ${ASPECT_NAMES.join(", ")} or WIDTHxHEIGHT (16:9)
  --duration <s>         seconds (the item's default)
  --fps <n>              frames per second (30)
  --width <px>           output width (the canvas width)
  --bg <#hex|transparent> a ground under the graphic (formats without alpha default to black)
  --words <file.json>    a transcript ([{w,s,e}] or Whisper JSON): text lands on its words
  --offset <s>           where the graphic starts in that transcript
  --beat name=seconds    move a named moment (negative counts from the end)
  --motion part.key=value  how a part moves (repeat): name.in=pop, *.ease=bouncy, plate.out=wipe,
                         role.emphasis=pulse@2, title.split=letters, name.keys='[{"t":0,"x":-200},{"t":1,"x":0}]'
                         ("in=pop" alone means every part; "monarc-motion info <item>" lists the parts)
  --mood <m>             a choreography: ${MOODS.join(", ")}
  --seed <n>             a new choreography for every number (with or without a mood)
  --speed <x>            every move faster (2) or slower (0.5)
  --packs <dir>          more packs (also MONARC_MOTION_PACKS)
  --format <f>           render: ${VIDEO_FORMATS.join(", ")} · still: png, svg
  --json                 machine-readable output

Formats
${VIDEO_FORMATS.map((f) => `  ${f.padEnd(5)} ${FORMAT_NOTES[f]}`).join("\n")}
`;

const OPTIONS = {
  prop: { type: "string", multiple: true },
  props: { type: "string" },
  image: { type: "string", multiple: true },
  style: { type: "string" },
  accent: { type: "string" },
  accent2: { type: "string" },
  ink: { type: "string" },
  paper: { type: "string" },
  surface: { type: "string" },
  mode: { type: "string" },
  display: { type: "string" },
  text: { type: "string" },
  mono: { type: "string" },
  aspect: { type: "string" },
  duration: { type: "string" },
  fps: { type: "string" },
  width: { type: "string" },
  bg: { type: "string" },
  words: { type: "string" },
  offset: { type: "string" },
  beat: { type: "string", multiple: true },
  motion: { type: "string", multiple: true },
  mood: { type: "string" },
  seed: { type: "string" },
  speed: { type: "string" },
  packs: { type: "string", multiple: true },
  format: { type: "string" },
  out: { type: "string" },
  t: { type: "string" },
  times: { type: "string" },
  cols: { type: "string" },
  dir: { type: "string" },
  search: { type: "string" },
  category: { type: "string" },
  pack: { type: "string" },
  json: { type: "boolean" },
  code: { type: "boolean" },
  quiet: { type: "boolean", short: "q" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
} as const;

type Values = ReturnType<typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true }>>["values"];

const num = (s: string | undefined, name: string): number | undefined => {
  if (s === undefined) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new MotionError(`--${name} "${s}" is not a number`);
  return n;
};

/** name=value pairs; the value may itself contain "=". */
function pairs(list: string[] | undefined, flag: string): Array<[string, string]> {
  return (list ?? []).map((p) => {
    const i = p.indexOf("=");
    if (i < 1) throw new MotionError(`--${flag} takes name=value (got "${p}")`);
    return [p.slice(0, i).trim(), p.slice(i + 1)];
  });
}

async function buildOptions(v: Values, item: MotionItem): Promise<RenderOptions> {
  let props: Record<string, unknown> = {};
  if (v.props) {
    const raw = existsSync(resolve(v.props)) ? readFileSync(resolve(v.props), "utf8") : v.props;
    try {
      props = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new MotionError("--props takes JSON or a JSON file");
    }
  }
  for (const [k, val] of pairs(v.prop, "prop")) props[k] = val;
  for (const [k, val] of pairs(v.image, "image")) props[k] = val;
  const beats: Record<string, number> = {};
  for (const [k, val] of pairs(v.beat, "beat")) beats[k] = num(val, "beat")!;
  const colors: BuildOptions["colors"] = {};
  for (const k of ["accent", "accent2", "ink", "paper", "surface", "display", "text", "mono"] as const) if (v[k]) colors[k] = v[k];
  if (v.mode) {
    if (v.mode !== "dark" && v.mode !== "light") throw new MotionError('--mode is "dark" or "light"');
    colors.mode = v.mode;
  }
  const opts: RenderOptions = {
    props,
    colors,
    ...(v.style ? { style: readStyleArg(v.style) } : {}),
    ...(v.aspect ? { aspect: parseAspect(v.aspect) } : {}),
    ...(v.duration ? { duration: num(v.duration, "duration") } : {}),
    ...(v.fps ? { fps: num(v.fps, "fps") } : {}),
    ...(v.width ? { width: num(v.width, "width") } : {}),
    ...(v.bg ? { background: v.bg } : {}),
    ...(v.words ? { words: readWords(v.words, num(v.offset, "offset") ?? 0) } : {}),
    ...(Object.keys(beats).length ? { beats } : {}),
    ...(v.motion?.length ? { motion: parseMotionArgs(v.motion) } : {}),
    ...(v.mood ? { mood: v.mood } : {}),
    ...(v.seed !== undefined ? { seed: num(v.seed, "seed") } : {}),
    ...(v.speed ? { speed: num(v.speed, "speed") } : {}),
  };
  opts.media = await loadMedia(item, props);
  return opts;
}

function warn(list: string[], quiet?: boolean): void {
  if (quiet) return;
  for (const w of list) process.stderr.write(`warning: ${w}\n`);
}

const bytes = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

function progress(quiet?: boolean): ((done: number, total: number) => void) | undefined {
  if (quiet || !process.stderr.isTTY) return undefined;
  let last = -1;
  return (done, total) => {
    const pct = Math.floor((done / total) * 100);
    if (pct === last) return;
    last = pct;
    const w = 28;
    const fill = Math.round((done / total) * w);
    process.stderr.write(`\r  ${"█".repeat(fill)}${"░".repeat(w - fill)} ${String(pct).padStart(3)}%  ${done}/${total} frames`);
    if (done === total) process.stderr.write("\r\x1b[2K");
  };
}

async function main(argv: string[]): Promise<number> {
  const { values: v, positionals } = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  const [cmd, target, ...rest] = positionals;
  if (v.version) {
    process.stdout.write(`${packageVersion()}\n`);
    return 0;
  }
  if (!cmd || v.help || cmd === "help") {
    process.stdout.write(HELP);
    return 0;
  }
  if (rest.length) throw new MotionError(`unexpected "${rest.join(" ")}" — options start with --`);
  const lib = library(v.packs ?? []);
  const need = () => {
    if (!target) throw new MotionError(`${cmd} needs an item (see: monarc-motion list)`);
    return findItem(target, lib);
  };

  switch (cmd) {
    case "list": {
      if (v.category && !(CATEGORIES as readonly string[]).includes(v.category)) throw new MotionError(`--category is one of ${CATEGORIES.join(", ")}`);
      const items = searchItems({ search: v.search ?? target, category: v.category, pack: v.pack }, lib);
      if (v.json) {
        process.stdout.write(`${JSON.stringify(items.map(({ code: _c, ...m }) => m), null, 2)}\n`);
        return 0;
      }
      for (const p of lib.packs) {
        const mine = items.filter((i) => i.pack === p.id);
        if (!mine.length) continue;
        process.stdout.write(`\n${p.name} (${p.id} ${p.version}) — ${p.description}\n`);
        const w = Math.max(...mine.map((i) => i.id.length));
        for (const i of mine) process.stdout.write(`  ${i.id.padEnd(w)}  ${i.placement === "overlay" ? "overlay" : "full   "}  ${i.duration.default}s  ${i.name} — ${i.description}\n`);
      }
      if (!items.length) process.stdout.write("no items match\n");
      process.stdout.write("\n");
      return 0;
    }
    case "info": {
      const item = need();
      if (v.json) process.stdout.write(`${JSON.stringify(v.code ? item : (({ code: _c, ...m }) => m)(item), null, 2)}\n`);
      else process.stdout.write(`${describeItem(item)}${v.code ? `\n\ncode:\n${item.code}` : ""}\n`);
      return 0;
    }
    case "styles": {
      if (v.json) process.stdout.write(`${JSON.stringify(BUILTIN_STYLES.map(({ body: _b, ...s }) => s), null, 2)}\n`);
      else for (const s of BUILTIN_STYLES) process.stdout.write(`  ${s.name.padEnd(11)} ${s.mode.padEnd(5)} ${s.colors.accent}  ${s.description}\n`);
      return 0;
    }
    case "moves": {
      const vocab = { moves: MOVES, eases: [...EASES, "spring(f,d)", "steps(n)", "cubic(x1,y1,x2,y2)"], idles: IDLES, hits: HITS, moods: MOODS, splits: SPLITS, orders: ORDERS, directions: DIRECTIONS, origins: ORIGINS };
      if (v.json) {
        process.stdout.write(`${JSON.stringify({ ...vocab, notes: MOVE_NOTES }, null, 2)}\n`);
        return 0;
      }
      process.stdout.write("Moves (as in=…, or out=… to leave by the same move played backwards):\n");
      for (const m of MOVES) process.stdout.write(`  ${m.padEnd(11)} ${MOVE_NOTES[m]}\n`);
      process.stdout.write(`\nEases: ${vocab.eases.join(", ")}\nIdle loops (idle=…): ${IDLES.join(", ")}\nHits (emphasis=fx@time|beat|word, …): ${HITS.join(", ")}\nMoods (--mood): ${MOODS.join(", ")}\nText (split=…): ${SPLITS.join(", ")} · order=${ORDERS.join("|")} · stagger=seconds\nAlso: from=${DIRECTIONS.slice(0, 4).join("|")}… · distance=px · blur=true · dur=s · delay=s · intensity=0–2 · origin=… · keys=[{t,x,y,s,r,op,blur}]\n`);
      return 0;
    }
    case "render": {
      const item = need();
      const opts = await buildOptions(v, item);
      if (v.format && !(VIDEO_FORMATS as readonly string[]).includes(v.format)) throw new MotionError(`--format is one of ${VIDEO_FORMATS.join(", ")}`);
      const r = await renderVideo(item, { ...opts, ...(v.format ? { format: v.format as VideoFormat } : {}), ...(v.out ? { out: v.out } : {}), onProgress: progress(v.quiet) });
      warn(r.warnings, v.quiet);
      if (v.json) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
      else process.stdout.write(`${r.file}\n  ${r.format} · ${r.width}×${r.height} · ${r.fps} fps · ${r.duration.toFixed(2)} s · ${r.frames} frames (${r.drawn} drawn)${r.bytes ? ` · ${bytes(r.bytes)}` : ""} · ${(r.ms / 1000).toFixed(1)} s\n`);
      return 0;
    }
    case "still": {
      const item = need();
      const opts = await buildOptions(v, item);
      const format = v.format === "svg" || v.out?.endsWith(".svg") ? "svg" : "png";
      const out = v.out ?? `${item.id}.${format}`;
      const r = await renderStill(item, { ...opts, format, out, ...(v.t ? { t: num(v.t, "t") } : {}) });
      warn(r.warnings, v.quiet);
      process.stdout.write(v.json ? `${JSON.stringify({ file: r.file, format: r.format, width: r.width, height: r.height, t: r.t, warnings: r.warnings }, null, 2)}\n` : `${r.file}\n  ${r.width}×${r.height} at ${r.t.toFixed(2)} s\n`);
      return 0;
    }
    case "sheet": {
      const item = need();
      const opts = await buildOptions(v, item);
      const times = v.times ? v.times.split(",").map((s) => num(s.trim(), "times")!) : undefined;
      const r = await renderSheet(item, { ...opts, ...(times ? { times } : {}), ...(v.cols ? { cols: num(v.cols, "cols") } : {}) });
      const out = resolve(v.out ?? `${item.id}-sheet.png`);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, r.png);
      warn(r.warnings, v.quiet);
      process.stdout.write(v.json ? `${JSON.stringify({ file: out, times: r.times, warnings: r.warnings }, null, 2)}\n` : `${out}\n  ${r.times.length} frames at ${r.times.map((t) => t.toFixed(2)).join(", ")} s\n`);
      return 0;
    }
    case "check": {
      const item = need();
      const opts = await buildOptions(v, item);
      const rep = await checkItem(item, { ...opts, ...(v.aspect ? { aspects: [parseAspect(v.aspect)] } : {}) });
      process.stdout.write(v.json ? `${JSON.stringify(rep, null, 2)}\n` : `${describeReport(rep)}\n`);
      return rep.ok ? 0 : 1;
    }
    case "add": {
      const item = need();
      const dir = resolve(v.dir ?? "motion", item.id);
      if (existsSync(dir)) throw new MotionError(`${dir} already exists`);
      mkdirSync(dir, { recursive: true });
      const { code, pack: _p, ref: _r, ...manifest } = item;
      writeFileSync(join(dir, "item.json"), `${JSON.stringify(manifest, null, 2)}\n`);
      writeFileSync(join(dir, "frame.js"), code);
      process.stdout.write(`${dir}\n  edit frame.js, then: monarc-motion still ${JSON.stringify(dir)} — or render it the same way\n`);
      return 0;
    }
    case "new": {
      if (!target || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(target)) throw new MotionError("new needs an id: lowercase words joined by hyphens");
      const dir = resolve(v.dir ?? "motion", target);
      if (existsSync(dir)) throw new MotionError(`${dir} already exists`);
      cpSync(join(packsDir(), "..", "skill", "template"), dir, { recursive: true });
      const manifest = JSON.parse(readFileSync(join(dir, "item.json"), "utf8")) as Record<string, unknown>;
      manifest.id = target;
      manifest.name = target.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
      writeFileSync(join(dir, "item.json"), `${JSON.stringify(manifest, null, 2)}\n`);
      process.stdout.write(`${dir}\n  edit item.json and frame.js, then: monarc-motion sheet ${JSON.stringify(dir)}\n`);
      return 0;
    }
    case "api":
      process.stdout.write(`${MG_API_REFERENCE}\n\n${LIBRARY_GUIDE}\n`);
      return 0;
    case "guide":
      process.stdout.write(`${MOTION_GUIDE}\n\n${AUTHORING_GUIDE}\n`);
      return 0;
    case "mcp": {
      const { runMcpServer } = await import("./mcp.js");
      await runMcpServer({ packs: v.packs ?? [] });
      return -1;
    }
    default:
      throw new MotionError(`unknown command "${cmd}" — see monarc-motion --help`);
  }
}

main(process.argv.slice(2)).then(
  (code) => {
    if (code >= 0) process.exitCode = code;
  },
  (err: unknown) => {
    const e = err as Error;
    const known = e instanceof MotionError || e?.name === "ProgramError" || e?.name === "FfmpegMissing" || (e as { code?: string })?.code?.startsWith?.("ERR_PARSE_ARGS");
    process.stderr.write(`monarc-motion: ${known ? e.message : (e?.stack ?? String(err))}\n`);
    process.exitCode = 2;
  },
);

