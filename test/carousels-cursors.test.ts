/** The carousels and cursors packs, the exploded stack, isometric blocks and the tile flip. */
import { describe, expect, it } from "vitest";
import { findItem, library, openSession } from "../src/index.js";

async function svgAt(ref: string, t: number, props: Record<string, unknown> = {}, aspect: "16:9" | "9:16" = "16:9") {
  const s = await openSession(findItem(ref), { props, aspect, width: 640 });
  return s.runner.frame(t).svg;
}

describe("carousels and cursors", () => {
  it("ship as packs of their own, after 3D and after Annotate", () => {
    const ids = library().packs.map((p) => p.id);
    expect(ids.indexOf("carousels")).toBe(ids.indexOf("3d") + 1);
    expect(ids.indexOf("cursors")).toBe(ids.indexOf("annotate") + 1);
    expect(library().packs.find((p) => p.id === "carousels")!.entries.map((e) => e.id)).toEqual(["ring-carousel", "orbit-carousel", "path-carousel", "text-ring", "cover-flow"]);
    expect(library().packs.find((p) => p.id === "cursors")!.entries.map((e) => e.id)).toEqual(["agent-cursor", "multiplayer", "drag-drop", "text-select", "context-menu"]);
  });

  it("carousel cards are tiles with their titles when there are no pictures", async () => {
    const ring = await svgAt("carousels/ring-carousel", 4);
    expect(ring).toContain("The collection");
    expect(ring).toMatch(/>0[1-9]</);
    const flow = await svgAt("carousels/cover-flow", 4, { title: "Albums" });
    expect(flow).toContain("Albums");
  });

  it("the text ring sets its phrase letter by letter round the circle", async () => {
    const svg = await svgAt("carousels/text-ring", 3);
    expect((svg.match(/rotate\(/g) ?? []).length).toBeGreaterThan(30);
    expect(svg).toMatch(/>V</);
  });

  it("the agent types its step, and the context menu opens after the right-click", async () => {
    const mid = await svgAt("cursors/agent-cursor", 2.2);
    expect(mid).toContain("Agent");
    expect(mid).toMatch(/Selecting|Trimming|Opening/);
    expect(await svgAt("cursors/context-menu", 0.5)).not.toContain("Split at playhead");
    expect(await svgAt("cursors/context-menu", 1.6)).toContain("Split at playhead");
  });

  it("the stack spreads with its labels, the blocks show values and the tiles land on the rear headline", async () => {
    const stack = await svgAt("3d/exploded-stack", 3);
    for (const l of ["Interface", "API gateway", "Services", "Database"]) expect(stack).toContain(l);
    expect(await svgAt("3d/iso-blocks", 4)).toMatch(/>260</);
    const end = await svgAt("type/tile-flip", 3.6);
    expect(end).toMatch(/>matter\.</i);
    expect(end).not.toMatch(/>make it</i);
  });
});
