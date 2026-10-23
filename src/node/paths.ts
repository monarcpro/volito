import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_NAME = "@monarcpro/motion";

let root: string | null = null;

/** The package's own folder (fonts/, packs/ sit there) — found from this file, built or not. */
export function packageRoot(): string {
  if (root) return root;
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const pj = join(dir, "package.json");
    if (existsSync(pj)) {
      try {
        if ((JSON.parse(readFileSync(pj, "utf8")) as { name?: string }).name === PACKAGE_NAME) return (root = dir);
      } catch {
        /* not ours */
      }
    }
    dir = dirname(dir);
  }
  throw new Error(`${PACKAGE_NAME}: cannot find its package folder from ${fileURLToPath(import.meta.url)}`);
}

export const fontsDir = (): string => join(packageRoot(), "fonts");
export const packsDir = (): string => join(packageRoot(), "packs");
export const libsDir = (): string => join(packageRoot(), "libs");

export function packageVersion(): string {
  return (JSON.parse(readFileSync(join(packageRoot(), "package.json"), "utf8")) as { version: string }).version;
}
