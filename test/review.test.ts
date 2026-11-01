import { describe, expect, it } from "vitest";
import { findItem } from "../src/node/packs.js";
import { frameChange, readTiming, reviewItem, zoneShares } from "../src/node/review.js";

describe("volito review", () => {
  it("counts the share of pixels that visibly changed", () => {
    const a = new Uint8Array(16).fill(0);
    const b = Uint8Array.from(a);
    expect(frameChange(a, b)).toBe(0);
    b[0] = 200; // one of four pixels changes
    expect(frameChange(a, b)).toBeCloseTo(0.25);
    b[4] = 10; // too small a change to see
    expect(frameChange(a, b)).toBeCloseTo(0.25);
  });

  it("takes the longest still stretch as the hold, not a still moment before the entrance", () => {
    // 20 fps: still 0–0.3 s, moving to 1 s, still to 3 s, then moving out.
    const changes = Array.from({ length: 81 }, (_, i) => (i === 0 ? 0 : i <= 6 ? 0 : i <= 20 ? 0.2 : i <= 60 ? 0 : 0.2));
    const visible = changes.map(() => true);
    const t = readTiming(changes, visible, 20, 4);
    expect(t.settledAt).toBeCloseTo(1.0);
    expect(t.exitAt).toBeCloseTo(3.0);
    expect(t.hold).toBeCloseTo(2.0);
    expect(readTiming(changes.map(() => 0.5), visible, 20, 4).settledAt).toBeNull();
  });

  it("measures how much of a graphic sits under each platform's interface", () => {
    const w = 10, h = 20;
    const px = new Uint8Array(w * h * 4);
    for (let y = 16; y < 20; y++) for (let x = 0; x < w; x++) px[(y * w + x) * 4 + 3] = 255; // the bottom 20% only
    const reels = zoneShares(px, w, h).find((z) => z.platform === "Instagram Reels" && z.area.startsWith("username"))!;
    expect(reels.share).toBe(1);
  });

  it("reviews a pack item: timing at its default and a 9:16 zone warning", async () => {
    const rep = await reviewItem(findItem("lower-third"), { props: { name: "Priya Sharma", role: "Product designer" }, aspects: ["16:9", "9:16"] });
    expect(rep.ok).toBe(true);
    const wide = rep.aspects[0]!;
    expect(wide.timing.settledAt).toBeGreaterThan(0.2);
    expect(wide.timing.hold).toBeGreaterThan(2);
    expect(wide.zones).toEqual([]);
    expect(rep.aspects[1]!.zones.length).toBeGreaterThan(0);
  });
});
