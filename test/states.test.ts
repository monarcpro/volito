import { describe, expect, it } from "vitest";
import { initialState, parseStates, parseTriggers, reducedPlay, resolveState, resolveTime, triggerTarget } from "../src/player/states.js";

const STATES = parseStates({
  idle: { from: "idle", to: "hover", play: "loop" },
  hover: { from: "hover", to: "press", play: "once" },
  press: { from: "press", to: "loading", play: "once", next: "loading" },
  loading: { from: "loading", to: "done", play: "loop" },
  done: { from: "done", to: "end", play: "once" },
})!;
const BEATS = { idle: 0.6, hover: 1.2, press: 1.8, loading: 2.2, done: 3.4 };

describe("<volito-player> states", () => {
  it("reads state definitions and rejects bad ones", () => {
    expect(STATES.press).toEqual({ from: "press", to: "loading", play: "once", next: "loading" });
    expect(parseStates('{"a":{"from":0,"to":1}}')).toEqual({ a: { from: 0, to: 1, play: "once" } });
    expect(parseStates(undefined)).toBeUndefined();
    expect(() => parseStates({ a: { play: "bounce" } })).toThrow(/play is one of/);
    expect(() => parseStates({ a: { next: "b" } })).toThrow(/not a state/);
    expect(() => parseStates("{oops")).toThrow(/JSON object/);
    expect(() => parseStates({ "1bad": {} })).toThrow(/not a state name/);
  });

  it("resolves stretches from beats, seconds and the ends", () => {
    expect(resolveState("hover", STATES, 4, BEATS)).toEqual({ name: "hover", start: 1.2, end: 1.8, play: "once" });
    expect(resolveState("done", STATES, 4, BEATS)).toMatchObject({ start: 3.4, end: 4 });
    expect(resolveTime(-0.5, 0, 4, {})).toBe(3.5);
    expect(resolveTime("end", 0, 4, {})).toBe(4);
    expect(resolveTime(undefined, 2, 4, {})).toBe(2);
    expect(() => resolveTime("nope", 0, 4, BEATS)).toThrow(/not a beat/);
    expect(() => resolveState("missing", STATES, 4, BEATS)).toThrow(/no state "missing"/);
    expect(() => resolveState("x", { x: { from: 3, to: 1 } }, 4)).toThrow(/ends .* before it starts/);
  });

  it("maps page events to states, with guards", () => {
    const on = parseTriggers("pointerenter(idle): hover; pointerleave(hover): idle; click(idle|hover): press", STATES);
    expect(triggerTarget(on, "pointerenter", "idle")).toBe("hover");
    expect(triggerTarget(on, "pointerenter", "loading")).toBeNull();
    expect(triggerTarget(on, "pointerleave", "loading")).toBeNull();
    expect(triggerTarget(on, "click", "hover")).toBe("press");
    expect(() => parseTriggers("hover", STATES)).toThrow(/event: state/);
    expect(() => parseTriggers("click: nowhere", STATES)).toThrow(/not a state/);
  });

  it("starts in the state asked for, else enter, else idle, else the first", () => {
    expect(initialState(STATES, "loading")).toBe("loading");
    expect(initialState(STATES, "nope")).toBe("idle");
    expect(initialState({ ...STATES, enter: { to: "idle", next: "idle" } })).toBe("enter");
    expect(initialState({ a: {}, b: {} })).toBe("a");
  });

  it("plays without motion for readers who prefer it reduced", () => {
    expect(reducedPlay(resolveState("idle", STATES, 4, BEATS))).toEqual({ show: 0.6, thenNext: false });
    expect(reducedPlay(resolveState("press", STATES, 4, BEATS)).thenNext).toBe(true);
  });
});

describe("the ui pack's states", async () => {
  const { library } = await import("../src/node/packs.js");
  const ui = library().items.filter((i) => i.pack === "ui");
  it("has five items, each with states and page events that resolve on its own beats", () => {
    expect(ui.map((i) => i.id)).toEqual(["button", "toggle", "like", "loader", "bell"]);
    for (const it of ui) {
      const states = parseStates((it as { states?: unknown }).states)!;
      expect(states, it.ref).toBeTruthy();
      expect(initialState(states)).toBe("enter");
      for (const name of Object.keys(states)) {
        const s = resolveState(name, states, it.duration.default, it.beats ?? {});
        expect(s.end, `${it.ref} ${name}`).toBeGreaterThanOrEqual(s.start);
      }
      expect(() => parseTriggers((it as { on?: string }).on, states)).not.toThrow();
    }
  });
});
