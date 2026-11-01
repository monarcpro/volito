/**
 * .volito bundles: a Graphic spec and every file it points at (a DESIGN.md, a program, a transcript, image
 * props) in one JSON file, so a graphic travels whole — to a teammate, a CI job, an agent or a server.
 * Every command takes a bundle where it takes a spec; it unpacks to a temporary folder and reads from there.
 *
 *   { "volito": 1, "bundle": 1, "spec": { …the spec, paths as written… }, "files": { "DESIGN.md": { "text": "…" }, "logo.png": { "base64": "…" } } }
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { MotionError } from "../pack.js";
import { type GraphicSpec, SPEC_VERSION } from "../spec.js";
import { type LoadedSpec, loadSpecFile } from "./spec.js";

export const BUNDLE_VERSION = 1;

export interface VolitoBundle {
  volito: number;
  bundle: number;
  spec: GraphicSpec;
  files: Record<string, { text: string } | { base64: string }>;
}

const TEXT = /\.(md|markdown|txt|js|mjs|json|svg)$/i;
const isUrl = (s: string) => /^(https?:|data:)/i.test(s);

/** The files a spec points at, as paths relative to its folder (only files that exist, never URLs). */
export function specFiles(spec: GraphicSpec, dir: string, imageProps: string[] = []): string[] {
  const out = new Set<string>();
  const add = (p: unknown) => {
    if (typeof p !== "string" || !p.trim() || isUrl(p)) return;
    const abs = isAbsolute(p) ? p : resolve(dir, p);
    if (existsSync(abs)) out.add(relative(dir, abs));
  };
  if (spec.style && /\.(md|markdown|txt)$/i.test(spec.style)) add(spec.style);
  if (spec.program) add(spec.program);
  if (typeof spec.words === "string") add(spec.words);
  for (const name of imageProps) add(spec.props?.[name]);
  return [...out];
}

/** Pack a spec file and the files it uses into one bundle. */
export function bundleSpec(specPath: string, imageProps: (spec: GraphicSpec, dir: string) => string[] = () => []): VolitoBundle {
  const loaded = loadSpecFile(specPath);
  const files: VolitoBundle["files"] = {};
  for (const rel of specFiles(loaded.spec, loaded.dir, imageProps(loaded.spec, loaded.dir))) {
    if (rel.startsWith("..") || isAbsolute(rel)) throw new MotionError(`${rel} is outside the spec's folder — move it next to the spec to bundle it`);
    const data = readFileSync(join(loaded.dir, rel));
    files[rel.split(sep).join("/")] = TEXT.test(rel) ? { text: data.toString("utf8") } : { base64: data.toString("base64") };
  }
  return { volito: SPEC_VERSION, bundle: BUNDLE_VERSION, spec: loaded.spec, files };
}

export function isBundleFile(path: string): boolean {
  return /\.volito$/i.test(path) && existsSync(resolve(path));
}

/** Unpack a bundle into a fresh temporary folder and load its spec from there. */
export function loadBundleFile(path: string): LoadedSpec {
  let doc: VolitoBundle;
  try {
    doc = JSON.parse(readFileSync(resolve(path), "utf8")) as VolitoBundle;
  } catch (e) {
    throw new MotionError(`${path} is not a Volito bundle: ${(e as Error).message}`);
  }
  if (doc?.bundle !== BUNDLE_VERSION || !doc.spec || typeof doc.files !== "object") throw new MotionError(`${path} is not a Volito bundle (version ${BUNDLE_VERSION})`);
  const dir = mkdtempSync(join(tmpdir(), "volito-bundle-"));
  for (const [name, f] of Object.entries(doc.files)) {
    const rel = normalize(name);
    if (isAbsolute(rel) || rel.startsWith("..") || rel.split(sep).includes("..")) throw new MotionError(`${path} has a file outside its folder (${name}); not unpacking it`);
    const out = join(dir, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, "text" in f ? f.text : Buffer.from(f.base64, "base64"));
  }
  const spec = join(dir, "graphic.volito.json");
  writeFileSync(spec, JSON.stringify(doc.spec));
  return loadSpecFile(spec);
}

/** A spec file or a bundle, whichever `path` is. */
export function loadAnySpec(path: string): LoadedSpec {
  return isBundleFile(path) ? loadBundleFile(path) : loadSpecFile(path);
}
