/** Pack styles reach their items, and the 0.4 additions to Essentials, Data, Social, Annotate, Type and Backdrops behave. */
import { describe, expect, it } from "vitest";
import { findItem, library, openSession } from "../src/index.js";

async function svgAt(ref: string, t: number, props: Record<string, unknown> = {}, aspect: "16:9" | "9:16" = "16:9") {
  const s = await openSession(findItem(ref), { props, aspect, width: 640 });
  return s.runner.frame(t).svg;
}

describe("pack styles", () => {
  it("an item without a style of its own is shown in its pack's", () => {
    const lib = library();
    for (const p of lib.packs) for (const e of p.entries) if (p.style) expect(e.style, e.ref).toBe(p.style);
    expect(findItem("data/donut").style).toBe("cream");
    expect(findItem("essentials/lower-third").style).toBe("studio");
  });

  it("the six refreshed packs are shown in light styles", () => {
    const lib = library();
    const light = ["studio", "cream", "pastel", "candy", "pop", "memphis"];
    for (const id of ["essentials", "data", "social", "annotate", "type", "backdrops"]) expect(light, id).toContain(lib.packs.find((p) => p.id === id)!.style);
  });
});

describe("new items", () => {
  it("each refreshed pack gained five items", () => {
    const want: Record<string, string[]> = {
      essentials: ["chapter", "logo-wall", "progress-bar", "before-after", "agenda"],
      data: ["heatmap", "gauge", "kpi-grid", "waffle", "leaderboard"],
      social: ["poll", "milestone", "story", "live-chat", "joined"],
      annotate: ["bracket", "box-label", "cursor", "measure", "check"],
      type: ["slot", "outline-draw", "flex", "shimmer", "stream"],
      backdrops: ["halftone", "waves", "orbits", "dot-grid", "paper-cut"],
    };
    for (const [pack, ids] of Object.entries(want)) for (const id of ids) expect(findItem(`${pack}/${id}`).ref).toBe(`${pack}/${id}`);
  });

  it("the world map shades on one scale, with a legend and its source", async () => {
    const svg = await svgAt("data/world-map", 5);
    expect(svg).toContain("Source: channel analytics");
    // The legend is a gradient fill (the gradient itself lives in the shared defs).
    expect(svg).toMatch(/fill="url\(#[^"]+\)"/);
    expect(svg).toMatch(/>3%</);
    expect(svg).toMatch(/>42%</);
  });

  it("numbers land where they should", async () => {
    expect(await svgAt("data/kpi-grid", 5.5)).toContain("1,240,000");
    expect(await svgAt("type/slot", 2.8)).toMatch(/>stories</i);
    const board = await svgAt("data/leaderboard", 5.5);
    expect(board.indexOf("Ana Ruiz")).toBeLessThan(board.indexOf("Kenji Mori"));
    expect(board).toContain("9,820 pts");
  });

  it("the before/after handle sweeps and the stream writes its reply", async () => {
    const early = await svgAt("type/stream", 1.0), late = await svgAt("type/stream", 5.5);
    expect(early).toContain("Cut this interview");
    expect(early).not.toContain(">Done.<");
    expect(late).toContain(">Done.<");
    const ba = await svgAt("essentials/before-after", 4);
    expect(ba).toMatch(/>Before</);
    expect(ba).toMatch(/>After</);
  });
});
