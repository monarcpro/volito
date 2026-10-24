/**
 * Bring the engine up to date with MONARC PRO's: the runtime, the sandbox source, the font
 * table and the brand styles live in MONARC PRO's core (packages/core/src) and are copied here into
 * src/engine/, so this repo stands alone and every graphic renders exactly as it does on a MONARC
 * timeline. graphics.ts comes without its editor-only helpers (reading words off a project's
 * timeline). Writes src/engine/SOURCE.json with the commit it came from.
 *
 *   node scripts/sync-engine.mjs [path/to/monarc]       (default: ../monarc)
 *   node scripts/sync-engine.mjs --check [path]         exit 1 when the copy differs from MONARC's
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const monarc = resolve(args.find((a) => !a.startsWith("--")) ?? join(root, "../monarc"));
const core = join(monarc, "packages/core/src");
const dest = join(root, "src/engine");
if (!existsSync(join(core, "graphics-runtime.ts"))) {
  console.error(`sync-engine: no MONARC core at ${core}`);
  process.exit(2);
}

const header = (file) => `// Synced from MONARC core (packages/core/src/${file}) by scripts/sync-engine.mjs. Change it there and sync.\n`;

/** graphics.ts without the editor's project model: its type imports become local aliases, the timeline helpers go. */
function graphics(src) {
  const imports = 'import type { ID, Project, Seconds, TranscriptSegment } from "./types.js";\nimport { clipEnd, clipsOnTrack, mainVideoTrack } from "./timeline.js";\n';
  if (!src.startsWith(imports)) throw new Error("graphics.ts: its first imports changed — update scripts/sync-engine.mjs");
  let out = src.slice(imports.length);
  const from = out.indexOf("/**\n * A segment's words with their times");
  const to = out.indexOf("// ---------------------------------------------------------------------------------------------\n// The sandbox the desktop runs a program in");
  if (from < 0 || to < 0 || to < from) throw new Error("graphics.ts: the timeline helpers moved — update scripts/sync-engine.mjs");
  out = out.slice(0, from) + out.slice(to);
  if (/\b(Project|TranscriptSegment|clipEnd|clipsOnTrack|mainVideoTrack)\b/.test(out)) throw new Error("graphics.ts: the engine now uses the project model — update scripts/sync-engine.mjs");
  return "/** Plain aliases for the editor's id and time types. */\ntype ID = string;\ntype Seconds = number;\n" + out;
}

const files = {
  "graphics-runtime.ts": (s) => s,
  "graphic-fonts.ts": (s) => s,
  "styles.ts": (s) => s,
  "graphics.ts": graphics,
};

let changed = 0;
mkdirSync(dest, { recursive: true });
for (const [file, transform] of Object.entries(files)) {
  const next = header(file) + transform(readFileSync(join(core, file), "utf8"));
  const path = join(dest, file);
  const prev = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (prev === next) continue;
  changed++;
  if (check) console.log(`differs: src/engine/${file}`);
  else writeFileSync(path, next);
}

let commit = "unknown";
try {
  commit = execFileSync("git", ["-C", monarc, "log", "-1", "--format=%H", "--", "packages/core/src/graphics-runtime.ts", "packages/core/src/graphics.ts", "packages/core/src/styles.ts", "packages/core/src/graphic-fonts.ts"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["-C", monarc, "status", "--porcelain", "--", ...Object.keys(files).map((f) => `packages/core/src/${f}`)], { encoding: "utf8" }).trim();
  if (dirty) commit += "+uncommitted";
} catch {
  /* not a git checkout */
}
if (check) {
  console.log(changed ? `sync-engine: ${changed} file(s) differ from MONARC ${commit}` : `sync-engine: in step with MONARC ${commit}`);
  process.exit(changed ? 1 : 0);
}
if (changed) writeFileSync(join(dest, "SOURCE.json"), `${JSON.stringify({ from: "MONARC packages/core/src", commit, files: Object.keys(files) }, null, 2)}\n`);
console.log(changed ? `sync-engine: ${changed} file(s) updated from MONARC ${commit}` : `sync-engine: already in step with MONARC ${commit}`);
