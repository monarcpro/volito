import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import * as fontkit from "fontkit";
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { BUILTIN_STYLES, PATTERN_NAMES, buildProgram, checkItem, composeDesignMd, customItem, findItem, frameDocument, library, normalizeWords, openSession, parseAspect, renderSheet, renderStill, renderVideo, resolveProps, resolveStyle } from "../src/index.js";
import { createMcpServer } from "../src/mcp.js";
import { allFaces, measureText as measureTextForTest } from "../src/node/fonts.js";
import { pathDataLength, resolvePathLength } from "../src/node/pathlength.js";
import { outlineText } from "../src/node/outline.js";
import { ProgramRunner } from "../src/node/sandbox.js";
import { fontsDir } from "../src/node/paths.js";
import { probeFfmpeg } from "../src/node/ffmpeg.js";
import { ASPECT_NAMES, MotionError, makeItem } from "../src/pack.js";
import { HITS, IDLES, MOODS, MOVES, normalizeMotion, parseMotionArgs } from "../src/kit.js";
import { normalizeProgram, programEnv } from "../src/engine.js";

const tmp = mkdtempSync(join(tmpdir(), "monarc-motion-test-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** RGBA pixels of a PNG (drawn through resvg, premultiplied). */
function pixels(png: Buffer, w: number, h: number): Uint8Array {
  return new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image width="${w}" height="${h}" href="data:image/png;base64,${png.toString("base64")}"/></svg>`).render().pixels;
}

describe("fonts", () => {
  it("ships every face the runtime knows, each named for its family and weight", () => {
    const faces = allFaces();
    expect(faces.length).toBeGreaterThan(100);
    for (const fam of ["Inter", "Space Grotesk", "Space Mono", "Poppins", "Playfair Display", "Anton", "Press Start 2P", "IM Fell English"]) expect(faces.some((f) => f.family === fam && f.subset === "latin")).toBe(true);
    expect(faces.some((f) => f.family === "Poppins" && f.subset === "devanagari")).toBe(true);
    for (const f of faces.filter((x) => x.family === "Inter" || x.subset === "devanagari")) {
      const font = fontkit.create(readFileSync(join(fontsDir(), f.file))) as fontkit.Font & { name: { records: { preferredFamily?: { en: string } } }; "OS/2": { usWeightClass: number } };
      // The typographic family (name ID 16) is what a renderer matches; the weight class carries the weight.
      expect(font.name.records.preferredFamily?.en ?? font.familyName).toBe(f.face);
      expect(font["OS/2"].usWeightClass).toBe(f.weight);
    }
    expect(existsSync(join(fontsDir(), "licenses", "inter.txt"))).toBe(true);
  });

  it("measures like a browser: heavier is wider, kerning applies, other scripts use their own cut", () => {
    const w700 = measureTextForTest("700 100px 'Inter', Helvetica", "Hello");
    const w900 = measureTextForTest("900 100px 'Inter', Helvetica", "Hello");
    expect(w700).toBeGreaterThan(200);
    expect(w900).toBeGreaterThan(w700);
    expect(measureTextForTest("700 100px 'Inter'", "AV")).toBeLessThan(measureTextForTest("700 100px 'Inter'", "A") + measureTextForTest("700 100px 'Inter'", "V"));
    // Cyrillic in Space Mono (which has none) is measured in Inter's Cyrillic cut, not as missing glyphs.
    expect(measureTextForTest("700 30px 'Space Mono'", "Хорошо")).toBeGreaterThan(80);
    expect(measureTextForTest("800 60px 'Poppins'", "प्रिया शर्मा")).toBeGreaterThan(200);
  });
});

describe("packs", () => {
  const lib = library();

  it("loads the built-in Essentials pack with every item valid", () => {
    const pack = lib.packs.find((p) => p.id === "essentials")!;
    expect(pack).toBeTruthy();
    expect(pack.entries.length).toBe(pack.items.length);
    expect(pack.entries.length).toBeGreaterThanOrEqual(14);
    for (const item of pack.entries) {
      expect(item.ref).toBe(`essentials/${item.id}`);
      // Defaults always fit their own spec.
      expect(resolveProps(item, {}).warnings).toEqual([]);
    }
  });

  it("ships every folder the items need at run time", () => {
    // Tests run from the repo, so a folder missing from package.json "files" only breaks installed copies.
    const files = (JSON.parse(readFileSync(join(import.meta.dirname, "../package.json"), "utf8")) as { files: string[] }).files;
    for (const dir of ["dist", "packs", "libs", "fonts"]) expect(files, dir).toContain(dir);
  });

  it("finds items by ref, id, folder or program file, and suggests near names", () => {
    expect(findItem("essentials/stat").id).toBe("stat");
    expect(findItem("stat").ref).toBe("essentials/stat");
  });

  it("rejects manifests and programs that would not run", () => {
    expect(() => makeItem("x", { id: "Bad Id", name: "", description: "", category: "title", placement: "overlay", duration: { default: 2 }, props: {} }, "function frame(t, $) { return ''; }")).toThrow(MotionError);
    expect(() => makeItem("x", { id: "ok", name: "Ok", description: "d", category: "title", placement: "overlay", duration: { default: 2 }, props: {} }, "function frame(t, $) { return fetch('x'); }")).toThrow(/fetch/);
  });

  it("checks clean: every item, every aspect, a dark and a light style", async () => {
    for (const item of lib.items) {
      for (const style of ["ember", "cream"]) {
        const rep = await checkItem(item, { style, fps: 4 });
        const problems = rep.aspects.flatMap((a) => [...a.errors, ...a.warnings].map((m) => `${item.ref} ${style} ${a.aspect}: ${m}`));
        expect(problems).toEqual([]);
        expect(rep.aspects.map((a) => a.aspect)).toEqual(item.aspects ?? ASPECT_NAMES);
      }
    }
  }, 300_000);

  it("draws in every built-in style without errors", async () => {
    for (const item of lib.items) {
      for (const s of BUILTIN_STYLES) {
        const session = await openSession(item, { style: s.name, aspect: "9:16", width: 108 });
        for (const t of [0.1, item.duration.default / 2, item.duration.default - 0.05]) expect(() => session.runner.frame(t)).not.toThrow();
      }
    }
  }, 300_000);
});

describe("patterns and the package's styles", () => {
  it("draws every pattern, moving with t, and a style's pattern on every ground", async () => {
    for (const kind of PATTERN_NAMES) {
      const s = await openSession(customItem(`function frame(t, $) { return $.pattern(t, "${kind}", { a: 1 }); }`, { duration: 4 }), { width: 320 });
      const fa = s.runner.frame(0.5), fb = s.runner.frame(2.5);
      expect(fa.svg.length, kind).toBeGreaterThan(60);
      // Everything but the ids (tile patterns move in their defs): the pattern moved.
      const plain = (f: { svg: string; defs: string }) => (f.defs + f.svg).replace(/mg[a-z]+\d+/g, "");
      expect(plain(fa), kind).not.toBe(plain(fb));
    }
    expect((await openSession(customItem('function frame(t, $) { return $.pattern(t, "nope", {}); }'), { width: 320 })).runner.frame(0).svg).toBe("");
    // A halftone style draws its dots on the title card's ground; a plain one does not.
    const dots = async (style: string) => ((await openSession(findItem("title-card"), { style, width: 320 })).runner.frame(2).svg.match(/<circle/g) ?? []).length;
    expect(await dots("tomato")).toBeGreaterThan((await dots("cream")) + 100);
  });

  it("names the package's faces in the frames it draws", async () => {
    for (const [style, family] of [["luxe", "DM Serif Display"], ["candy", "Archivo Black"], ["retro", "Fraunces"], ["diner", "Pacifico"], ["sport", "Bebas Neue"], ["aurora", "Unbounded"]]) {
      const svg = (await openSession(findItem("title-card"), { style, width: 320 })).runner.frame(2).svg;
      expect(svg, style).toContain(`font-family="'${family}'`);
    }
  });

  it("describes every style in words, patterns included", () => {
    expect(BUILTIN_STYLES.length).toBeGreaterThanOrEqual(36);
    for (const s of BUILTIN_STYLES) expect(s.body, s.name).not.toMatch(/undefined/);
    const cobalt = BUILTIN_STYLES.find((s) => s.name === "cobalt")!;
    expect(cobalt.body).toMatch(/Bauhaus/);
    expect(composeDesignMd({ ...cobalt, body: "" })).toMatch(/texture: bauhaus[\s\S]*Bauhaus shapes/);
    expect(resolveStyle("---\nname: x\ncolors:\n  accent: \"#ff0000\"\n  ink: \"#111111\"\n  paper: \"#ffffff\"\ntexture: halftone\n---\n").texture).toBe("halftone");
  });
});

describe("props and styles", () => {
  const stat = findItem("stat");
  const steps = findItem("steps");
  const chart = findItem("bar-chart");

  it("reads command-line strings as each prop's type and reports what does not fit", () => {
    const r = resolveProps(stat, { value: "1,250", decimals: "9", chart: "pie", label: "x".repeat(80), nope: 1 });
    expect(r.props.value).toBe(1250);
    expect(r.props.decimals).toBe(3);
    expect(r.props.chart).toBe("bars");
    expect(String(r.props.label).length).toBe(48);
    expect(r.warnings.join(" ")).toMatch(/unknown prop "nope"/);
    expect(r.warnings.join(" ")).toMatch(/chart "pie" is not one of/);
    expect(r.warnings.join(" ")).toMatch(/cut to fit/);
    expect(resolveProps(steps, { steps: "One; Two; Three" }).props.steps).toEqual(["One", "Two", "Three"]);
    expect(resolveProps(chart, { rows: ["Intro: 92", "End=23"] }).props.rows).toEqual([{ label: "Intro", value: 92 }, { label: "End", value: 23 }]);
  });

  it("resolves styles by name, from a DESIGN.md, with overrides", () => {
    expect(resolveStyle("cream").mode).toBe("light");
    const custom = resolveStyle("---\nname: acme\nmode: light\ncolors:\n  accent: \"#00A86B\"\n  ink: \"#101418\"\n  paper: \"#FAFAF7\"\n---\n# Acme\n");
    expect(custom.colors.accent.toUpperCase()).toBe("#00A86B");
    expect(resolveStyle("ember", { accent: "#123456", display: "Poppins:800" })).toMatchObject({ colors: { accent: "#123456" }, fonts: { display: "Poppins:800" } });
    expect(() => resolveStyle("not-a-style")).toThrow(/unknown style/);
  });

  it("builds programs at any aspect and clamps the duration to the item's range", () => {
    const b = buildProgram(findItem("lower-third"), { aspect: parseAspect("1080x1350"), duration: 99 });
    expect([b.program.width, b.program.height]).toEqual([1080, 1350]);
    expect(b.duration).toBe(30);
    expect(b.warnings.join(" ")).toMatch(/at most 30 s/);
    expect(parseAspect("21:9")).toEqual({ width: 2520, height: 1080 });
  });

  it("lands text on the voice when given a transcript", async () => {
    const words = normalizeWords({ segments: [{ words: [{ word: "Meet", start: 0.2, end: 0.4 }, { word: "Priya", start: 1.5, end: 1.9 }] }] });
    const s = await openSession(findItem("lower-third"), { words, width: 480 });
    // The name enters on "Priya" (1.5 s): before it, the name is not drawn at all.
    expect(s.runner.frame(1.2).svg).not.toMatch(/PRIYA/);
    expect(s.runner.frame(2.4).svg).toMatch(/PRIYA/);
  });
});

describe("sandbox", () => {
  const env = (p: ReturnType<typeof buildProgram>["program"]) => programEnv(p, 2, 30, {});
  // Programs that slip past the static check (it rejects fetch, require, globalThis… by name) still find nothing.
  const raw = (code: string) => normalizeProgram({ code, width: 640, height: 360 })!;

  it("keeps programs away from Node, stops endless loops and maps errors to the program's lines", async () => {
    expect(() => customItem("function frame(t, $) { return typeof require; }")).toThrow(/require/);
    const escape = raw("function frame(t, $) { let r = 'none'; try { r = String(typeof ({}).constructor.constructor('return process')()); } catch (e) { r = 'blocked'; } return r; }");
    const run = await ProgramRunner.create(escape, env(escape));
    expect(run.frame(0).svg).toBe("blocked");
    const ev = raw("function frame(t, $) { try { return String((0, eval)('1 + 1')); } catch (e) { return 'blocked'; } }");
    expect((await ProgramRunner.create(ev, env(ev))).frame(0).svg).toBe("blocked");
    const peek = raw("function frame(t, $) { return [typeof require, typeof process, typeof fetch, typeof globalThis, typeof self, typeof __measure].join(','); }");
    expect((await ProgramRunner.create(peek, env(peek))).frame(0).svg).toBe("undefined,undefined,undefined,undefined,undefined,undefined");
    const loop = buildProgram(customItem("function frame(t, $) { while (true) {} }")).program;
    const lr = await ProgramRunner.create(loop, env(loop));
    expect(() => lr.frame(0, 200)).toThrow(/longer than 0.2 s/);
    const bad = buildProgram(customItem("function frame(t, $) {\n  const a = 1;\n  return a.b.c;\n}")).program;
    const badItem = customItem("function frame(t, $) {\n  const a = 1;\n  return a.b.c;\n}");
    const badBuilt = buildProgram(badItem);
    await expect((async () => (await ProgramRunner.create(badBuilt.program, env(badBuilt.program), 5000, badBuilt.codeOffset)).frame(0))()).rejects.toThrow(/line 3/);
    await expect(openSession(badItem).then((s) => s.runner.frame(0))).rejects.toThrow(/line 3/);
  });

  it("is deterministic: any frame, any order, the same picture", async () => {
    const s = await openSession(findItem("logo-sting"), { width: 320 });
    const a = s.runner.frame(1.234).svg;
    s.runner.frame(0.1);
    s.runner.frame(3);
    expect(s.runner.frame(1.234).svg).toBe(a);
  });
});

describe("text beyond Latin", () => {
  it("sets Devanagari, Cyrillic and mixed lines as outlines, leaves Latin to resvg", () => {
    const latin = '<text x="0" y="50" font-family="\'Inter\'" font-size="40" font-weight="700" fill="#fff"><tspan x="0">Hello</tspan></text>';
    expect(outlineText(latin)).toBe(latin);
    const hindi = outlineText('<text x="10" y="50" font-family="\'Poppins\'" font-size="40" font-weight="800" fill="#fff" opacity="0.5" text-anchor="middle" xml:space="preserve"><tspan x="10">प्रिया शर्मा</tspan></text>');
    expect(hindi).toMatch(/^<path d="M/);
    expect(hindi).toMatch(/fill="#fff"/);
    expect(hindi).toMatch(/opacity="0.5"/);
    expect(hindi).not.toMatch(/text-anchor|font-family/);
    expect(outlineText('<text x="0" y="40" font-family="\'Space Mono\'" font-size="30" font-weight="700" fill="#000"><tspan x="0">Хорошо · Tiếng</tspan></text>')).toMatch(/^<path/);
  });

  it("renders a Hindi name with ink where the words are", async () => {
    const r = await renderStill(findItem("lower-third"), { props: { name: "प्रिया शर्मा", role: "डिज़ाइनर" }, style: "studio", colors: { display: "Poppins:800" }, width: 960, t: 2 });
    const px = pixels(r.data, r.width, r.height);
    let ink = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i]! > 0) ink++;
    expect(ink).toBeGreaterThan(5000);
  });
});

describe("rendering", () => {
  it("writes stills with alpha, standalone SVGs with their faces, and contact sheets", async () => {
    const png = await renderStill(findItem("lower-third"), { width: 640, t: 2, out: join(tmp, "lt.png") });
    expect(existsSync(png.file!)).toBe(true);
    const px = pixels(png.data, png.width, png.height);
    expect(px[3]).toBe(0);
    let opaque = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] === 255) opaque++;
    expect(opaque).toBeGreaterThan(1000);
    const svg = await renderStill(findItem("title-card"), { format: "svg", t: 2 });
    expect(svg.data.toString()).toMatch(/@font-face\{font-family:'Inter'/);
    const sheet = await renderSheet(findItem("stat"), { times: [0.5, 1, 2], tileWidth: 200 });
    expect(sheet.png.subarray(1, 4).toString()).toBe("PNG");
  });

  it("renders a PNG sequence without ffmpeg, drawing unchanged frames once", async () => {
    const r = await renderVideo(findItem("wipe"), { format: "png", width: 160, fps: 10, out: join(tmp, "wipe") });
    expect(readdirSync(r.file).length).toBe(r.frames);
    expect(r.frames).toBe(12);
    const hold = await renderVideo(findItem("logo-sting"), { format: "png", width: 120, fps: 10, out: join(tmp, "sting") });
    expect(hold.drawn).toBeLessThan(hold.frames);
  });

  it.skipIf(!probeFfmpeg()?.encoders.has("prores_ks"))("encodes ProRes 4444 with alpha and MP4 without", async () => {
    const mov = await renderVideo(findItem("social"), { format: "mov", width: 320, duration: 2.5, fps: 12, out: join(tmp, "s.mov") });
    const probe = (f: string) => execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt,nb_frames", "-of", "csv=p=0", f], { encoding: "utf8" }).trim();
    expect(probe(mov.file)).toMatch(/^prores,yuva444p/);
    const mp4 = await renderVideo(findItem("social"), { format: "mp4", width: 320, duration: 2.5, fps: 12, out: join(tmp, "s.mp4") });
    expect(probe(mp4.file)).toMatch(/^h264,yuv420p,30$/);
    expect(mp4.warnings.join(" ")).toMatch(/no alpha/);
  });
});

describe("frame documents", () => {
  it("clips to the program's region and draws a background under it", async () => {
    const s = await openSession(findItem("stat"), { width: 480 });
    const f = s.runner.frame(1);
    const doc = frameDocument({ ...s.built.program, region: { x: 0, y: 0, w: 100, h: 100 } }, f, 480, 270, { background: "#000000" });
    expect(doc).toMatch(/<clipPath id="__mm_region">/);
    expect(doc).toMatch(/fill="#000000"/);
  });
});

describe("cli", () => {
  it.skipIf(!existsSync(join(import.meta.dirname, "../dist/cli.js")))("lists, describes and fails clearly (built CLI)", () => {
    const run = (args: string[]) => spawnSync(process.execPath, [join(import.meta.dirname, "../dist/cli.js"), ...args], { encoding: "utf8" });
    const list = JSON.parse(run(["list", "--json"]).stdout) as Array<{ id: string }>;
    expect(list.map((i) => i.id)).toContain("lower-third");
    expect(run(["info", "stat"]).stdout).toMatch(/value: number/);
    const bad = run(["render", "nope"]);
    expect(bad.status).toBe(2);
    expect(bad.stderr).toMatch(/no item "nope"/);
    expect(run(["--version"]).stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("mcp", () => {
  it("offers the tools and answers with text and images", async () => {
    const server = createMcpServer();
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(b);
    const tools = (await client.listTools()).tools.map((t) => t.name);
    expect(tools).toEqual(expect.arrayContaining(["motion_list", "motion_info", "motion_styles", "motion_preview", "motion_still", "motion_check", "motion_render", "motion_api"]));
    const list = await client.callTool({ name: "motion_list", arguments: { search: "subscribe" } });
    expect(JSON.stringify(list.content)).toMatch(/essentials\/subscribe/);
    const prev = (await client.callTool({ name: "motion_preview", arguments: { item: "quote", aspect: "1:1", times: [1, 3] } })) as { content: Array<{ type: string; mimeType?: string }> };
    expect(prev.content[0]).toMatchObject({ type: "image", mimeType: "image/png" });
    const check = (await client.callTool({ name: "motion_check", arguments: { code: "function frame(t, $) { return nope; }" } })) as { content: Array<{ text: string }> };
    expect(check.content[0]!.text).toMatch(/nope is not defined/);
    const missing = await client.callTool({ name: "motion_info", arguments: { item: "nope" } });
    expect(missing.isError).toBe(true);
    await client.close();
  });
});

describe("motion", () => {
  const lib = library();
  const svgAt = async (item: string, t: number, opts: Parameters<typeof openSession>[1] = {}) => (await openSession(findItem(item), { width: 480, ...opts })).runner.frame(t).svg;

  it("has the vocabulary the TypeScript side lists", async () => {
    const probe = customItem("function frame(t, $) { return JSON.stringify({ moves: Object.keys(MM_MOVES), idles: Object.keys(MM_IDLES), hits: Object.keys(MM_HITS), moods: MM_MOOD_NAMES }); }");
    const s = await openSession(probe, { width: 64 });
    const v = JSON.parse(s.runner.frame(0).svg) as Record<string, string[]>;
    expect(v.moves).toEqual([...MOVES]);
    expect(v.idles).toEqual([...IDLES]);
    expect(v.hits).toEqual([...HITS]);
    expect(v.moods).toEqual([...MOODS]);
  });

  it("keeps every program under the 60 000-character cap", () => {
    for (const item of lib.items) expect(item.code.length, item.ref).toBeLessThan(60_000);
  });

  it("lets a creator change any part's move", async () => {
    // By default the name rises in at ~0.3 s; with in: none it is there from the first frame.
    expect(await svgAt("lower-third", 0.05)).not.toMatch(/PRIYA/);
    expect(await svgAt("lower-third", 0.05, { motion: { name: { in: "none" } } })).toMatch(/PRIYA/);
    // Letters: one <text> per letter while they land.
    const letters = await svgAt("lower-third", 1, { motion: { name: { split: "letters", in: "pop" } } });
    expect((letters.match(/<text/g) ?? []).length).toBeGreaterThan(8);
    // A typewriter shows only the letters typed so far.
    const typed = await svgAt("lower-third", 0.5, { motion: { name: { in: "typewriter" } } });
    expect(typed).toMatch(/>P</);
    expect(typed).not.toMatch(/>M</);
    // An exit of "none" holds to the end.
    expect(await svgAt("lower-third", 4.98, { motion: { "*": { out: "none" } } })).toMatch(/PRIYA/);
  });

  it("follows keyframes and emphasis hits", async () => {
    const box = customItem("function frame(t, $) { const M = motion($, t); return M.part('box', { keys: [{ t: 0, x: -100 }, { t: 1, x: 0 }], emphasis: 'shake@1.5' }, $.rect(100, 100, 50, 50, { fill: '#f00' })); }", { duration: 3 });
    const s = await openSession(box, { width: 320 });
    expect(s.runner.frame(0).svg).toMatch(/translate\(-100 0\)/);
    expect(s.runner.frame(2).svg).not.toMatch(/translate/);
    expect(s.runner.frame(1.55).svg).toMatch(/translate\(/);
  });

  it("gives every seed its own choreography, and the same seed the same one", async () => {
    const takes = await Promise.all([1, 2, 3, 4].map((seed) => svgAt("title-card", 0.6, { seed })));
    expect(new Set(takes).size).toBe(4);
    expect(await svgAt("title-card", 0.6, { seed: 3 })).toBe(takes[2]);
    // A mood without a seed is still deterministic.
    expect(await svgAt("stat", 0.5, { mood: "playful" })).toBe(await svgAt("stat", 0.5, { mood: "playful" }));
  });

  it("checks clean under many seeds, on 16:9 and 9:16", async () => {
    for (const item of lib.items) {
      for (const seed of [1, 2, 3, 5, 8, 13]) {
        const rep = await checkItem(item, { seed, fps: 4, aspects: ["16:9", "9:16"] });
        const problems = rep.aspects.flatMap((a) => [...a.errors, ...a.warnings].map((m) => `${item.ref} seed ${seed} ${a.aspect}: ${m}`));
        expect(problems).toEqual([]);
      }
    }
  }, 600_000);

  it("reads overrides from a command line and reports what it cannot use", () => {
    expect(parseMotionArgs(["name.in=pop", "in=fade", "*.ease=bouncy", '{"role":{"emphasis":"pulse@2"}}'])).toEqual({ name: { in: "pop" }, "*": { in: "fade", ease: "bouncy" }, role: { emphasis: "pulse@2" } });
    const { motion, warnings } = normalizeMotion({ parts: { name: { in: "teleport", ease: "spring(2,7)", distance: "80", blur: "true", emphasis: "shake@now, zap@1" }, nope: { in: "pop" } }, mood: "sleepy", seed: 4 }, ["name", "role"]);
    expect(motion.parts?.name).toEqual({ ease: "spring(2,7)", distance: 80, blur: true, emphasis: [{ fx: "shake", at: "now" }] });
    expect(motion.seed).toBe(4);
    expect(warnings.join(" | ")).toMatch(/"teleport" is not a move/);
    expect(warnings.join(" | ")).toMatch(/unknown part "nope"/);
    expect(warnings.join(" | ")).toMatch(/mood "sleepy"/);
    expect(warnings.join(" | ")).toMatch(/"zap" is not one of/);
  });
});

describe("libraries, 3D and maps", () => {
  const ink = (png: Buffer, w: number, h: number) => {
    const px = pixels(png, w, h);
    let n = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i]! > 0) n++;
    return n;
  };

  it("keeps the kit and libraries out of items and adds them when a program is built", () => {
    for (const item of library().items) {
      expect(item.code.includes("function motion($, t)"), item.ref).toBe(false);
      expect(item.code.length, item.ref).toBeLessThan(60_000);
    }
    const globe = findItem("3d/globe");
    expect(globe.libs).toEqual(["3d", "world"]);
    const built = buildProgram(globe);
    expect(built.program.code).toMatch(/function motion\(\$, t\)/);
    expect(built.program.code).toMatch(/function scene3d\(/);
    expect(built.program.code).toMatch(/function worldGlobe\(/);
    expect(built.codeOffset).toBeGreaterThan(50);
    // Code someone writes gets a library by calling it.
    expect(customItem("function frame(t, $) { return scene3d($, {}).render(); }").libs).toEqual(["3d"]);
    expect(customItem("function frame(t, $) { return worldMap($, {}).outline; }").libs).toEqual(["world"]);
  });

  it("carries only the glyphs a 3D program's props can show, in the brand's display face", () => {
    const built = buildProgram(findItem("3d/logo-3d"), { props: { wordmark: "Zebra" }, style: "pop" });
    const tables = JSON.parse(/var MM_GLYPHS = (\{.*?\});/s.exec(built.program.code)![1]!) as Record<string, { g: Record<string, unknown> }>;
    expect(Object.keys(tables)).toEqual(["Anton:400"]);
    const chars = Object.keys(tables["Anton:400"]!.g).map((c) => String.fromCodePoint(Number(c)));
    expect(chars).toEqual(expect.arrayContaining(["Z", "e", "b", "r", "a", "0", "9"]));
    expect(chars.length).toBeLessThan(120);
  });

  it("draws 3D text, cards and parents in perspective, decals over their host", async () => {
    const code = `function frame(t, $) {
      var S = scene3d($, { camera: { yaw: 30 * t } });
      var card = { rotate: [0, 180 * t, 0] };
      S.add(S.card(600, 300, { color: "#222222", back: "#ff6a3d" }), card);
      S.add(S.text("Hi", { face: $.font("display"), size: 120, depth: 0, color: "#00ff00" }), { position: [0, 60, -8], parent: card, flat: true, decal: true });
      S.add(S.text("3D", { face: $.font("display"), size: 160, depth: 50, color: "#ffffff", side: "#ff6a3d" }), { position: [0, -200, 0], rotate: [0, 25, 0] });
      return S.render();
    }`;
    const item = { ...customItem(code, { duration: 1 }), props: { s: { type: "text" as const, default: "Hi3D" } } };
    const still = await renderStill(item, { width: 640, t: 0.2 });
    expect(ink(still.data, still.width, still.height)).toBeGreaterThan(20_000);
    const session = await openSession(item, { width: 640 });
    // Facing the camera: the decal is drawn after the card's face, below the card's lower edge in depth notwithstanding.
    const front = session.runner.frame(0.2).svg;
    expect(front.indexOf('fill="#00ff00"')).toBeGreaterThan(front.search(/fill="#(1|2)[0-9a-f]{5}"/));
    // Turned past 90°: the back (a lit shade of the orange) shows and the front decal is culled.
    const back = session.runner.frame(0.8).svg;
    expect(back).not.toMatch(/#00ff00/);
    const fills = [...back.matchAll(/fill="#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})"/g)].map((m) => [parseInt(m[1]!, 16), parseInt(m[2]!, 16)]);
    expect(fills.some(([r, g]) => r! > 150 && r! > g! * 1.8)).toBe(true);
  });

  it("finds countries by name, short name and id, and maps them", async () => {
    const code = `function frame(t, $) {
      var m = worldMap($, {});
      var ok = [worldFind("UK"), worldFind("usa"), worldFind(356), worldFind("Côte d'Ivoire")].map(function (c) { return c ? c.name : "-"; });
      return JSON.stringify({ ok: ok, n: m.countries.length, d: m.path("India").length, ant: m.countries.some(function (c) { return c.name === "Antarctica"; }) });
    }`;
    const out = JSON.parse((await openSession(customItem(code), { width: 640 })).runner.frame(0).svg) as { ok: string[]; n: number; d: number; ant: boolean };
    expect(out.ok).toEqual(["United Kingdom", "United States of America", "India", "Côte d'Ivoire"]);
    expect(out.n).toBeGreaterThan(170);
    expect(out.d).toBeGreaterThan(200);
    expect(out.ant).toBe(false);
  });

  it("draws pathLength dashes at their true length (resvg ignores the attribute)", () => {
    expect(pathDataLength("M0 0L30 40")).toBeCloseTo(50, 5);
    expect(pathDataLength("M0 0A50 50 0 0 1 100 0")).toBeCloseTo(Math.PI * 50, 0);
    const out = resolvePathLength('<circle cx="0" cy="0" r="10" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="0.75"/>');
    expect(out).not.toMatch(/pathLength/);
    expect(out).toMatch(new RegExp(`stroke-dasharray="${2 * Math.PI * 10} ${2 * Math.PI * 10}"`));
    expect(Number(/stroke-dashoffset="([^"]+)"/.exec(out)![1])).toBeCloseTo(0.75 * 2 * Math.PI * 10, 6);
  });

  it("keeps the rest of a row in its last field", () => {
    const r = resolveProps(findItem("social/chat"), { messages: ["them: see you at 10:30?", "me: yes: on my way"] });
    expect(r.props.messages).toEqual([{ who: "them", text: "see you at 10:30?" }, { who: "me", text: "yes: on my way" }]);
  });

  it("suggests the closest items for a name it does not know", () => {
    expect(() => findItem("lower")).toThrow(/did you mean essentials\/lower-third/);
    expect(() => findItem("map")).toThrow(/did you mean data\/world-map/);
  });
});
