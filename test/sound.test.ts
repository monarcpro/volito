import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { SOUND_KINDS, type SoundKind, type TraceMark, cuesFromMarks, noteHz, normalizeSoundSpec, parseKey, renderSound, wavEncode } from "../src/sound.js";
import { customItem, designSound, findItem, openSession, renderSoundFile, renderVideo } from "../src/index.js";
import { soundHookAvailable } from "../src/node/sandbox.js";
import { probeFfmpeg } from "../src/node/ffmpeg.js";

const tmp = mkdtempSync(join(tmpdir(), "volito-sound-test-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** RMS of a channel between two times. */
function rms(buf: Float32Array, sr: number, a: number, b: number): number {
  const i0 = Math.floor(a * sr), i1 = Math.min(buf.length, Math.floor(b * sr));
  let s = 0;
  for (let i = i0; i < i1; i++) s += buf[i]! * buf[i]!;
  return Math.sqrt(s / Math.max(1, i1 - i0));
}

describe("notes and keys", () => {
  it("reads notes and keys", () => {
    expect(noteHz("A4")).toBeCloseTo(440, 3);
    expect(noteHz("C4")).toBeCloseTo(261.63, 1);
    expect(noteHz("Bb2")).toBeCloseTo(116.54, 1);
    expect(noteHz("H")).toBeNull();
    expect(parseKey("Dm")).toEqual({ root: 5, mode: "minor" });
    expect(parseKey("F major")).toEqual({ root: 8, mode: "major" });
    expect(parseKey("C#m")).toEqual({ root: 4, mode: "minor" });
    expect(parseKey(undefined).mode).toBe("minor");
  });
});

describe("the synth", () => {
  it("renders every kind where its cue is, under the ceiling, the same twice", () => {
    for (const kind of SOUND_KINDS) {
      const spec = { cues: [{ at: 0.5, kind: kind as SoundKind, note: kind === "ding" ? "A5" : undefined }] };
      const r = renderSound(spec, 2.5);
      expect(r.left.length).toBe(Math.round(2.5 * 48000));
      expect(rms(r.left, r.sampleRate, 0.05, 0.45), `${kind} is silent before its cue`).toBe(0);
      expect(rms(r.left, r.sampleRate, 0.5, 1.4), `${kind} makes a sound`).toBeGreaterThan(0.004);
      expect(r.peak, `${kind} stays under the ceiling`).toBeLessThanOrEqual(1);
      const again = renderSound(spec, 2.5);
      expect(Buffer.from(again.left.buffer).equals(Buffer.from(r.left.buffer)), `${kind} is deterministic`).toBe(true);
    }
  });

  it("pans, levels and a bed", () => {
    const right = renderSound({ cues: [{ at: 0.2, kind: "pop", pan: 0.9 }] }, 1);
    expect(rms(right.right, 48000, 0.2, 0.5)).toBeGreaterThan(rms(right.left, 48000, 0.2, 0.5) * 3);
    const loud = renderSound({ cues: [{ at: 0.2, kind: "tick", level: 1.5 }] }, 1);
    const quiet = renderSound({ cues: [{ at: 0.2, kind: "tick", level: 0.4 }] }, 1);
    expect(rms(loud.left, 48000, 0.2, 0.4)).toBeGreaterThan(rms(quiet.left, 48000, 0.2, 0.4) * 2);
    const bed = renderSound({ bed: "Dm" }, 4);
    expect(bed.bed).toMatchObject({ key: "D", mode: "minor", from: 0, to: 4 });
    expect(rms(bed.left, 48000, 1.5, 2.5)).toBeGreaterThan(0.01);
    expect(rms(bed.left, 48000, 3.98, 4)).toBeLessThan(0.01);
    expect(bed.peak).toBeLessThanOrEqual(1);
    // A pop under the bed ducks it: once the pop itself is over, the bed is still quieter than it is alone.
    const popped = renderSound({ bed: { key: "D", mode: "minor", level: 0.6 }, cues: [{ at: 2, kind: "pop", level: 1.2 }] }, 4);
    const alone = renderSound({ bed: { key: "D", mode: "minor", level: 0.6 } }, 4);
    expect(rms(popped.left, 48000, 2.24, 2.4)).toBeLessThan(rms(alone.left, 48000, 2.24, 2.4) * 0.985);
  });

  it("writes a 16-bit stereo WAV", () => {
    const r = renderSound({ cues: [{ at: 0.1, kind: "hit" }] }, 0.5);
    const wav = wavEncode(r.left, r.right, r.sampleRate);
    const n = Math.round(0.5 * 48000);
    expect(wav.length).toBe(44 + n * 4);
    expect(Buffer.from(wav.subarray(0, 4)).toString()).toBe("RIFF");
    expect(Buffer.from(wav.subarray(8, 12)).toString()).toBe("WAVE");
    const dv = new DataView(wav.buffer);
    expect(dv.getUint16(22, true)).toBe(2);
    expect(dv.getUint32(24, true)).toBe(48000);
    expect(dv.getUint16(34, true)).toBe(16);
    expect(dv.getUint32(40, true)).toBe(n * 4);
  });
});

describe("specs and the motion trace", () => {
  it("cleans a program's spec: unknown kinds dropped, times from the end, an array is cues", () => {
    const { spec, warnings } = normalizeSoundSpec({ cues: [{ at: -0.5, kind: "ding" }, { at: 1, kind: "kazoo" }, { kind: "hit" }], bed: { key: "F", to: -1 }, auto: false, level: 3 }, 4);
    expect(spec.cues).toEqual([{ at: 3.5, kind: "ding" }]);
    expect(spec.bed).toEqual({ key: "F", to: 3 });
    expect(spec.auto).toBe(false);
    expect(spec.level).toBe(2);
    expect(warnings.some((w) => w.includes("kazoo"))).toBe(true);
    expect(warnings.some((w) => w.includes("no time"))).toBe(true);
    expect(normalizeSoundSpec([{ at: 1, kind: "pop" }], 4).spec.cues).toEqual([{ at: 1, kind: "pop" }]);
    expect(normalizeSoundSpec(null, 4).spec).toEqual({});
  });

  it("turns marks into cues: nested pose marks are one sound, runs become ticks, kinds map", () => {
    const marks: TraceMark[] = [
      ["enter", 0.3, 0, 300, 1],
      ["pop", 0.3, null, null, 1],
      ["fade", 0.3, null, null, 1],
      ["stamp", 1.2, null, null, 1],
      ["typed", 2, 1.2, null, 1],
      ["flash", 3, null, null, 1],
    ];
    for (let i = 0; i < 8; i++) marks.push(["bump", 4 + i * 0.05, null, null, 1]);
    const cues = cuesFromMarks(marks, 6);
    expect(cues.filter((c) => Math.abs(c.at - 0.3) < 0.01)).toHaveLength(1);
    expect(cues.find((c) => c.at === 0.3)?.kind).toBe("whoosh");
    expect(cues.find((c) => c.at === 1.2)?.kind).toBe("stamp");
    expect(cues.find((c) => c.at === 2)).toMatchObject({ kind: "type", dur: 1.2 });
    expect(cues.find((c) => c.at === 3)?.kind).toBe("zap");
    const run = cues.filter((c) => c.at >= 4);
    expect(run).toHaveLength(8);
    expect(run.slice(1).every((c) => c.kind === "tick")).toBe(true);
    expect(cuesFromMarks([["pop", 9, null, null, 1]], 6)).toEqual([]);
  });

  it("reads a program's sound($) through the sandbox, or none, or its error", async () => {
    expect(soundHookAvailable()).toBe(true);
    const withSound = customItem("function frame(t, $) { return $.circle(100, 100, 50, { fill: $.c.accent }); }\nfunction sound($) { return { cues: [{ at: $.dur - 0.5, kind: 'ding', note: 'E5' }], bed: 'Dm', auto: false }; }", { duration: 3 });
    const s = await openSession(withSound, { aspect: "1:1", width: 64 });
    expect(s.runner.sound()).toEqual({ spec: { cues: [{ at: 2.5, kind: "ding", note: "E5" }], bed: "Dm", auto: false } });
    const silent = await openSession(customItem("function frame(t, $) { return ''; }"), { width: 64 });
    expect(silent.runner.sound()).toEqual({ spec: null });
    const broken = await openSession(customItem("function frame(t, $) { return ''; }\nfunction sound($) { throw new Error('no idea'); }"), { width: 64 });
    expect(broken.runner.sound().error).toMatch(/sound: no idea/);
  });

  it("hears the kit: a pack item's parts leave marks a sound design reads", async () => {
    const s = await openSession(findItem("logo-sting"), { aspect: "16:9", width: 64 });
    const tr = s.runner.trace(30);
    const kinds = new Set(tr.marks.map((m) => (m as TraceMark)[0]));
    expect(kinds.has("enter") || kinds.has("pop")).toBe(true);
    expect(kinds.has("bump")).toBe(true);
    const cues = cuesFromMarks(tr.marks as TraceMark[], s.built.duration);
    expect(cues.length).toBeGreaterThan(3);
    expect(cues.some((c) => c.kind === "whoosh" || c.kind === "pop")).toBe(true);
    expect(cues.some((c) => c.kind === "tick")).toBe(true);
    const typed = await openSession(findItem("lower-third"), { width: 64, motion: { name: { in: "typewriter" } } });
    expect(typed.runner.trace(30).marks.some((m) => (m as TraceMark)[0] === "typed")).toBe(true);
  });

  it("the Volito intro designs its own sound: 32 cues on a D minor bed, no auto cues", async () => {
    const item = findItem(join(import.meta.dirname, "../examples/volito-intro"));
    expect(item.libs).toContain("3d");
    const s = await openSession(item, { style: readFileSync(join(import.meta.dirname, "../examples/volito-intro/DESIGN.md"), "utf8"), aspect: "1:1", width: 96 });
    const own = s.runner.sound() as { spec: { cues: unknown[]; bed: { key: string; mode: string }; auto: boolean } };
    expect(own.spec.cues).toHaveLength(32);
    expect(own.spec.bed).toMatchObject({ key: "D", mode: "minor" });
    expect(own.spec.auto).toBe(false);
    const { spec } = designSound(s, { sound: true });
    expect(spec.cues).toHaveLength(32);
    expect(s.built.style.colors.accent.toUpperCase()).toBe("#2433E8");
    expect(s.built.style.fonts.display).toMatch(/Bricolage Grotesque/);
  });

  it("renders a track alone, without ffmpeg", async () => {
    const r = await renderSoundFile(findItem("lower-third"), { out: join(tmp, "lt.wav"), props: { name: "Priya Sharma", role: "Product designer" } });
    expect(existsSync(r.file!)).toBe(true);
    expect(statSync(r.file!).size).toBe(44 + Math.round(r.duration * 48000) * 4);
    expect(r.cues.length).toBeGreaterThan(0);
    expect(r.bed).toBeNull();
    const bed = await renderSoundFile(findItem("lower-third"), { out: join(tmp, "lt-bed.wav"), bed: "F major" });
    expect(bed.bed).toMatchObject({ key: "F", mode: "major" });
  });

  it.skipIf(!probeFfmpeg())("muxes the track into an MP4", async () => {
    const r = await renderVideo(findItem("social"), { format: "mp4", width: 160, duration: 2, fps: 10, sound: true, soundOut: join(tmp, "social.wav"), out: join(tmp, "social.mp4") });
    expect(r.sound?.cues.length).toBeGreaterThan(0);
    expect(existsSync(join(tmp, "social.wav"))).toBe(true);
    const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "csv=p=0", r.file], { encoding: "utf8" });
    if (probe.status === 0) expect(probe.stdout.trim()).toBe("aac");
    expect(readFileSync(r.file).length).toBeGreaterThan(1000);
  });
});
