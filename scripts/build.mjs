/**
 * Build the publishable package into dist/: the Node API, the CLI and the MCP server (ESM, one
 * shared chunk), the browser player, type declarations, and registry.json (every pack's items
 * and code, for the browser player and the gallery).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { rollup } from "rollup";
import { dts } from "rollup-plugin-dts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const external = Object.keys(pkg.dependencies ?? {});
const node = await esbuild.build({
  absWorkingDir: root,
  entryPoints: { index: "src/index.ts", cli: "src/cli.ts", mcp: "src/mcp.ts" },
  outdir: dist,
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "node",
  target: "node20",
  external,
  legalComments: "none",
  chunkNames: "chunks/[name]-[hash]",
  metafile: true,
  logLevel: "warning",
});
const cli = join(dist, "cli.js");
writeFileSync(cli, `#!/usr/bin/env node\n${readFileSync(cli, "utf8")}`, { mode: 0o755 });

const browser = await esbuild.build({
  absWorkingDir: root,
  entryPoints: { browser: "src/browser/index.ts" },
  outdir: dist,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  define: { __MOTION_VERSION__: JSON.stringify(pkg.version), __MOTION_NAME__: JSON.stringify(pkg.name) },
  legalComments: "none",
  metafile: true,
  logLevel: "warning",
});

// Declarations: tsc writes every file's into .types/, then rollup-plugin-dts folds each entry into one
// file holding only the types the public API reaches.
const types = join(root, ".types");
rmSync(types, { recursive: true, force: true });
execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", join(root, "tsconfig.build.json")], { stdio: "inherit" });
for (const [entry, file] of [["src/index.d.ts", "index.d.ts"], ["src/browser/index.d.ts", "browser.d.ts"]]) {
  const bundle = await rollup({ input: join(types, entry), plugins: [dts({ respectExternal: false })], external: external.concat(["fontkit"]), onwarn: (w, warn) => (w.code === "UNUSED_EXTERNAL_IMPORT" ? undefined : warn(w)) });
  await bundle.write({ file: join(dist, file), format: "es" });
  await bundle.close();
}
rmSync(types, { recursive: true, force: true });

// The registry: what a browser needs to list and play every item without the filesystem.
const { library, packageVersion } = await import(join(dist, "index.js"));
const lib = library();
const libs = {};
for (const f of readdirSync(join(root, "libs")).filter((f) => f.endsWith(".js"))) libs[f.replace(/\.js$/, "")] = readFileSync(join(root, "libs", f), "utf8");
const registry = {
  format: 1,
  package: pkg.name,
  version: packageVersion(),
  packs: lib.packs.map(({ entries, ...p }) => ({ ...p, entries })),
  libs,
};
writeFileSync(join(dist, "registry.json"), JSON.stringify(registry));

const size = (m) => Object.values(m.outputs).reduce((a, o) => a + o.bytes, 0);
console.log(`build: dist/ — node ${(size(node.metafile) / 1e3).toFixed(0)} KB · browser ${(size(browser.metafile) / 1e3).toFixed(0)} KB · ${lib.items.length} items in ${lib.packs.length} pack(s)`);
