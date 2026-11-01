import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bundleSpec, loadBundleFile } from "../src/node/bundle.js";
import { itemOfSpec, specToOptions } from "../src/node/spec.js";

const dirs: string[] = [];
const folder = () => {
  const d = mkdtempSync(join(tmpdir(), "volito-bundle-test-"));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe(".volito bundles", () => {
  it("packs a spec with its DESIGN.md and transcript, and unpacks it anywhere", () => {
    const src = folder();
    writeFileSync(join(src, "DESIGN.md"), "---\nname: acme\ncolors: { accent: \"#FF5A1F\" }\n---\n# Acme\n");
    writeFileSync(join(src, "words.json"), JSON.stringify([{ w: "Hello", s: 1, e: 1.3 }]));
    writeFileSync(join(src, "g.volito.json"), JSON.stringify({ volito: 1, item: "lower-third", props: { name: "Ada" }, style: "DESIGN.md", words: "words.json" }));
    const b = bundleSpec(join(src, "g.volito.json"));
    expect(Object.keys(b.files).sort()).toEqual(["DESIGN.md", "words.json"]);
    const out = join(folder(), "g.volito");
    writeFileSync(out, JSON.stringify(b));
    rmSync(src, { recursive: true, force: true });
    const loaded = loadBundleFile(out);
    const opts = specToOptions(loaded, itemOfSpec(loaded));
    expect(String(opts.style)).toMatch(/name: acme/);
    expect(opts.words?.[0]?.w).toBe("Hello");
  });

  it("refuses a bundle with a file outside its folder", () => {
    const out = join(folder(), "bad.volito");
    writeFileSync(out, JSON.stringify({ volito: 1, bundle: 1, spec: { volito: 1, item: "stat" }, files: { "../escape.txt": { text: "x" } } }));
    expect(() => loadBundleFile(out)).toThrow(/outside its folder/);
  });
});
