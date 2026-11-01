/**
 * The Graphic spec: one JSON document that says everything about one graphic — which item (or program),
 * its words, brand, shape, timing, motion and sound. The CLI, the Node API and the MCP server read it, and
 * the same spec renders the same frames anywhere. A recipe you can keep in a repo, diff, review and hand
 * to an agent or a teammate.
 *
 *   { "volito": 1, "item": "essentials/lower-third", "props": { "name": "Priya Sharma" }, "style": "ember", "aspect": "9:16" }
 *
 * "volito" is the format's major version: a new major only comes with a migration, and minor changes only
 * add optional fields. This module is pure (no Node APIs) so the browser player and editors can use it.
 */
import { z } from "zod";
import { MOODS } from "./kit.js";

export const SPEC_VERSION = 1;
export const SPEC_SCHEMA_URL = "https://volito.dev/schema/graphic.v1.json";
export const SPEC_FORMATS = ["mov", "hevc", "webm", "mp4", "gif", "png"] as const;

const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "a hex colour like #FF6A3D");

export const SpecColorsSchema = z
  .object({
    accent: hex,
    accent2: hex,
    ink: hex,
    paper: hex,
    surface: hex,
    mode: z.enum(["dark", "light"]),
    display: z.string().describe('A face as "Family:weight", e.g. "Fraunces:900"'),
    text: z.string(),
    mono: z.string(),
  })
  .partial()
  .strict();

export const SpecWordSchema = z.object({ w: z.string(), s: z.number(), e: z.number() }).strict();

export const GraphicSpecSchema = z
  .object({
    $schema: z.string().optional(),
    volito: z.literal(SPEC_VERSION).describe("The spec format's major version"),
    name: z.string().optional().describe("A label for people; not used to render"),
    item: z.string().optional().describe('A pack item: "essentials/lower-third", or its id "lower-third". Give item, program or code.'),
    program: z.string().optional().describe("A path to your own frame(t, $) program (.js), relative to this file"),
    code: z.string().optional().describe("Your own frame(t, $) program, inline"),
    placement: z.enum(["overlay", "full"]).optional().describe("For a program: overlay (transparent) or full (draws its own ground)"),
    props: z.record(z.string(), z.unknown()).optional().describe("The item's props; image props are paths relative to this file or URLs"),
    style: z.string().optional().describe("A built-in style name, or a DESIGN.md path relative to this file"),
    colors: SpecColorsSchema.optional().describe("Overrides on the style"),
    aspect: z.string().optional().describe('"16:9", "9:16", "1:1", "4:5" or "WIDTHxHEIGHT"'),
    duration: z.number().positive().max(600).optional().describe("Seconds; the item's default when omitted"),
    fps: z.number().int().min(1).max(120).optional(),
    width: z.number().int().min(16).max(8192).optional().describe("Output width in px; the height follows"),
    background: z.string().optional().describe('"transparent" (default where the format has alpha) or a colour drawn under the graphic'),
    words: z.union([z.array(SpecWordSchema), z.string()]).optional().describe("Spoken words with start/end seconds, or a transcript file ([{w,s,e}] or Whisper JSON) relative to this file"),
    offset: z.number().optional().describe("Where the graphic starts in the transcript, in seconds"),
    beats: z.record(z.string(), z.number()).optional().describe('Named moments, e.g. { "in": 0.4, "out": -0.6 }'),
    motion: z.record(z.string(), z.record(z.string(), z.unknown())).optional().describe('How each part moves: { "*": { "ease": "bouncy" }, "name": { "in": "typewriter" } }'),
    mood: z.enum(MOODS).optional(),
    seed: z.number().optional(),
    speed: z.number().positive().max(10).optional(),
    sound: z
      .union([z.boolean(), z.object({ bed: z.string().optional(), level: z.number().min(0).max(2).optional() }).strict()])
      .optional()
      .describe("true, or { bed: \"Dm\", level: 1 }: a track Volito synthesises, muxed into video"),
    render: z
      .object({ format: z.enum(SPEC_FORMATS).optional(), out: z.string().optional().describe("Output path, relative to where you run it") })
      .strict()
      .optional()
      .describe("Defaults for volito render; command-line flags win"),
  })
  .strict()
  .superRefine((s, ctx) => {
    const sources = [s.item, s.program, s.code].filter((x) => x !== undefined && x !== "").length;
    if (sources === 0) ctx.addIssue({ code: "custom", path: ["item"], message: "give item, program or code" });
    if (sources > 1) ctx.addIssue({ code: "custom", path: ["item"], message: "give only one of item, program and code" });
    if (s.placement && s.item) ctx.addIssue({ code: "custom", path: ["placement"], message: "placement is for a program or code; an item has its own" });
  });

export type GraphicSpec = z.infer<typeof GraphicSpecSchema>;

export interface SpecIssue {
  /** Where in the spec, as a JSON path ("props.name", "motion.plate.in"); "" for the whole document. */
  path: string;
  message: string;
}

const pathOf = (p: ReadonlyArray<PropertyKey>) => p.map(String).join(".");

/** Parse and check the shape of a spec (not the item it names). */
export function parseSpec(input: unknown): { spec: GraphicSpec | null; errors: SpecIssue[] } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { spec: null, errors: [{ path: "", message: "a spec is a JSON object" }] };
  const v = (input as { volito?: unknown }).volito;
  if (v === undefined) return { spec: null, errors: [{ path: "volito", message: `missing "volito": ${SPEC_VERSION} — the spec format's version` }] };
  if (v !== SPEC_VERSION) return { spec: null, errors: [{ path: "volito", message: `this Volito reads spec version ${SPEC_VERSION}; got ${JSON.stringify(v)}` }] };
  const r = GraphicSpecSchema.safeParse(input);
  if (r.success) return { spec: r.data, errors: [] };
  return {
    spec: null,
    errors: r.error.issues.map((i) => {
      const keys = (i as { keys?: string[] }).keys;
      if (i.code === "unrecognized_keys" && keys?.length) return { path: pathOf(i.path), message: `unknown field${keys.length > 1 ? "s" : ""} ${keys.map((k) => `"${k}"`).join(", ")}${suggest(keys[0]!)}` };
      return { path: pathOf(i.path), message: i.message };
    }),
  };
}

const FIELDS = ["$schema", "volito", "name", "item", "program", "code", "placement", "props", "style", "colors", "aspect", "duration", "fps", "width", "background", "words", "offset", "beats", "motion", "mood", "seed", "speed", "sound", "render"];

/** " — did you mean "x"?" for a field name that is a typo of a real one. */
function suggest(key: string): string {
  let best = "";
  let dist = 3;
  for (const f of FIELDS) {
    const d = editDistance(key.toLowerCase(), f.toLowerCase());
    if (d < dist) {
      dist = d;
      best = f;
    }
  }
  return best ? ` — did you mean "${best}"?` : "";
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length]!;
}

/** The spec format as a JSON Schema (draft 2020-12), for editors and other languages. */
export function specJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(GraphicSpecSchema, { target: "draft-2020-12", unrepresentable: "any" }) as Record<string, unknown>;
  return { $id: SPEC_SCHEMA_URL, title: "Volito Graphic spec", description: "One motion graphic: the item or program, its props, brand, shape, timing, motion and sound.", ...schema };
}
