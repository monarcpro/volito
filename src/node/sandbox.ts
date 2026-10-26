/**
 * Where programs run in Node: a fresh `vm` context per program holding the same worker source
 * MONARC PRO runs in a blob worker (core programWorkerSource — the runtime, the program
 * inside a function that shadows every outside name, the network taken away). Only strings and
 * numbers cross between the context and the host: messages go in as JSON text and come back as
 * JSON text, and the one host function the runtime calls (text measure) is captured in a closure
 * and removed from the context's globals before any program code runs. A frame that runs past its
 * time limit (an endless loop) is stopped and the runner marked dead.
 *
 * `vm` is isolation for mistakes, not a security boundary: run packs you trust, as you would
 * any npm package.
 */
import vm from "node:vm";
import { type ProgramEnv, type TitleProgram, programWorkerSource } from "../engine.js";
import { measureText } from "./fonts.js";

export interface ProgramFrame {
  svg: string;
  defs: string;
  warnings: string[];
  ms: number;
}

/** A failure the program caused: a syntax error, a throw, a timeout. `line` is the program's own line. */
export class ProgramError extends Error {
  readonly line?: number;
  constructor(message: string, line?: number | null) {
    super(line ? `${message} (line ${line})` : message);
    this.name = "ProgramError";
    if (line) this.line = line;
  }
}

const SHIM = `
var self = globalThis;
self.postMessage = function (m) { self.__out = m; };
(function () {
  var measure = globalThis.__measure;
  delete globalThis.__measure;
  function Ctx() { this.font = "10px sans-serif"; }
  Ctx.prototype.measureText = function (s) {
    var w = measure(String(this.font), String(s));
    if (typeof w !== "number" || !isFinite(w)) { var m = /([\\d.]+)px/.exec(this.font); w = String(s).length * 0.55 * (m ? parseFloat(m[1]) : 16); }
    return { width: w };
  };
  function OffscreenCanvas() {}
  OffscreenCanvas.prototype.getContext = function () { return new Ctx(); };
  globalThis.OffscreenCanvas = OffscreenCanvas;
})();
`;

/** The worker's hand-back of the program's functions, as MONARC core writes it, and with Volito's `sound` beside them. */
const RETURN_LINE = "return { frame: typeof frame === 'function' ? frame : null, setup: typeof setup === 'function' ? setup : null };";
const RETURN_WITH_SOUND = "return { frame: typeof frame === 'function' ? frame : null, setup: typeof setup === 'function' ? setup : null, sound: typeof sound === 'function' ? sound : null };";

/** Whether this engine's worker source still has the line the sound hook patches (a test keeps it true). */
export function soundHookAvailable(): boolean {
  return programWorkerSource("function frame() { return ''; }").source.includes(RETURN_LINE);
}

interface Out {
  type: string;
  svg?: string;
  defs?: string;
  warnings?: string[];
  error?: string;
  line?: number | null;
  marks?: unknown[];
  frames?: number;
}

export class ProgramRunner {
  private readonly ctx: vm.Context;
  private readonly codeLine: number;
  private dead: ProgramError | null = null;

  private constructor(ctx: vm.Context, codeLine: number) {
    this.ctx = ctx;
    this.codeLine = codeLine;
  }

  /**
   * A runner with the program loaded and set up for `env`. Rejects with a ProgramError when it does not
   * start. `lineOffset` is how many lines of the code come before the author's own (the kit, a pack's helpers).
   */
  static async create(program: TitleProgram, env: ProgramEnv, timeoutMs = 5000, lineOffset = 0): Promise<ProgramRunner> {
    const built = programWorkerSource(program.code);
    const codeLine = built.codeLine;
    // Volito's own hook: a program may define `function sound($)` beside frame and setup.
    const source = built.source.includes(RETURN_LINE) ? built.source.replace(RETURN_LINE, RETURN_WITH_SOUND) : built.source;
    const measure = (font: unknown, text: unknown): number => {
      try {
        const w = measureText(String(font), String(text));
        return Number.isFinite(w) ? w : Number.NaN;
      } catch {
        return Number.NaN;
      }
    };
    const ctx = vm.createContext({ __measure: measure }, { codeGeneration: { strings: false, wasm: false } });
    const runner = new ProgramRunner(ctx, codeLine + Math.max(0, lineOffset));
    try {
      vm.runInContext(SHIM, ctx, { timeout: timeoutMs });
      vm.runInContext(source, ctx, { timeout: timeoutMs, filename: "program.js" });
    } catch (err) {
      throw new ProgramError(runner.message(err), runner.lineOf(err));
    }
    const ready = await runner.send({ type: "init", env, fonts: [] }, timeoutMs);
    if (ready?.error) throw new ProgramError(ready.error, runner.mapLine(ready.line));
    return runner;
  }

  private message(err: unknown): string {
    const msg = String((err as Error)?.message ?? err);
    return /timed out/i.test(msg) ? "the program took too long to start — an endless loop?" : msg;
  }

  private lineOf(err: unknown): number | undefined {
    const m = /program\.js:(\d+)/.exec(String((err as Error)?.stack ?? ""));
    return this.mapLine(m ? Number(m[1]) : null);
  }

  /** A line of the worker source as a line of the author's code (undefined inside the runtime, the kit or helpers). */
  private mapLine(line: number | null | undefined): number | undefined {
    return line && line >= this.codeLine ? line - this.codeLine + 1 : undefined;
  }

  /** Hand the worker source one message; it answers through postMessage into self.__out. */
  private post(msg: unknown, timeoutMs: number): void {
    this.ctx.__msg = JSON.stringify(msg);
    vm.runInContext("self.__out = null; self.onmessage({ data: JSON.parse(globalThis.__msg) }); globalThis.__msg = null;", this.ctx, { timeout: timeoutMs });
  }

  private read(): Out | null {
    const s = vm.runInContext("JSON.stringify(self.__out)", this.ctx) as string | undefined;
    return s ? (JSON.parse(s) as Out) : null;
  }

  private async send(msg: unknown, timeoutMs: number): Promise<Out | null> {
    this.post(msg, timeoutMs);
    // init awaits (its fonts) before it answers; frame and trace answer before they return.
    await new Promise((r) => setImmediate(r));
    return this.read();
  }

  private sendSync(msg: unknown, timeoutMs: number): Out | null {
    this.post(msg, timeoutMs);
    return this.read();
  }

  /** The SVG body of the frame at clip time `t`. Throws a ProgramError when the program fails. */
  frame(t: number, timeoutMs = 2000): ProgramFrame {
    if (this.dead) throw this.dead;
    const started = performance.now();
    let out: Out | null;
    try {
      out = this.sendSync({ type: "frame", id: 1, t }, timeoutMs);
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      this.dead = new ProgramError(/timed out/i.test(msg) ? `a frame took longer than ${(timeoutMs / 1000).toFixed(1)} s — an endless loop, or far too much drawing` : msg);
      throw this.dead;
    }
    if (!out) throw new ProgramError("the program returned nothing");
    if (out.error) throw new ProgramError(out.error, this.mapLine(out.line));
    return { svg: out.svg ?? "", defs: out.defs ?? "", warnings: out.warnings ?? [], ms: performance.now() - started };
  }

  /**
   * The program's own sound design: what `function sound($)` returns, read once with `$` at t = 0 ($.dur,
   * $.beat, $.at and $.data are there). `spec` is null when the program defines none; `error` when it threw.
   */
  sound(timeoutMs = 5000): { spec: unknown; error?: string } {
    if (this.dead) throw this.dead;
    let raw: string | null;
    try {
      raw = vm.runInContext(
        "(function () { if (!__program.sound) return null; var $ = MG.make(__env, 0); $.state = __state; try { return JSON.stringify({ spec: __program.sound($) }); } catch (err) { return JSON.stringify({ error: String(err && err.message || err), line: __line(err) }); } })()",
        this.ctx,
        { timeout: timeoutMs },
      ) as string | null;
    } catch (err) {
      return { spec: null, error: `sound: ${this.message(err)}` };
    }
    if (!raw) return { spec: null };
    const out = JSON.parse(raw) as { spec?: unknown; error?: string; line?: number | null };
    if (out.error) return { spec: null, error: new ProgramError(`sound: ${out.error}`, this.mapLine(out.line)).message };
    return { spec: out.spec ?? null };
  }

  /** Every frame run once with the runtime's trace on: when each element pops, slides, stamps or types in. */
  trace(fps: number, timeoutMs = 20000): { marks: unknown[]; frames: number; error?: string } {
    const out = this.sendSync({ type: "trace", id: 1, fps }, timeoutMs);
    return { marks: out?.marks ?? [], frames: out?.frames ?? 0, ...(out?.error ? { error: new ProgramError(out.error, this.mapLine(out.line)).message } : {}) };
  }
}
