/**
 * Sound design for Volito graphics — synthesised here, from nothing: no samples, no dependencies.
 *
 * A render carries sound two ways. Any program may define `function sound($)` and return cues
 * (`{ at, kind, dur, level, pitch, pan }`) and, if it wants one, a tonal bed in a key; and every
 * graphic is read through the runtime's motion trace (when each part pops, slides, stamps, types
 * or bursts in), so `--sound` gives the right whoosh, pop or tick to an item nobody wrote cues for.
 * Both end in `renderSound`: cues become stereo PCM through small synths (filtered noise for air
 * and sweeps, sine drops for impacts, inharmonic partials for bells, detuned saws for a pad), a
 * room (a Schroeder reverb), ducking of the bed under hits, a limiter, and a WAV ffmpeg muxes.
 *
 * Pure TypeScript, deterministic: the same cues render the same bytes every time.
 */

export const SOUND_KINDS = ["whoosh", "hit", "stamp", "pop", "tick", "click", "riser", "fall", "sub", "shimmer", "ding", "swell", "zap", "type", "scratch", "tone", "chord"] as const;
export type SoundKind = (typeof SOUND_KINDS)[number];

/** One line per kind, for help text and agents. */
export const SOUND_NOTES: Record<SoundKind, string> = {
  whoosh: "air sweeping past — a move across the frame (dur 0.45)",
  hit: "an impact: a sub thump with a click — something lands",
  stamp: "a heavy slam — bigger than hit",
  pop: "a small bubble pop — something springs up",
  tick: "a tiny click — one letter, one word, one step",
  click: "a UI click — a button pressed",
  riser: "noise and a tone climbing — tension into a moment (dur 1)",
  fall: "the reverse — a downlifter after a moment (dur 0.8)",
  sub: "a low drop under a big reveal",
  shimmer: "high sparkle — a light sweep, particles (dur 1.2)",
  ding: "a bell — a notification, a check, a logo lockup",
  swell: "soft air rising — a fade, a gentle entrance (dur 0.8)",
  zap: "static and a chirp — a glitch (dur 0.28)",
  type: "typing: keys ticking for dur seconds (dur 0.8)",
  scratch: "pencil or marker on paper for dur seconds (dur 0.8)",
  tone: "a note (note: \"A4\", or pitch in semitones from A4) for dur seconds",
  chord: "a chord in the bed's key for dur seconds",
};

export interface SoundCue {
  /** Clip seconds. */
  at: number;
  kind: SoundKind;
  /** Seconds, for the kinds that last. */
  dur?: number;
  /** 0–2; 1 is the kind's own level. */
  level?: number;
  /** Semitones up or down from the kind's own pitch. */
  pitch?: number;
  /** A note for tone / chord ("A4", "D#3", "Bb2"). */
  note?: string;
  /** -1 left … 1 right (0 centre). */
  pan?: number;
  /** A different take of the same sound. */
  seed?: number;
}

export interface SoundBed {
  /** "D", "F#", "Bb" — the key (A by default). */
  key?: string;
  mode?: "major" | "minor";
  /** Clip seconds it plays between (the whole clip by default). */
  from?: number;
  to?: number;
  /** 0–1 (0.5). */
  level?: number;
  /** 0 dark … 1 open (0.4). */
  tone?: number;
}

export interface SoundSpec {
  cues?: SoundCue[];
  /** A pad under everything: a bed object, true for one in A minor, or a key ("Dm", "F major"). */
  bed?: SoundBed | boolean | string;
  /** Also take cues from the graphic's own motion (true when the program gives no cues). */
  auto?: boolean;
  /** Master level, 0–2 (1). */
  level?: number;
  /** The room: 0 dry … 1 wet (0.25). */
  room?: number;
}

/** A mark the runtime's trace left: [kind, seconds, a, b, count]. */
export type TraceMark = [string, number, number | null, number | null, number];

export interface RenderedSound {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  /** The cues that were rendered (after clamping and thinning). */
  cues: SoundCue[];
  /** Peak sample after the limiter, 0–1. */
  peak: number;
  bed: SoundBed | null;
  warnings: string[];
}

const SR = 48000;
const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const semis = (n: number) => Math.pow(2, n / 12);

/** A small deterministic RNG (mulberry32). */
function rng(seed: number): () => number {
  let a = (Math.floor(seed * 1_000_003) ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A zero-delay state-variable filter (Simper): stable at any cutoff; lp, bp and hp at once. */
class Svf {
  private ic1 = 0;
  private ic2 = 0;
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  private k = 1;
  lp = 0;
  bp = 0;
  hp = 0;
  set(cutoff: number, q: number): void {
    const g = Math.tan((Math.PI * clamp(cutoff, 10, SR * 0.45)) / SR);
    this.k = 1 / Math.max(0.1, q);
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  run(x: number): void {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.lp = v2;
    this.bp = v1;
    this.hp = x - this.k * v1 - v2;
  }
}

// ---------------------------------------------------------------------------------------------
// Notes and keys
// ---------------------------------------------------------------------------------------------

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 440, "D#3", "Bb2"; null when it is not a note. */
export function noteHz(note: string): number | null {
  const m = /^\s*([A-Ga-g])\s*([#b♯♭]?)\s*(-?\d)?\s*$/.exec(note);
  if (!m) return null;
  let n = NOTE_INDEX[m[1]!.toUpperCase()]!;
  if (m[2] === "#" || m[2] === "♯") n += 1;
  if (m[2] === "b" || m[2] === "♭") n -= 1;
  const oct = m[3] === undefined ? 4 : Number(m[3]);
  return 440 * semis(n + (oct - 4) * 12 - 9);
}

/** "Dm", "F# minor", "Bb", "C major" → the root as semitones from A and the mode. */
export function parseKey(key: string | undefined): { root: number; mode: "major" | "minor" } {
  const m = /^\s*([A-Ga-g])\s*([#b♯♭]?)\s*(m\b|min|minor|maj|major)?\s*$/i.exec(key ?? "");
  if (!m) return { root: 0, mode: "minor" };
  let n = NOTE_INDEX[m[1]!.toUpperCase()]! - 9;
  if (m[2] === "#" || m[2] === "♯") n += 1;
  if (m[2] === "b" || m[2] === "♭") n -= 1;
  const q = (m[3] ?? "").toLowerCase();
  return { root: ((n % 12) + 12) % 12, mode: q.startsWith("maj") ? "major" : q ? "minor" : m[1] === m[1]!.toUpperCase() && !q ? "major" : "minor" };
}

/** The chord tones (semitones from A4) of a degree in a key, voiced around a centre. */
function chordTones(root: number, mode: "major" | "minor", degree: 1 | 4 | 6, centre: number): number[] {
  const scale = mode === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  const d = degree - 1;
  const notes = [scale[d]!, scale[(d + 2) % 7]! + (d + 2 >= 7 ? 12 : 0), scale[(d + 4) % 7]! + (d + 4 >= 7 ? 12 : 0)];
  return notes.map((n) => {
    let s = root + n + centre;
    while (s > centre + 7) s -= 12;
    while (s < centre - 7) s += 12;
    return s;
  });
}

// ---------------------------------------------------------------------------------------------
// Synths — each renders a mono buffer at SR
// ---------------------------------------------------------------------------------------------

type Mono = Float32Array;
interface Voice {
  buf: Mono;
  /** Reverb send, 0–1. */
  send: number;
  /** How much the bed ducks under it, 0–1. */
  duck: number;
}

const BASE_LEVEL: Record<SoundKind, number> = {
  whoosh: 0.5,
  hit: 0.95,
  stamp: 1.05,
  pop: 0.5,
  tick: 0.34,
  click: 0.3,
  riser: 0.5,
  fall: 0.45,
  sub: 0.95,
  shimmer: 0.32,
  ding: 0.5,
  swell: 0.32,
  zap: 0.5,
  type: 0.4,
  scratch: 0.32,
  tone: 0.42,
  chord: 0.45,
};

const DEFAULT_DUR: Partial<Record<SoundKind, number>> = { whoosh: 0.45, riser: 1, fall: 0.8, shimmer: 1.2, swell: 0.8, zap: 0.28, type: 0.8, scratch: 0.8, tone: 0.6, chord: 1.2 };

const alloc = (sec: number) => new Float32Array(Math.max(1, Math.round(sec * SR)));
const envAD = (t: number, a: number, tau: number) => (t < a ? t / a : Math.exp(-(t - a) / tau));

function whoosh(dur: number, pitch: number, r: () => number): Voice {
  const buf = alloc(dur);
  const f = new Svf();
  const n = buf.length;
  const base = 260 * semis(pitch) * (0.9 + 0.2 * r());
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const bell = Math.sin(Math.PI * p);
    f.set(base * Math.pow(2, 3.4 * Math.pow(bell, 0.85)), 1.4);
    f.run(r() * 2 - 1);
    buf[i] = (f.bp * 1.7 + f.lp * 0.25) * Math.pow(bell, 1.6);
  }
  return { buf, send: 0.22, duck: 0 };
}

function hit(pitch: number, r: () => number, heavy: boolean): Voice {
  const dur = heavy ? 0.75 : 0.5;
  const buf = alloc(dur);
  const n = buf.length;
  const body = new Svf();
  body.set(heavy ? 900 : 1800, 0.9);
  const click = new Svf();
  click.set(3200, 0.8);
  const f0 = (heavy ? 120 : 170) * semis(pitch);
  const f1 = (heavy ? 38 : 48) * semis(pitch);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const freq = f1 + (f0 - f1) * Math.exp(-t / (heavy ? 0.09 : 0.06));
    ph += (TAU * freq) / SR;
    const sub = Math.sin(ph) * envAD(t, 0.002, heavy ? 0.22 : 0.14);
    const w = r() * 2 - 1;
    body.run(w);
    click.run(w);
    const slap = body.lp * envAD(t, 0.001, heavy ? 0.05 : 0.03) * (heavy ? 1 : 0.8);
    const tk = click.hp * (t < 0.004 ? 1 - t / 0.004 : 0) * 0.5;
    const rattle = heavy ? Math.sin(TAU * 70 * t) * Math.sin(TAU * 11 * t) * Math.exp(-t / 0.12) * 0.25 : 0;
    const x = sub + slap + tk + rattle;
    buf[i] = Math.tanh(x * 1.5);
  }
  return { buf, send: heavy ? 0.4 : 0.3, duck: 1 };
}

function pop(pitch: number, r: () => number): Voice {
  const buf = alloc(0.2);
  const n = buf.length;
  const f1 = 330 * semis(pitch) * (0.95 + 0.1 * r());
  const f0 = f1 * 3.4;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * (f1 + (f0 - f1) * Math.exp(-t / 0.018))) / SR;
    buf[i] = Math.sin(ph) * envAD(t, 0.001, 0.045) + (r() * 2 - 1) * (t < 0.0015 ? 0.5 : 0);
  }
  return { buf, send: 0.15, duck: 0.35 };
}

function tick(pitch: number, r: () => number, soft = false): Voice {
  const buf = alloc(0.06);
  const n = buf.length;
  const f = new Svf();
  f.set((soft ? 2000 : 2700) * semis(pitch), 7);
  const fb = 1700 * semis(pitch);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    f.run(r() * 2 - 1);
    buf[i] = f.bp * 2.2 * envAD(t, 0.0005, 0.009) + Math.sin(TAU * fb * t) * envAD(t, 0.0005, 0.006) * 0.5;
  }
  return { buf, send: 0.1, duck: 0 };
}

function click(pitch: number, r: () => number): Voice {
  const buf = alloc(0.05);
  const n = buf.length;
  const f = new Svf();
  f.set(4200 * semis(pitch), 1);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    f.run(r() * 2 - 1);
    buf[i] = f.hp * envAD(t, 0.0003, 0.003) * 1.4 + Math.sin(TAU * 1400 * semis(pitch) * t) * envAD(t, 0.0005, 0.012) * 0.6;
  }
  return { buf, send: 0.08, duck: 0 };
}

function riser(dur: number, pitch: number, r: () => number, down: boolean): Voice {
  const buf = alloc(dur);
  const n = buf.length;
  const f = new Svf();
  let ph = 0;
  const lo = 110 * semis(pitch);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let p = i / n;
    if (down) p = 1 - p;
    f.set(300 * Math.pow(2, 4.3 * p), 1.1);
    f.run(r() * 2 - 1);
    const trem = 0.7 + 0.3 * Math.sin(TAU * (3 + 22 * p * p) * t);
    const amp = Math.pow(p, down ? 1.4 : 1.8);
    ph += (TAU * lo * Math.pow(2, 2 * p)) / SR;
    const tone = Math.sin(ph) * Math.pow(p, 2) * 0.4;
    const edge = down ? Math.min(1, t / 0.01) : Math.min(1, (dur - t) / 0.012);
    buf[i] = (f.hp * 1.1 * trem * amp + f.bp * 0.4 * amp + tone) * edge;
  }
  return { buf, send: 0.3, duck: 0 };
}

function sub(pitch: number): Voice {
  const buf = alloc(0.75);
  const n = buf.length;
  const f0 = 72 * semis(pitch), f1 = 34 * semis(pitch);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (TAU * (f1 + (f0 - f1) * Math.exp(-t / 0.12))) / SR;
    buf[i] = (Math.sin(ph) + Math.sin(2 * ph) * 0.2) * envAD(t, 0.005, 0.26);
  }
  return { buf, send: 0.15, duck: 1 };
}

function shimmer(dur: number, pitch: number, r: () => number): Voice {
  const buf = alloc(dur);
  const n = buf.length;
  const parts: Array<{ f: number; on: number; tau: number; a: number; vib: number; ph: number }> = [];
  for (let k = 0; k < 7; k++) {
    const f = (1400 + 3800 * r()) * semis(pitch);
    parts.push({ f, on: r() * dur * 0.35, tau: dur * (0.25 + 0.2 * r()), a: Math.sqrt(1400 / f), vib: 5 + 2 * r(), ph: r() * TAU });
  }
  const air = new Svf();
  air.set(6000, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let x = 0;
    for (const p of parts) {
      if (t < p.on) continue;
      const dt = t - p.on;
      x += Math.sin(p.ph + TAU * p.f * dt * (1 + 0.003 * Math.sin(TAU * p.vib * dt))) * p.a * envAD(dt, 0.03, p.tau);
    }
    air.run(r() * 2 - 1);
    buf[i] = x * 0.3 + air.hp * 0.05 * Math.sin(Math.PI * (i / n));
  }
  return { buf, send: 0.6, duck: 0 };
}

function ding(hz: number): Voice {
  const buf = alloc(1.8);
  const n = buf.length;
  const ratios = [1, 2, 3.01, 4.16, 5.43];
  const amps = [1, 0.5, 0.3, 0.18, 0.1];
  const scale = Math.sqrt(880 / hz);
  const taus = [1.5, 0.8, 0.55, 0.38, 0.22].map((x) => x * scale);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const bend = 1 + 0.01 * Math.exp(-t / 0.02);
    let x = 0;
    for (let k = 0; k < ratios.length; k++) x += Math.sin(TAU * hz * ratios[k]! * bend * t) * amps[k]! * envAD(t, 0.002, taus[k]!);
    buf[i] = x * 0.5;
  }
  return { buf, send: 0.5, duck: 0.3 };
}

function swell(dur: number, pitch: number, r: () => number): Voice {
  const buf = alloc(dur);
  const n = buf.length;
  const f = new Svf();
  const base = 110 * semis(pitch);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = i / n;
    const bell = Math.pow(Math.sin(Math.PI * p), 2);
    f.set(300 + 900 * Math.sin(Math.PI * Math.min(1, p * 1.3)), 0.8);
    f.run(r() * 2 - 1);
    buf[i] = f.lp * 0.7 * bell + Math.sin(TAU * base * t * (1 + 0.02 * Math.sin(TAU * 0.7 * t))) * 0.45 * bell;
  }
  return { buf, send: 0.45, duck: 0 };
}

function zap(dur: number, pitch: number, r: () => number): Voice {
  const buf = alloc(dur);
  const n = buf.length;
  const f = new Svf();
  f.set(900, 0.8);
  let gate = 1, next = 0, hold = 0, holdN = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (i >= next) {
      gate = r() < 0.55 ? 1 : 0;
      next = i + Math.floor(SR / (45 + 60 * r()));
    }
    const dec = Math.max(1, Math.floor(1 + 14 * (i / n)));
    if (holdN-- <= 0) {
      hold = r() * 2 - 1;
      holdN = dec;
    }
    f.run(hold);
    ph += (TAU * (180 + 2000 * Math.exp(-t / 0.05)) * semis(pitch)) / SR;
    const chirp = (Math.sin(ph) > 0 ? 1 : -1) * 0.35 * Math.exp(-t / 0.06);
    buf[i] = (f.hp * 1.2 * gate + chirp) * envAD(t, 0.001, 0.12);
  }
  return { buf, send: 0.12, duck: 0.2 };
}

function typing(dur: number, pitch: number, r: () => number): Voice {
  const buf = alloc(dur + 0.08);
  let t0 = 0.0;
  while (t0 < dur) {
    const k = tick(pitch + (r() - 0.5) * 5, r);
    const start = Math.floor(t0 * SR);
    const vel = 0.7 + 0.3 * r();
    for (let i = 0; i < k.buf.length && start + i < buf.length; i++) buf[start + i]! += k.buf[i]! * vel;
    // the key going down
    for (let i = 0; i < 400 && start + i < buf.length; i++) buf[start + i]! += Math.sin(TAU * 190 * (i / SR)) * envAD(i / SR, 0.0005, 0.004) * 0.35 * vel;
    t0 += 0.065 + 0.05 * r() + (r() < 0.12 ? 0.08 : 0);
  }
  return { buf, send: 0.1, duck: 0 };
}

function scratch(dur: number, pitch: number, r: () => number): Voice {
  const buf = alloc(dur);
  const n = buf.length;
  const f = new Svf();
  let wob = 0.5;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = i / n;
    if (i % 240 === 0) wob += (r() - 0.5) * 0.5, (wob = clamp(wob, 0.1, 1));
    f.set(2200 * semis(pitch) * (0.8 + 0.4 * wob), 2.2);
    f.run(r() * 2 - 1);
    const grit = 0.75 + 0.25 * Math.sin(TAU * (28 + 30 * wob) * t);
    buf[i] = f.bp * 1.6 * grit * wob * Math.pow(Math.sin(Math.PI * p), 0.5);
  }
  return { buf, send: 0.15, duck: 0 };
}

function tone(dur: number, hz: number, r: () => number): Voice {
  const buf = alloc(dur);
  const n = buf.length;
  const rel = dur * 0.3;
  const ph0 = r() * TAU;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const vib = 1 + 0.004 * Math.sin(TAU * 5.5 * t);
    const env = Math.min(1, t / 0.015) * (t > dur - rel ? (dur - t) / rel : 1);
    buf[i] = (Math.sin(ph0 + TAU * hz * vib * t) + Math.sin(3 * (ph0 + TAU * hz * vib * t)) / 9) * env * 0.8;
  }
  return { buf, send: 0.35, duck: 0 };
}

/** Detuned saws through a low-pass: one chord, with its attack and release inside [0, dur]. */
function pad(dur: number, hzs: number[], level: number, bright: number, r: () => number, attack: number, release: number): Mono {
  const buf = alloc(dur);
  const n = buf.length;
  const f = new Svf();
  const voices = hzs.flatMap((hz) => [-1, 1].map((d) => ({ hz: hz * semis((d * (5 + 3 * r())) / 100), ph: r() })));
  const subHz = Math.min(...hzs) / 2;
  const lfo = r() * TAU;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let x = 0;
    for (const v of voices) {
      v.ph += v.hz / SR;
      if (v.ph >= 1) v.ph -= 1;
      x += v.ph * 2 - 1;
    }
    x /= voices.length;
    x += Math.sin(TAU * subHz * t) * 0.35;
    f.set(380 * Math.pow(2, 1.6 * bright) * (1 + 0.2 * Math.sin(lfo + TAU * 0.09 * t)), 0.7);
    f.run(x);
    const env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
    buf[i] = f.lp * level * env;
  }
  return buf;
}

// ---------------------------------------------------------------------------------------------
// Room: a Schroeder reverb (four combs, two allpasses), stereo by different delays each side
// ---------------------------------------------------------------------------------------------

function reverb(inL: Mono, inR: Mono, wet: number): [Mono, Mono] {
  const n = inL.length;
  const mk = (delays: number[], aps: number[]) => {
    const combs = delays.map((d) => ({ buf: new Float32Array(d), i: 0, lp: 0 }));
    const all = aps.map((d) => ({ buf: new Float32Array(d), i: 0 }));
    return (x: number): number => {
      let y = 0;
      for (const c of combs) {
        const out = c.buf[c.i]!;
        c.lp = out * 0.8 + c.lp * 0.2;
        c.buf[c.i] = x + c.lp * 0.78;
        c.i = (c.i + 1) % c.buf.length;
        y += out;
      }
      y /= combs.length;
      for (const a of all) {
        const b = a.buf[a.i]!;
        const v = y + b * 0.5;
        a.buf[a.i] = v;
        a.i = (a.i + 1) % a.buf.length;
        y = b - 0.5 * v;
      }
      return y;
    };
  };
  const L = mk([1215, 1293, 1390, 1476], [605, 480]);
  const R = mk([1238, 1316, 1413, 1499], [628, 503]);
  const oL = new Float32Array(n), oR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const m = (inL[i]! + inR[i]!) * 0.5;
    oL[i] = L(m) * wet;
    oR[i] = R(m) * wet;
  }
  return [oL, oR];
}

// ---------------------------------------------------------------------------------------------
// The spec
// ---------------------------------------------------------------------------------------------

/** A spec as a program (or an agent) returned it, cleaned: unknown kinds dropped with a warning, numbers read. */
export function normalizeSoundSpec(raw: unknown, duration: number): { spec: SoundSpec; warnings: string[] } {
  const warnings: string[] = [];
  const spec: SoundSpec = {};
  if (raw == null || raw === false) return { spec, warnings };
  const obj: Record<string, unknown> = Array.isArray(raw) ? { cues: raw } : typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cues: SoundCue[] = [];
  for (const c of Array.isArray(obj.cues) ? (obj.cues as unknown[]) : []) {
    if (!c || typeof c !== "object") continue;
    const q = c as Record<string, unknown>;
    const kind = String(q.kind ?? q.sound ?? "");
    if (!(SOUND_KINDS as readonly string[]).includes(kind)) {
      warnings.push(`sound: "${kind}" is not a sound (${SOUND_KINDS.join(", ")})`);
      continue;
    }
    const at = Number(q.at);
    if (!Number.isFinite(at)) {
      warnings.push(`sound: a ${kind} cue has no time (at)`);
      continue;
    }
    const cue: SoundCue = { at: clamp(at < 0 ? duration + at : at, 0, duration), kind: kind as SoundKind };
    if (Number.isFinite(Number(q.dur)) && Number(q.dur) > 0) cue.dur = clamp(Number(q.dur), 0.02, 60);
    if (Number.isFinite(Number(q.level))) cue.level = clamp(Number(q.level), 0, 2);
    if (Number.isFinite(Number(q.pitch))) cue.pitch = clamp(Number(q.pitch), -36, 36);
    if (Number.isFinite(Number(q.pan))) cue.pan = clamp(Number(q.pan), -1, 1);
    if (Number.isFinite(Number(q.seed))) cue.seed = Number(q.seed);
    if (typeof q.note === "string" && noteHz(q.note) !== null) cue.note = q.note;
    cues.push(cue);
  }
  if (cues.length) spec.cues = cues;
  if (obj.bed !== undefined) {
    const b = obj.bed;
    if (b === true || typeof b === "string") spec.bed = b;
    else if (b && typeof b === "object") {
      const o = b as Record<string, unknown>;
      const bed: SoundBed = {};
      if (typeof o.key === "string") bed.key = o.key;
      if (o.mode === "major" || o.mode === "minor") bed.mode = o.mode;
      if (Number.isFinite(Number(o.from))) bed.from = Math.max(0, Number(o.from));
      if (Number.isFinite(Number(o.to))) bed.to = Number(o.to) < 0 ? duration + Number(o.to) : Number(o.to);
      if (Number.isFinite(Number(o.level))) bed.level = clamp(Number(o.level), 0, 1);
      if (Number.isFinite(Number(o.tone))) bed.tone = clamp(Number(o.tone), 0, 1);
      spec.bed = bed;
    } else spec.bed = false;
  }
  if (obj.auto !== undefined) spec.auto = Boolean(obj.auto);
  if (Number.isFinite(Number(obj.level))) spec.level = clamp(Number(obj.level), 0, 2);
  if (Number.isFinite(Number(obj.room))) spec.room = clamp(Number(obj.room), 0, 1);
  return { spec, warnings };
}

/** The bed a spec asks for, in full, or null. */
export function bedOf(b: SoundSpec["bed"], duration: number): SoundBed | null {
  if (!b) return null;
  const base: SoundBed = b === true ? {} : typeof b === "string" ? { ...parseKeyToBed(b) } : { ...b };
  const k = parseKey(base.key);
  return { key: base.key ?? "A", mode: base.mode ?? k.mode, from: clamp(base.from ?? 0, 0, duration), to: clamp(base.to ?? duration, 0, duration), level: base.level ?? 0.5, tone: base.tone ?? 0.4 };
}

function parseKeyToBed(key: string): SoundBed {
  const k = parseKey(key);
  const name = /^\s*([A-Ga-g][#b♯♭]?)/.exec(key)?.[1] ?? "A";
  return { key: name, mode: k.mode };
}

// ---------------------------------------------------------------------------------------------
// From the motion trace to cues
// ---------------------------------------------------------------------------------------------

/**
 * Cues for a graphic nobody wrote sound for, from the runtime's trace: a pop for each spring, a
 * whoosh for each move across the frame (louder the further it travels), ticks for letters and
 * words, typing for a typewriter, an impact for a slam or a stamp, a zap for a glitch, sparkle for a
 * burst. Dense runs (letters staggering in, bars growing one after another) become one soft run of
 * ticks instead of a dozen pops.
 */
export function cuesFromMarks(marks: TraceMark[], duration: number): SoundCue[] {
  const list = marks
    .filter((m) => Number.isFinite(m[1]) && m[1] >= -0.01 && m[1] <= duration + 0.01)
    .map((m) => ({ kind: m[0], at: Math.max(0, Math.round(m[1] * 1000) / 1000, 0), a: m[2], b: m[3] }))
    .sort((x, y) => x.at - y.at);
  // The pose helpers nest (enter → pop + fade): one mark per moment, the most specific kept.
  const RANK: Record<string, number> = { stamp: 9, shake: 8, burst: 7, flash: 7, enter: 6, reveal: 6, typed: 6, write: 6, ink: 6, press: 6, underline: 5, strike: 5, count: 5, bar: 5, pop: 4, bump: 3, letter: 2, word: 2, fade: 1, exit: 1, beat: 0 };
  const moments: Array<{ kind: string; at: number; a: number | null; b: number | null; n: number }> = [];
  for (const m of list) {
    if (m.kind === "beat") continue;
    const last = moments[moments.length - 1];
    if (last && Math.abs(last.at - m.at) < 0.012) {
      last.n++;
      if ((RANK[m.kind] ?? 0) > (RANK[last.kind] ?? 0)) Object.assign(last, { kind: m.kind, a: m.a, b: m.b });
      continue;
    }
    moments.push({ ...m, n: 1 });
  }
  const cues: SoundCue[] = [];
  const unit = new Set(["letter", "word", "bump", "pop", "bar", "enter", "fade"]);
  let i = 0;
  while (i < moments.length) {
    const m = moments[i]!;
    // A run: four or more unit-like moments inside 0.9 s → ticks, the first one keeping its own sound.
    let j = i;
    if (unit.has(m.kind)) while (j + 1 < moments.length && unit.has(moments[j + 1]!.kind) && moments[j + 1]!.at - moments[j]!.at < 0.26 && moments[j + 1]!.at - m.at < 0.9) j++;
    if (j - i + 1 >= 4) {
      const n = j - i + 1;
      cues.push(...cueFor(m, duration));
      for (let k = i + 1; k <= j; k++) cues.push({ at: moments[k]!.at, kind: "tick", level: 0.75 - (0.35 * (k - i)) / n, pitch: Math.min(10, (k - i) * (9 / n)), pan: ((k - i) / n - 0.5) * 0.5 });
      i = j + 1;
      continue;
    }
    cues.push(...cueFor(m, duration));
    i++;
  }
  // Soft kinds step aside when something else lands within 150 ms.
  const strong = cues.filter((c) => c.kind !== "swell" && c.kind !== "tick");
  const out = cues.filter((c) => (c.kind !== "swell" ? true : !strong.some((s) => Math.abs(s.at - c.at) < 0.15)));
  // Not too many: a 60-cue ceiling, ticks thinned first.
  if (out.length > 60) {
    const ticks = out.filter((c) => c.kind === "tick");
    const keepEvery = Math.ceil(ticks.length / Math.max(1, 60 - (out.length - ticks.length)));
    let k = 0;
    return out.filter((c) => c.kind !== "tick" || k++ % keepEvery === 0);
  }
  return out;
}

function cueFor(m: { kind: string; at: number; a: number | null; b: number | null; n: number }, duration: number): SoundCue[] {
  const at = m.at;
  switch (m.kind) {
    case "stamp":
      return [{ at, kind: "stamp" }];
    case "shake":
      return [{ at, kind: "hit", level: clamp(0.6 + (m.a ?? 18) / 60, 0.6, 1.1) }];
    case "burst":
      return [{ at, kind: "pop", level: 0.9 }, { at, kind: "shimmer", level: 0.8, dur: 1 }];
    case "flash":
      return [{ at, kind: "zap", level: 0.7 }];
    case "enter": {
      const dist = Math.hypot(m.a ?? 0, m.b ?? 40);
      return dist < 12 ? [{ at, kind: "pop", level: 0.7 }] : [{ at, kind: "whoosh", level: clamp(0.45 + dist / 360, 0.45, 1), dur: clamp(0.3 + dist / 900, 0.3, 0.6), pan: (m.a ?? 0) > 0 ? 0.25 : (m.a ?? 0) < 0 ? -0.25 : 0 }];
    }
    case "reveal":
      return [{ at, kind: "whoosh", pitch: 4, dur: 0.45, level: 0.8 }];
    case "typed":
      return [{ at, kind: "type", dur: clamp(m.a ?? 0.8, 0.15, 6) }];
    case "write":
    case "ink":
      return [{ at, kind: "scratch", dur: clamp(m.a ?? 0.8, 0.15, 6), pitch: m.b ? 3 : 0 }];
    case "press":
      return [{ at, kind: "click" }];
    case "underline":
      return [{ at, kind: "whoosh", pitch: 12, dur: 0.3, level: 0.6 }];
    case "strike":
      return [{ at, kind: "whoosh", pitch: 2, dur: 0.3, level: 0.7 }, { at: at + 0.12, kind: "hit", level: 0.5 }];
    case "count":
      return [{ at, kind: "type", dur: clamp(m.a ?? 0.8, 0.2, 4), level: 0.6, pitch: 4 }];
    case "bar":
      return [{ at, kind: "pop", level: 0.7, pitch: 3 }];
    case "pop":
      return [{ at, kind: "pop", level: m.n > 1 ? 0.9 : 0.8 }];
    case "bump":
      return [{ at, kind: "tick", level: 0.8 }];
    case "letter":
      return [{ at, kind: "tick", level: 0.6 }];
    case "word":
      return [{ at, kind: "tick", level: 0.7, pitch: -4 }];
    case "fade":
      return [{ at, kind: "swell", level: 0.7 }];
    case "exit":
      return at > duration - 0.05 ? [] : [{ at, kind: "whoosh", level: 0.45, pitch: -5, dur: 0.35 }];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------------------------

function voiceFor(cue: SoundCue, bed: SoundBed | null, index: number): Voice {
  const seed = cue.seed ?? index * 7.13 + cue.at * 3.7 + cue.kind.length;
  const r = rng(seed);
  const pitch = cue.pitch ?? 0;
  const dur = cue.dur ?? DEFAULT_DUR[cue.kind] ?? 0.5;
  switch (cue.kind) {
    case "whoosh":
      return whoosh(dur, pitch, r);
    case "hit":
      return hit(pitch, r, false);
    case "stamp":
      return hit(pitch, r, true);
    case "pop":
      return pop(pitch, r);
    case "tick":
      return tick(pitch, r);
    case "click":
      return click(pitch, r);
    case "riser":
      return riser(dur, pitch, r, false);
    case "fall":
      return riser(dur, pitch, r, true);
    case "sub":
      return sub(pitch);
    case "shimmer":
      return shimmer(dur, pitch, r);
    case "ding":
      return ding((cue.note ? noteHz(cue.note) : null) ?? 880 * semis(pitch));
    case "swell":
      return swell(dur, pitch, r);
    case "zap":
      return zap(dur, pitch, r);
    case "type":
      return typing(dur, pitch, r);
    case "scratch":
      return scratch(dur, pitch, r);
    case "tone":
      return tone(dur, (cue.note ? noteHz(cue.note) : null) ?? 440 * semis(pitch), r);
    case "chord": {
      const k = parseKey(bed?.key ? `${bed.key}${bed.mode === "major" ? "" : "m"}` : "Am");
      const centre = -12 + pitch;
      const hz = cue.note ? [noteHz(cue.note)!, noteHz(cue.note)! * semis(bed?.mode === "major" ? 4 : 3), noteHz(cue.note)! * semis(7)] : chordTones(k.root, k.mode, 1, centre).map((s) => 440 * semis(s));
      return { buf: pad(dur, hz, 1.1, bed?.tone ?? 0.5, r, Math.min(0.06, dur * 0.2), Math.max(0.05, dur * 0.3)), send: 0.4, duck: 0 };
    }
  }
}

/** Mix cues and a bed into stereo PCM, duration seconds long, at 48 kHz. */
export function renderSound(spec: SoundSpec, duration: number, opts: { sampleRate?: number } = {}): RenderedSound {
  const sr = SR;
  void opts;
  const warnings: string[] = [];
  const n = Math.max(1, Math.round(duration * sr));
  const L = new Float32Array(n), R = new Float32Array(n), sL = new Float32Array(n), sR = new Float32Array(n);
  const cues = (spec.cues ?? []).filter((c) => c.at >= 0 && c.at <= duration).sort((a, b) => a.at - b.at);
  const ducks: Array<{ at: number; depth: number }> = [];
  cues.forEach((cue, idx) => {
    const v = voiceFor(cue, bedOf(spec.bed, duration), idx);
    const level = BASE_LEVEL[cue.kind] * (cue.level ?? 1);
    const pan = clamp(cue.pan ?? 0, -1, 1);
    const gl = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * 0.78;
    const gr = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * 0.78;
    const start = Math.round(cue.at * sr);
    for (let i = 0; i < v.buf.length; i++) {
      const j = start + i;
      if (j >= n) break;
      const x = v.buf[i]! * level;
      L[j]! += x * gl;
      R[j]! += x * gr;
      sL[j]! += x * gl * v.send;
      sR[j]! += x * gr * v.send;
    }
    if (v.duck > 0) ducks.push({ at: cue.at, depth: v.duck * clamp(cue.level ?? 1, 0, 1.2) });
  });

  const bed = bedOf(spec.bed, duration);
  if (bed && bed.to! > bed.from! + 0.2) {
    const r = rng(11.7);
    const k = parseKey(`${bed.key}${bed.mode === "major" ? "" : "m"}`);
    const len = bed.to! - bed.from!;
    const two = len > 5;
    const split = two ? bed.from! + len * 0.55 : bed.to!;
    const degreeB = bed.mode === "major" ? 4 : 6;
    const lvl = 0.26 * bed.level!;
    const chords: Array<{ from: number; to: number; tones: number[] }> = [{ from: bed.from!, to: two ? split + 0.6 : bed.to!, tones: chordTones(k.root, k.mode, 1, -15) }];
    if (two) chords.push({ from: split - 0.2, to: bed.to!, tones: chordTones(k.root, k.mode, degreeB as 4 | 6, -15) });
    chords.forEach((ch, ci) => {
      const hz = ch.tones.map((s) => 440 * semis(s));
      hz.push(440 * semis(ch.tones[0]! + 12));
      const d = ch.to - ch.from;
      const attack = ci === 0 ? Math.min(1.4, d * 0.35) : 0.7;
      const release = Math.min(1.6, d * 0.4);
      const mL = pad(d, hz, lvl, bed.tone!, rng(3.3 + ci), attack, release);
      const mR = pad(d, hz, lvl, bed.tone!, rng(9.1 + ci), attack, release);
      const start = Math.round(ch.from * sr);
      for (let i = 0; i < mL.length; i++) {
        const j = start + i;
        if (j >= n) break;
        const t = j / sr;
        // The bed steps back under every impact and comes back over a third of a second.
        let g = 1;
        for (const dk of ducks) {
          const dt = t - dk.at;
          if (dt >= 0 && dt < 1.2) g -= 0.4 * dk.depth * (dt < 0.006 ? dt / 0.006 : Math.exp(-(dt - 0.006) / 0.33));
        }
        g = Math.max(0.35, g);
        L[j]! += mL[i]! * g;
        R[j]! += mR[i]! * g;
        sL[j]! += mL[i]! * g * 0.3;
        sR[j]! += mR[i]! * g * 0.3;
      }
    });
    void r;
  }

  const room = spec.room ?? 0.25;
  if (room > 0) {
    const [wL, wR] = reverb(sL, sR, 1.4 * room);
    for (let i = 0; i < n; i++) {
      L[i]! += wL[i]!;
      R[i]! += wR[i]!;
    }
  }

  // Master: level, edges, a limiter (peak follower, 120 ms release) and a soft knee above 0.8.
  const master = 0.85 * (spec.level ?? 1);
  const rel = Math.exp(-1 / (0.12 * sr));
  const ceiling = 0.95;
  let env = 0, peak = 0;
  const fadeIn = Math.round(0.02 * sr), fadeOut = Math.round(0.06 * sr);
  for (let i = 0; i < n; i++) {
    let l = L[i]! * master, r2 = R[i]! * master;
    const edge = (i < fadeIn ? i / fadeIn : 1) * (i > n - fadeOut ? (n - i) / fadeOut : 1);
    l *= edge;
    r2 *= edge;
    const a = Math.max(Math.abs(l), Math.abs(r2));
    env = Math.max(a, env * rel);
    const g = env > ceiling ? ceiling / env : 1;
    l = knee(l * g);
    r2 = knee(r2 * g);
    L[i] = l;
    R[i] = r2;
    peak = Math.max(peak, Math.abs(l), Math.abs(r2));
  }
  return { left: L, right: R, sampleRate: sr, cues, peak, bed, warnings };
}

function knee(x: number): number {
  const a = Math.abs(x);
  if (a <= 0.8) return x;
  return Math.sign(x) * (0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2));
}

/** 16-bit stereo PCM WAV. */
export function wavEncode(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array {
  const n = Math.min(left.length, right.length);
  const data = new Uint8Array(44 + n * 4);
  const dv = new DataView(data.buffer);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) data[o + i] = s.charCodeAt(i);
  };
  str(0, "RIFF");
  dv.setUint32(4, 36 + n * 4, true);
  str(8, "WAVE");
  str(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 2, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * 4, true);
  dv.setUint16(32, 4, true);
  dv.setUint16(34, 16, true);
  str(36, "data");
  dv.setUint32(40, n * 4, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    dv.setInt16(o, Math.round(clamp(left[i]!, -1, 1) * 32767), true);
    dv.setInt16(o + 2, Math.round(clamp(right[i]!, -1, 1) * 32767), true);
    o += 4;
  }
  return data;
}

/** One line per cue, for a terminal or an agent. */
export function describeCues(cues: SoundCue[]): string {
  return cues.map((c) => `  ${c.at.toFixed(2).padStart(6)} s  ${c.kind.padEnd(8)}${c.dur ? ` ${c.dur.toFixed(2)} s` : ""}${c.level !== undefined && c.level !== 1 ? ` ×${c.level.toFixed(2)}` : ""}${c.pitch ? ` ${c.pitch > 0 ? "+" : ""}${c.pitch} st` : ""}${c.note ? ` ${c.note}` : ""}${c.pan ? ` pan ${c.pan > 0 ? "R" : "L"}${Math.abs(c.pan).toFixed(1)}` : ""}`).join("\n");
}
