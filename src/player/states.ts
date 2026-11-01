/**
 * Interactive states for <volito-player>: a graphic's timeline cut into named stretches — idle, hover,
 * press, loading, success — that page events and code switch between. Each state plays its stretch once
 * (then stays on its last frame, or moves on to `next`), loops it, or holds one frame. Times are seconds or
 * the item's beat names, so an item that names its beats ("hover", "press") declares its states in
 * item.json and works with no setup:
 *
 *   "states": { "idle": { "from": "idle", "to": "hover", "play": "loop" },
 *               "hover": { "from": "hover", "to": "press", "play": "once" },
 *               "press": { "from": "press", "to": "loading", "play": "once", "next": "loading" } },
 *   "on": "pointerenter(idle): hover; pointerleave(hover): idle; click: press"
 *
 * Pure functions: parsed and resolved here, played by the element.
 */

export const STATE_PLAYS = ["once", "loop", "hold"] as const;
export type StatePlay = (typeof STATE_PLAYS)[number];

export interface StateDef {
  /** Where the stretch starts: seconds, a beat name, "start" or "end". Default: the start. */
  from?: number | string;
  /** Where it ends: seconds, a beat name, "start" or "end". Default: the end. */
  to?: number | string;
  /** once: play it and stay on its last frame (or go to `next`); loop: repeat it; hold: show `from` and stay. */
  play?: StatePlay;
  /** The state to go to when a `once` stretch finishes. */
  next?: string;
}

export interface ResolvedState {
  name: string;
  start: number;
  end: number;
  play: StatePlay;
  next?: string;
}

export interface StateTrigger {
  /** A DOM event on the element: pointerenter, pointerleave, click, focus, blur, pointerdown, pointerup… */
  event: string;
  /** Only from these states; any state when empty. */
  from: string[];
  to: string;
}

const NAME = /^[A-Za-z][\w-]{0,40}$/;

/** The states attribute (or an item's "states"): a JSON object of state definitions. */
export function parseStates(value: unknown, where = "states"): Record<string, StateDef> | undefined {
  if (value == null || value === "") return undefined;
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error(`${where} must be a JSON object, like {"idle":{"from":0,"to":1,"play":"loop"}}`);
    }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`${where} must be a JSON object of states`);
  const out: Record<string, StateDef> = {};
  for (const [name, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!NAME.test(name)) throw new Error(`${where}: "${name}" is not a state name (letters, digits, - and _)`);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`${where}.${name} must be an object like {"from":"hover","to":"press","play":"once"}`);
    const d = raw as Record<string, unknown>;
    const play = d.play ?? "once";
    if (!(STATE_PLAYS as readonly unknown[]).includes(play)) throw new Error(`${where}.${name}.play is one of ${STATE_PLAYS.join(", ")}`);
    for (const k of ["from", "to"] as const) if (d[k] !== undefined && typeof d[k] !== "number" && typeof d[k] !== "string") throw new Error(`${where}.${name}.${k} is seconds or a beat name`);
    out[name] = { ...(d.from !== undefined ? { from: d.from as number | string } : {}), ...(d.to !== undefined ? { to: d.to as number | string } : {}), play: play as StatePlay, ...(typeof d.next === "string" ? { next: d.next } : {}) };
  }
  for (const [name, d] of Object.entries(out)) if (d.next && !(d.next in out)) throw new Error(`${where}.${name}.next is "${d.next}", which is not a state (${Object.keys(out).join(", ")})`);
  return Object.keys(out).length ? out : undefined;
}

/**
 * The on attribute (or an item's "on"): "event: state" pairs separated by ";", with an optional guard of
 * states it applies from — "pointerenter(idle): hover; pointerleave(hover): idle; click: press".
 */
export function parseTriggers(value: unknown, states?: Record<string, StateDef>): StateTrigger[] {
  if (value == null || value === "") return [];
  if (typeof value !== "string") throw new Error('on takes "event: state" pairs, like "pointerenter: hover; click: press"');
  const out: StateTrigger[] = [];
  for (const raw of value.split(/[;\n]+/)) {
    const s = raw.trim();
    if (!s) continue;
    const m = /^([a-z][a-z-]*)\s*(?:\(([^)]*)\))?\s*:\s*([A-Za-z][\w-]*)$/i.exec(s);
    if (!m) throw new Error(`on: "${s}" is not "event: state" (or "event(fromState): state")`);
    const from = (m[2] ?? "").split(/[\s|,]+/).filter(Boolean);
    const t: StateTrigger = { event: m[1]!.toLowerCase(), from, to: m[3]! };
    if (states) for (const n of [t.to, ...t.from]) if (!(n in states)) throw new Error(`on: "${n}" is not a state (${Object.keys(states).join(", ")})`);
    out.push(t);
  }
  return out;
}

/** The state a trigger moves to from `current`, or null when it does not apply. */
export function triggerTarget(triggers: StateTrigger[], event: string, current: string | null): string | null {
  for (const t of triggers) if (t.event === event && (!t.from.length || (current !== null && t.from.includes(current)))) return t.to;
  return null;
}

/** A time: seconds (negative counts from the end), a beat name (its own sign rules), "start" or "end". */
export function resolveTime(v: number | string | undefined, fallback: number, duration: number, beats: Record<string, number>): number {
  let t: number;
  if (v === undefined) t = fallback;
  else if (typeof v === "number") t = v;
  else if (v === "start") t = 0;
  else if (v === "end") t = duration;
  else if (v in beats) t = beats[v]!;
  else if (Number.isFinite(Number(v))) t = Number(v);
  else throw new Error(`"${v}" is not a beat (${Object.keys(beats).join(", ") || "none"}), seconds, start or end`);
  if (t < 0) t = duration + t;
  return Math.max(0, Math.min(duration, t));
}

/** One state's stretch of the timeline, in seconds. */
export function resolveState(name: string, states: Record<string, StateDef>, duration: number, beats: Record<string, number> = {}): ResolvedState {
  const d = states[name];
  if (!d) throw new Error(`no state "${name}" (states: ${Object.keys(states).join(", ")})`);
  const start = resolveTime(d.from, 0, duration, beats);
  const end = resolveTime(d.to, duration, duration, beats);
  if (end < start) throw new Error(`state "${name}" ends (${end.toFixed(2)} s) before it starts (${start.toFixed(2)} s)`);
  return { name, start, end, play: d.play ?? "once", ...(d.next ? { next: d.next } : {}) };
}

/** The state to start in: the one asked for, else "enter" (an entrance that hands on), else "idle", else the first. */
export function initialState(states: Record<string, StateDef>, asked?: string | null): string {
  if (asked && asked in states) return asked;
  if ("enter" in states) return "enter";
  return "idle" in states ? "idle" : Object.keys(states)[0]!;
}

/**
 * How a state plays for a reader who prefers reduced motion: loops hold their first frame, and a `once`
 * stretch shows its last frame at once (then moves on to `next`).
 */
export function reducedPlay(s: ResolvedState): { show: number; thenNext: boolean } {
  if (s.play === "loop" || s.play === "hold") return { show: s.start, thenNext: false };
  return { show: Math.max(s.start, s.end - 1e-3), thenNext: !!s.next };
}
