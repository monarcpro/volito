/**
 * The MCP server: MONARC Motion as tools an agent can call — find a graphic, read its props, see
 * it (a contact sheet comes back as an image), check it, render it to a file. An agent can also
 * write its own program against the API (motion_api) and preview, check and render that the same
 * way. Runs on stdio:  monarc-motion mcp   (claude mcp add monarc-motion -- npx -y @monarcpro/motion mcp)
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BUILTIN_STYLES, MG_API_REFERENCE } from "./engine.js";
import { AUTHORING_GUIDE, MOTION_GUIDE } from "./guide.js";
import { DIRECTIONS, EASES, HITS, IDLES, MOODS, MOVES, MOVE_NOTES, ORDERS, ORIGINS, SPLITS } from "./kit.js";
import { ASPECT_NAMES, CATEGORIES, type MotionItem, customItem, describeItem, parseAspect } from "./pack.js";
import { checkItem, describeReport } from "./node/check.js";
import { loadMedia, normalizeWords, readWords } from "./node/inputs.js";
import { type Library, findItem, library, searchItems } from "./node/packs.js";
import { packageVersion } from "./node/paths.js";
import { FORMAT_NOTES, type RenderOptions, VIDEO_FORMATS, type VideoFormat, renderSheet, renderStill, renderVideo } from "./node/render.js";

const source = {
  item: z.string().optional().describe('A pack item: "essentials/lower-third", or its id "lower-third" (motion_list shows them). Give this or `code`.'),
  code: z.string().optional().describe("Your own program: plain JavaScript defining function frame(t, $) that returns SVG markup (see motion_api). Give this or `item`."),
  placement: z.enum(["overlay", "full"]).optional().describe("For `code`: overlay (transparent, over footage) or full (draws its own ground)."),
};

const look = {
  props: z.record(z.string(), z.unknown()).optional().describe("The item's props (motion_info lists them), e.g. { name: 'Priya Sharma', role: 'Product designer' }. For `code`, any data the program reads as $.data."),
  style: z.string().optional().describe(`A built-in brand style (${BUILTIN_STYLES.map((s) => s.name).join(", ")}), a path to a DESIGN.md, or DESIGN.md text.`),
  colors: z
    .object({ accent: z.string(), accent2: z.string(), ink: z.string(), paper: z.string(), surface: z.string(), mode: z.enum(["dark", "light"]), display: z.string(), text: z.string(), mono: z.string() })
    .partial()
    .optional()
    .describe('Overrides on the style: hex colours for accent / accent2 / ink (darkest) / paper (lightest) / surface, mode, and faces like "Poppins:800".'),
  aspect: z.string().optional().describe(`${ASPECT_NAMES.join(", ")} or WIDTHxHEIGHT. Default 16:9.`),
  duration: z.number().positive().optional().describe("Seconds (the item's default when omitted)."),
  words: z.array(z.object({ w: z.string(), s: z.number(), e: z.number() })).optional().describe("Words spoken over the graphic with their start/end seconds — text lands on them."),
  wordsFile: z.string().optional().describe("A transcript file instead of `words` ([{w,s,e}] or Whisper JSON)."),
  beats: z.record(z.string(), z.number()).optional().describe('Named moments to move, e.g. { "in": 0.4, "out": -0.6 } (negative counts from the end).'),
  motion: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .optional()
    .describe('How each part moves — keys are part names from motion_info, or "*" for every part: { "*": { "ease": "bouncy" }, "name": { "in": "typewriter" }, "plate": { "in": "iris", "out": "wipe", "from": "right" }, "role": { "emphasis": "pulse@2" } }. Settings: in, out (moves from motion_moves), ease, dur, outDur, from, outFrom, distance, blur, idle, emphasis, keys, delay, at, outAt, intensity, origin, split, order, stagger, outStagger.'),
  mood: z.enum(MOODS).optional().describe("A choreography mood: the moves, eases and idles a seed draws from."),
  seed: z.number().optional().describe("A new choreography for every number; the same number always moves the same way. Try several."),
  speed: z.number().positive().optional().describe("Every move faster (2) or slower (0.5)."),
};

type Args = {
  motion?: Record<string, Record<string, unknown>>;
  mood?: string;
  seed?: number;
  speed?: number;
  item?: string;
  code?: string;
  placement?: "overlay" | "full";
  props?: Record<string, unknown>;
  style?: string;
  colors?: Record<string, string>;
  aspect?: string;
  duration?: number;
  words?: Array<{ w: string; s: number; e: number }>;
  wordsFile?: string;
  beats?: Record<string, number>;
};

function pick(lib: Library, a: Args): MotionItem {
  if (a.code?.trim()) return customItem(a.code, { placement: a.placement, duration: a.duration });
  if (!a.item) throw new Error("give `item` (see motion_list) or `code` (see motion_api)");
  return findItem(a.item, lib);
}

function styleOf(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const path = resolve(s);
  if (!/\n/.test(s) && /\.(md|markdown|txt)$/i.test(s) && existsSync(path)) return readFileSync(path, "utf8");
  return s;
}

async function optionsOf(item: MotionItem, a: Args): Promise<RenderOptions> {
  const words = a.words?.length ? normalizeWords(a.words) : a.wordsFile ? readWords(a.wordsFile) : undefined;
  return {
    props: a.props ?? {},
    ...(a.style ? { style: styleOf(a.style) } : {}),
    ...(a.colors ? { colors: a.colors } : {}),
    ...(a.aspect ? { aspect: parseAspect(a.aspect) } : {}),
    ...(a.duration ? { duration: a.duration } : {}),
    ...(words?.length ? { words } : {}),
    ...(a.beats ? { beats: a.beats } : {}),
    ...(a.motion ? { motion: a.motion } : {}),
    ...(a.mood ? { mood: a.mood } : {}),
    ...(a.seed !== undefined ? { seed: a.seed } : {}),
    ...(a.speed ? { speed: a.speed } : {}),
    media: await loadMedia(item, a.props ?? {}),
  };
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const failure = (err: unknown) => ({ isError: true, content: [{ type: "text" as const, text: String((err as Error)?.message ?? err) }] });
const warnings = (w: string[]) => (w.length ? `\nWarnings:\n${w.map((x) => `- ${x}`).join("\n")}` : "");

export function createMcpServer(opts: { packs?: string[] } = {}): McpServer {
  const lib = () => library(opts.packs ?? []);
  const server = new McpServer({ name: "monarc-motion", version: packageVersion() }, { instructions: "MONARC Motion renders brand-aware motion graphics (lower thirds, titles, CTAs, stats, lists, end cards…) to video files with alpha. Find one with motion_list, read its props and parts with motion_info, look at it with motion_preview (a contact sheet image), then motion_render to a file. Motion is open-ended: any part takes any move, ease, idle, emphasis or keyframes (motion_moves lists them) through `motion`, and `mood` + `seed` give a new choreography for every seed. To make something no item covers, write a program against motion_api and use the same tools with `code`." });

  server.registerTool(
    "motion_list",
    { title: "List motion graphics", description: "The graphics in the packs: ref, overlay or full frame, default length, what it is.", inputSchema: { search: z.string().optional().describe("Words to match (e.g. 'name', 'subscribe', 'chart')."), category: z.enum(CATEGORIES).optional() } },
    async ({ search, category }) => {
      try {
        const items = searchItems({ search, category }, lib());
        return text(items.length ? items.map((i) => `${i.ref} · ${i.placement} · ${i.duration.default}s — ${i.name}: ${i.description}`).join("\n") : "No items match.");
      } catch (err) {
        return failure(err);
      }
    },
  );

  server.registerTool(
    "motion_info",
    { title: "Describe a motion graphic", description: "Everything about one item: what it shows, its length, aspects and every prop with its type and default. `code: true` adds its source (to learn from or adapt).", inputSchema: { item: z.string(), code: z.boolean().optional() } },
    async ({ item, code }) => {
      try {
        const it = findItem(item, lib());
        return text(`${describeItem(it)}${code ? `\n\nSource:\n${it.code}` : ""}`);
      } catch (err) {
        return failure(err);
      }
    },
  );

  server.registerTool(
    "motion_styles",
    { title: "List brand styles", description: "The built-in brand styles (colour roles, faces, motion feel). Any style can be replaced by a DESIGN.md, or tuned with `colors`.", inputSchema: {} },
    async () => text(BUILTIN_STYLES.map((s) => `${s.name} (${s.mode}) — ${s.description} · accent ${s.colors.accent}, accent2 ${s.colors.accent2}, ink ${s.colors.ink}, paper ${s.colors.paper} · display ${s.fonts.display}, text ${s.fonts.text}`).join("\n")),
  );

  server.registerTool(
    "motion_moves",
    { title: "List motion settings", description: "Every move (entrances, and exits as the same move played backwards), ease, idle loop, emphasis hit, mood, text split and order the `motion` settings take. Any part of any graphic can use any of them.", inputSchema: {} },
    async () =>
      text(
        [
          "Moves (in / out):",
          ...MOVES.map((m) => `  ${m} — ${MOVE_NOTES[m]}`),
          `Eases: ${[...EASES, "spring(f,d)", "steps(n)", "cubic(x1,y1,x2,y2)"].join(", ")}`,
          `Idle loops: ${IDLES.join(", ")}`,
          `Emphasis hits (fx@time | fx@beat | fx@spokenWord): ${HITS.join(", ")}`,
          `Moods: ${MOODS.join(", ")} (with seed: a new choreography per number)`,
          `Text: split ${SPLITS.join(" | ")} · order ${ORDERS.join(" | ")} · stagger seconds`,
          `Directions (from / outFrom): ${DIRECTIONS.join(", ")} · origins: ${ORIGINS.join(", ")}`,
          "",
          MOTION_GUIDE,
        ].join("\n"),
      ),
  );

  server.registerTool(
    "motion_preview",
    { title: "Preview a motion graphic", description: "A contact sheet: frames across the graphic's time in one image, so you can see how it moves and whether the text fits. Overlays are shown on a grey stand-in for footage.", inputSchema: { ...source, ...look, times: z.array(z.number()).optional().describe("Clip seconds to show (8 spread across it by default).") } },
    async (a) => {
      try {
        const item = pick(lib(), a as Args);
        const r = await renderSheet(item, { ...(await optionsOf(item, a as Args)), ...(a.times?.length ? { times: a.times } : {}) });
        return { content: [{ type: "image" as const, data: r.png.toString("base64"), mimeType: "image/png" }, { type: "text" as const, text: `${item.ref} at ${r.times.map((t) => `${t.toFixed(2)}s`).join(", ")}${warnings(r.warnings)}` }] };
      } catch (err) {
        return failure(err);
      }
    },
  );

  server.registerTool(
    "motion_still",
    { title: "Render one frame", description: "One frame as a PNG (alpha kept), returned as an image and written to `out` when given.", inputSchema: { ...source, ...look, t: z.number().optional().describe("Clip seconds (mid-hold by default)."), out: z.string().optional() } },
    async (a) => {
      try {
        const item = pick(lib(), a as Args);
        const r = await renderStill(item, { ...(await optionsOf(item, a as Args)), ...(a.t !== undefined ? { t: a.t } : {}), ...(a.out ? { out: a.out } : {}) });
        return { content: [{ type: "image" as const, data: r.data.toString("base64"), mimeType: "image/png" }, { type: "text" as const, text: `${r.file ?? item.ref} · ${r.width}×${r.height} at ${r.t.toFixed(2)} s${warnings(r.warnings)}` }] };
      } catch (err) {
        return failure(err);
      }
    },
  );

  server.registerTool(
    "motion_check",
    { title: "Check a motion graphic", description: "Runs it frame by frame at each aspect and reports errors (throws, SVG that does not parse, a graphic that draws nothing) and warnings (text running off the frame, words never spoken, props that do not fit). Use it in a write → check → preview loop.", inputSchema: { ...source, ...look } },
    async (a) => {
      try {
        const item = pick(lib(), a as Args);
        const opts = await optionsOf(item, a as Args);
        const rep = await checkItem(item, { ...opts, ...(a.aspect ? { aspects: [parseAspect(a.aspect)] } : {}) });
        return text(describeReport(rep));
      } catch (err) {
        return failure(err);
      }
    },
  );

  server.registerTool(
    "motion_render",
    {
      title: "Render a motion graphic",
      description: `Render to a file. Formats: ${VIDEO_FORMATS.map((f) => `${f} — ${FORMAT_NOTES[f]}`).join("; ")}. Returns the file's path.`,
      inputSchema: {
        ...source,
        ...look,
        format: z.enum(VIDEO_FORMATS).optional().describe("mov (ProRes 4444 with alpha) by default."),
        out: z.string().optional().describe("Output path (relative to the server's working folder). Default: motion-renders/<id>-<size>.<ext>."),
        fps: z.number().int().min(1).max(120).optional(),
        width: z.number().int().min(16).max(8192).optional().describe("Output width px (height follows)."),
        background: z.string().optional().describe('"#000000" draws a ground under the graphic; "transparent" keeps alpha.'),
      },
    },
    async (a) => {
      try {
        const item = pick(lib(), a as Args);
        const opts = await optionsOf(item, a as Args);
        const format = (a.format ?? "mov") as VideoFormat;
        const r = await renderVideo(item, { ...opts, format, ...(a.out ? { out: a.out } : { outDir: "motion-renders" }), ...(a.fps ? { fps: a.fps } : {}), ...(a.width ? { width: a.width } : {}), ...(a.background ? { background: a.background } : {}) });
        return text(`Rendered ${r.file}\n${r.format} · ${r.width}×${r.height} · ${r.fps} fps · ${r.duration.toFixed(2)} s · ${r.frames} frames${r.bytes ? ` · ${(r.bytes / 1e6).toFixed(1)} MB` : ""} · took ${(r.ms / 1000).toFixed(1)} s${warnings(r.warnings)}`);
      } catch (err) {
        return failure(err);
      }
    },
  );

  server.registerTool(
    "motion_api",
    { title: "Program API", description: "How to write your own graphic: the frame(t, $) contract, the whole $ runtime (timing, motion, text, shapes, cards, charts, art styles, brand colours and faces) and how items and packs are laid out. Read before passing `code`.", inputSchema: {} },
    async () => text(`${MG_API_REFERENCE}\n\n${MOTION_GUIDE}\n\n${AUTHORING_GUIDE}`),
  );

  return server;
}

export async function runMcpServer(opts: { packs?: string[] } = {}): Promise<void> {
  const server = createMcpServer(opts);
  await server.connect(new StdioServerTransport());
}
