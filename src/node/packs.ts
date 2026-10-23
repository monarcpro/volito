/**
 * Packs on disk: the ones this package ships (packs/), any folders a caller adds (a team's own
 * library), and single items — a folder with item.json + frame.js, or a .js file holding a
 * program someone wrote. An item is named by its ref ("essentials/lower-third"), by its id alone
 * when only one pack has it, or by a path.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { type ItemManifest, type MotionItem, type MotionPack, type PackManifest, MOTION_FORMAT, MotionError, customItem, makeItem } from "../pack.js";
import { packsDir } from "./paths.js";
import "./setup.js";

const readJson = <T>(file: string): T => {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch (err) {
    throw new MotionError(`${file}: ${(err as Error).message}`);
  }
};

/** One pack folder: pack.json, the shared helpers, an item folder per id. */
export function loadPack(dir: string): MotionPack {
  const manifest = readJson<PackManifest>(join(dir, "pack.json"));
  if (manifest.format !== MOTION_FORMAT) throw new MotionError(`${dir}: pack format ${manifest.format} — this version reads format ${MOTION_FORMAT}`);
  const shared = manifest.shared ? readFileSync(join(dir, manifest.shared), "utf8") : "";
  const entries = manifest.items.map((id) => {
    const itemDir = join(dir, id);
    const m = readJson<ItemManifest>(join(itemDir, "item.json"));
    if (m.id !== id) throw new MotionError(`${itemDir}: item.json id "${m.id}" does not match its folder`);
    return makeItem(manifest.id, m, readFileSync(join(itemDir, "frame.js"), "utf8"), shared);
  });
  return { ...manifest, entries };
}

let builtin: MotionPack[] | null = null;

/** The packs that ship with MONARC Motion. */
export function builtinPacks(): MotionPack[] {
  if (builtin) return builtin;
  const dir = packsDir();
  // Essentials first, then the rest in the order they are shown, then any others by name.
  const order = ["essentials", "broadcast", "social", "data", "3d", "transitions", "annotate", "type", "backdrops", "promo"];
  const rank = (d: string) => (order.includes(d) ? order.indexOf(d) : order.length);
  builtin = existsSync(dir)
    ? readdirSync(dir)
        .filter((d) => existsSync(join(dir, d, "pack.json")))
        .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
        .map((d) => loadPack(join(dir, d)))
    : [];
  return builtin;
}

/** Packs in extra folders: each folder is a pack, or holds packs one level down. */
export function packsIn(dirs: string[]): MotionPack[] {
  const out: MotionPack[] = [];
  for (const raw of dirs) {
    const dir = resolve(raw);
    if (existsSync(join(dir, "pack.json"))) out.push(loadPack(dir));
    else if (existsSync(dir) && statSync(dir).isDirectory()) for (const d of readdirSync(dir).sort()) if (existsSync(join(dir, d, "pack.json"))) out.push(loadPack(join(dir, d)));
  }
  return out;
}

export interface Library {
  packs: MotionPack[];
  items: MotionItem[];
}

/** The built-in packs plus any extra folders (MONARC_MOTION_PACKS, ":"-separated, adds more). */
export function library(extraDirs: string[] = []): Library {
  const env = (process.env.MONARC_MOTION_PACKS ?? "").split(":").filter(Boolean);
  const packs = [...builtinPacks(), ...packsIn([...env, ...extraDirs])];
  const seen = new Set<string>();
  for (const p of packs) {
    if (seen.has(p.id)) throw new MotionError(`two packs are named "${p.id}"`);
    seen.add(p.id);
  }
  return { packs, items: packs.flatMap((p) => p.entries) };
}

/** An item by ref, id or path (an item folder, or a .js program file). */
export function findItem(name: string, lib: Library = library()): MotionItem {
  const n = name.trim();
  const byRef = lib.items.find((i) => i.ref === n);
  if (byRef) return byRef;
  const path = resolve(n);
  if (existsSync(path)) {
    if (statSync(path).isDirectory() && existsSync(join(path, "item.json"))) {
      const m = readJson<ItemManifest>(join(path, "item.json"));
      const shared = existsSync(join(path, "shared.js")) ? readFileSync(join(path, "shared.js"), "utf8") : "";
      return makeItem("local", m, readFileSync(join(path, "frame.js"), "utf8"), shared);
    }
    if (/\.(m?js|txt)$/.test(path)) return customItem(readFileSync(path, "utf8"), { id: basename(path).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") });
  }
  const byId = lib.items.filter((i) => i.id === n);
  if (byId.length === 1) return byId[0]!;
  if (byId.length > 1) throw new MotionError(`"${n}" is in more than one pack: ${byId.map((i) => i.ref).join(", ")}`);
  // Closest first: ids that start with the words, then ids that hold them, then names and tags that do.
  const q = n.toLowerCase();
  const score = (i: MotionItem) => (i.id.startsWith(q) ? 0 : i.id.includes(q) || q.includes(i.id) ? 1 : i.name.toLowerCase().includes(q) ? 2 : (i.tags ?? []).some((t) => t.includes(q)) ? 3 : 9);
  const near = lib.items.map((i) => ({ ref: i.ref, s: score(i) })).filter((r) => r.s < 9).sort((a, b) => a.s - b.s).map((r) => r.ref);
  throw new MotionError(`no item "${n}"${near.length ? ` — did you mean ${near.slice(0, 4).join(", ")}?` : ""} (list them with: monarc-motion list)`);
}

export interface ItemQuery {
  category?: string;
  pack?: string;
  placement?: string;
  /** Words matched against the id, name, description and tags. */
  search?: string;
}

export function searchItems(q: ItemQuery = {}, lib: Library = library()): MotionItem[] {
  const words = (q.search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return lib.items.filter((i) => {
    if (q.category && i.category !== q.category) return false;
    if (q.pack && i.pack !== q.pack) return false;
    if (q.placement && i.placement !== q.placement) return false;
    if (!words.length) return true;
    const hay = [i.id, i.name, i.description, i.category, ...(i.tags ?? [])].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
