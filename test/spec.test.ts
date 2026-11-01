import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { itemOfSpec, specFrom, specToOptions, validateSpec } from "../src/node/spec.js";
import { parseSpec, specJsonSchema } from "../src/spec.js";

const dirs: string[] = [];
const folder = () => {
  const d = mkdtempSync(join(tmpdir(), "volito-spec-"));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("Graphic spec", () => {
  it("accepts a plain spec and rejects a missing or newer version", () => {
    expect(parseSpec({ volito: 1, item: "lower-third", props: { name: "Ada" }, aspect: "9:16" }).errors).toEqual([]);
    expect(parseSpec({ item: "lower-third" }).errors[0]?.message).toMatch(/missing "volito": 1/);
    expect(parseSpec({ volito: 2, item: "x" }).errors[0]?.message).toMatch(/reads spec version 1/);
    expect(parseSpec([1]).errors[0]?.message).toMatch(/JSON object/);
  });

  it("names unknown fields and suggests the right one", () => {
    const r = parseSpec({ volito: 1, item: "stat", prop: { value: 3 } });
    expect(r.spec).toBeNull();
    expect(r.errors[0]?.message).toMatch(/unknown field "prop" — did you mean "props"\?/);
  });

  it("wants exactly one of item, program and code", () => {
    expect(parseSpec({ volito: 1 }).errors.map((e) => e.message)).toContain("give item, program or code");
    expect(parseSpec({ volito: 1, item: "stat", code: "function frame(){return ''}" }).errors.map((e) => e.message)).toContain("give only one of item, program and code");
  });

  it("checks a spec against its item: props that do not fit, unknown parts, styles, files", () => {
    const rep = validateSpec({
      volito: 1,
      item: "essentials/lower-third",
      props: { name: "A name far too long to ever fit on this plate at all", nickname: "x" },
      motion: { nope: { in: "pop" } },
      style: "embr",
      words: "missing.json",
    });
    expect(rep.ok).toBe(false);
    expect(rep.errors.map((e) => e.path)).toEqual(["style", "words"]);
    const w = rep.warnings.map((x) => `${x.path}: ${x.message}`).join("\n");
    expect(w).toMatch(/props\.nickname: unknown prop "nickname"/);
    expect(w).toMatch(/props\.name: name is \d+ characters/);
    expect(w).toMatch(/motion: .*unknown part "nope"/);
    expect(validateSpec({ volito: 1, item: "lower-thrid" }).errors[0]?.message).toMatch(/no item "lower-thrid"/);
  });

  it("turns a spec into render options with paths relative to the spec", () => {
    const dir = folder();
    writeFileSync(join(dir, "DESIGN.md"), "---\nname: acme\ncolors: { accent: \"#FF5A1F\" }\n---\n# Acme\n");
    writeFileSync(join(dir, "words.json"), JSON.stringify([{ w: "Hello", s: 10.2, e: 10.5 }]));
    const spec = { volito: 1 as const, item: "lower-third", props: { name: "Ada" }, style: "DESIGN.md", words: "words.json", offset: 10, aspect: "1:1", mood: "playful" as const, seed: 3, sound: { bed: "Dm" } };
    expect(validateSpec(spec, { dir }).ok).toBe(true);
    const loaded = { spec, dir };
    const opts = specToOptions(loaded, itemOfSpec(loaded));
    expect(opts.props).toEqual({ name: "Ada" });
    expect(String(opts.style)).toMatch(/name: acme/);
    expect(opts.words?.[0]?.s).toBeCloseTo(0.2);
    expect(opts.aspect).toBe("1:1");
    expect(opts.sound).toBe(true);
    expect(opts.bed).toBe("Dm");
  });

  it("runs a program from a file next to the spec", () => {
    const dir = folder();
    writeFileSync(join(dir, "badge.js"), "function frame(t, $) { return `<rect width='10' height='10'/>`; }");
    const loaded = { spec: { volito: 1 as const, program: "badge.js", placement: "full" as const, duration: 2 }, dir };
    const item = itemOfSpec(loaded);
    expect(item.id).toBe("badge");
    expect(item.placement).toBe("full");
  });

  it("writes specs without empty fields, and publishes a JSON Schema", () => {
    expect(specFrom({ item: "stat", props: {}, colors: {}, aspect: "9:16" })).toEqual({ $schema: "https://volito.dev/schema/graphic.v1.json", volito: 1, item: "stat", aspect: "9:16" });
    const schema = specJsonSchema();
    expect(schema.$id).toBe("https://volito.dev/schema/graphic.v1.json");
    expect(Object.keys((schema.properties as Record<string, unknown>) ?? {})).toEqual(expect.arrayContaining(["volito", "item", "props", "motion", "sound", "render"]));
  });
});
