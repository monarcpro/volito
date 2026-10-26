import { describe, expect, it } from "vitest";
import { advance, aspectSize, canvasSize, formatTime, groundOf, numberAttr, parseAspects, parseBeats, parseJsonObject, parseMotionAttr, playRange } from "../src/player/attrs.js";

describe("<volito-player> attributes", () => {
  it("reads JSON object attributes and rejects anything else", () => {
    expect(parseJsonObject('{"name":"Ada","count":3}', "props")).toEqual({ name: "Ada", count: 3 });
    expect(parseJsonObject(null, "props")).toBeUndefined();
    expect(parseJsonObject("  ", "props")).toBeUndefined();
    expect(() => parseJsonObject("[1,2]", "props")).toThrow(/JSON object/);
    expect(() => parseJsonObject("{name:", "props")).toThrow(/JSON object/);
  });

  it("lists aspects for the tabs, in order, without repeats", () => {
    expect(parseAspects("all")).toEqual(["16:9", "9:16", "1:1", "4:5"]);
    expect(parseAspects("9:16, 16:9 9:16")).toEqual(["9:16", "16:9"]);
    expect(parseAspects("1280x720,1:1")).toEqual(["1280x720", "1:1"]);
    expect(parseAspects(null)).toEqual([]);
    expect(() => parseAspects("16:9, wide")).toThrow(/unknown aspect/);
  });

  it("sizes aspects at 1080p and custom sizes as given", () => {
    expect(aspectSize("16:9")).toEqual({ width: 1920, height: 1080 });
    expect(aspectSize("4:5")).toEqual({ width: 1080, height: 1350 });
    expect(aspectSize("800x600")).toEqual({ width: 800, height: 600 });
  });

  it("sizes the canvas to the frame on screen, inside its bounds", () => {
    expect(canvasSize("16:9", 760, 2)).toEqual({ width: 1520, height: 855 });
    expect(canvasSize("9:16", 248, 2)).toEqual({ width: 496, height: 882 });
    // Never past the cap on the long side, never below 240 px.
    expect(canvasSize("16:9", 4000, 2)).toEqual({ width: 1920, height: 1080 });
    expect(canvasSize("16:9", 4000, 2, 1280)).toEqual({ width: 1280, height: 720 });
    expect(canvasSize("16:9", 10, 1)).toEqual({ width: 240, height: 135 });
  });

  it("reads motion as the CLI's part.setting=value list or JSON", () => {
    expect(parseMotionAttr("*.in=pop; title.split=letters")).toEqual({ "*": { in: "pop" }, title: { split: "letters" } });
    expect(parseMotionAttr('{"name":{"in":"slide"}}')).toEqual({ name: { in: "slide" } });
    expect(parseMotionAttr("")).toBeUndefined();
  });

  it("reads beats as name=seconds pairs or JSON numbers", () => {
    expect(parseBeats("in=0.4; out=-0.6")).toEqual({ in: 0.4, out: -0.6 });
    expect(parseBeats('{"in":1}')).toEqual({ in: 1 });
    expect(() => parseBeats("in=soon")).toThrow(/number of seconds/);
    expect(() => parseBeats("in")).toThrow(/name=seconds/);
  });

  it("reads numbers and grounds", () => {
    expect(numberAttr("1.5")).toBe(1.5);
    expect(numberAttr("abc")).toBeUndefined();
    expect(numberAttr(null)).toBeUndefined();
    expect(groundOf(null)).toEqual({ kind: "footage" });
    expect(groundOf("checker")).toEqual({ kind: "checker" });
    expect(groundOf("#000")).toEqual({ kind: "color", color: "#000" });
  });
});

describe("<volito-player> clock", () => {
  it("keeps the range inside the graphic, or plays all of it", () => {
    expect(playRange(5)).toEqual({ start: 0, end: 5 });
    expect(playRange(5, 1, 3)).toEqual({ start: 1, end: 3 });
    expect(playRange(5, -2, 9)).toEqual({ start: 0, end: 5 });
    expect(playRange(5, 4, 2)).toEqual({ start: 0, end: 5 });
  });

  it("advances at the playback rate", () => {
    expect(advance(1, 0.5, 1, { start: 0, end: 5 }, false)).toEqual({ t: 1.5, ended: false });
    expect(advance(1, 0.5, 2, { start: 0, end: 5 }, false)).toEqual({ t: 2, ended: false });
  });

  it("wraps to the range's start when looping", () => {
    const r = advance(2.5, 1, 1, { start: 1, end: 3 }, true);
    expect(r.ended).toBe(false);
    expect(r.t).toBeCloseTo(1.5);
  });

  it("holds the last frame and ends without loop", () => {
    const r = advance(4.8, 1, 1, { start: 0, end: 5 }, false, 30);
    expect(r.ended).toBe(true);
    expect(r.t).toBeCloseTo(5 - 1 / 30);
  });

  it("formats the time readout", () => {
    expect(formatTime(1.234, 5)).toBe("1.23 / 5.00 s");
    expect(formatTime(9, 5)).toBe("5.00 / 5.00 s");
  });
});
