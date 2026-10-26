/**
 * <volito-player>: a Volito graphic playing live in any web page, with optional controls and aspect
 * tabs. It wraps volito/browser's MotionPlayer (the same sandboxed engine a render uses) and keeps
 * its own clock, so it can play at any rate, inside a range, and stop with an `ended` event.
 *
 *   <script type="module" src="https://cdn.jsdelivr.net/npm/volito/dist/player.js"></script>
 *   <volito-player item="essentials/lower-third" props='{"name":"Ada Lovelace"}' aspects="all" controls autoplay loop></volito-player>
 *
 * It starts when it comes near the screen (loading="eager" to start at once), pauses off screen
 * and in a hidden tab, and does not autoplay for readers who prefer reduced motion.
 */
import { CDN_BASE, type MotionPlayer, type PlayerOptions, createPlayer, customItem, findItem, loadRegistry } from "../browser/index.js";
import { type BuildOptions, type MotionItem, type StyleInput, type StyleOverrides, parseAspect } from "../pack.js";
import { advance, aspectSize, canvasSize, formatTime, groundOf, numberAttr, parseAspects, parseBeats, parseJsonObject, parseMotionAttr, playRange } from "./attrs.js";
import { PAUSE_ICON, PLAYER_CSS, PLAY_ICON } from "./styles.js";

/** Events a <volito-player> fires. None bubbles, like a media element's. */
export interface VolitoPlayerEventMap {
  /** The graphic loaded and drew its first frame. */
  ready: CustomEvent<{ duration: number; width: number; height: number; aspect: string }>;
  /** About ten times a second while playing, and on every seek. */
  timeupdate: CustomEvent<{ currentTime: number }>;
  play: CustomEvent<void>;
  pause: CustomEvent<void>;
  /** Playback reached the end of the range without `loop`. */
  ended: CustomEvent<void>;
  durationchange: CustomEvent<{ duration: number }>;
  /** The shown aspect changed (a tab, or the aspect attribute). */
  aspectchange: CustomEvent<{ aspect: string }>;
  /** The program's warnings changed: text off the frame, props that do not fit. */
  warnings: CustomEvent<{ warnings: string[] }>;
  /** The item could not load or a frame failed; `message` says why. */
  error: CustomEvent<{ message: string; error: unknown }>;
}

// Attributes that change what is built (a reload of the program) and those that only change the UI.
const BUILD_ATTRS = ["props", "brand", "accent", "accent2", "ink", "paper", "mode", "duration", "fps", "speed", "mood", "seed", "motion", "beats", "background"];
const UI_ATTRS = ["aspects", "controls", "loop", "playback-rate", "range-start", "range-end", "poster", "posters", "ground", "resolution", "autoplay"];

const Base = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export class VolitoPlayer extends Base {
  static get observedAttributes(): string[] {
    return ["item", "aspect", "base", "loading", ...BUILD_ATTRS, ...UI_ATTRS];
  }

  private readonly shadow: ShadowRoot;
  private readonly el: {
    bar: HTMLElement;
    tabs: HTMLElement;
    frame: HTMLElement;
    poster: HTMLImageElement;
    canvas: HTMLCanvasElement;
    status: HTMLElement;
    controls: HTMLElement;
    play: HTMLButtonElement;
    scrub: HTMLInputElement;
    time: HTMLElement;
  };

  private mp: MotionPlayer | null = null;
  private itemName = "";
  private starting: Promise<void> | null = null;
  /** Bumped whenever a load is abandoned (a new item, disconnecting), so a late one throws itself away. */
  private gen = 0;
  private jsProps: Record<string, unknown> | undefined;
  private jsBrand: StyleInput = undefined;
  private jsProgram: string | null = null;
  private extra: Partial<BuildOptions> = {};
  private warn: string[] = [];

  // The clock: `t` is the time shown; while playing it runs from `anchorT` at `anchorWall`.
  private t = 0;
  private dur = 0;
  private playing = false;
  private atEnd = false;
  private anchorT = 0;
  private anchorWall = 0;
  private raf = 0;
  private lastEmit = 0;
  private inflight: Promise<void> | null = null;
  private busy = false;
  /** Someone wants it playing (autoplay or play()); off screen it waits, a pause() clears it. */
  private intent = false;
  private scrubResume = false;
  private onScreen = false;
  private shownAspect = "";
  private firstAspect = "";
  private queued = { build: false, item: false };

  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onVisibility = () => {
    if (document.hidden) this.stopClock(false);
    else this.resume();
  };

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `<style>${PLAYER_CSS}</style>
<div class="bar" part="bar" hidden><div class="tabs" part="tabs" role="tablist" aria-label="Aspect"></div></div>
<div class="stage" part="stage">
  <div class="frame" part="frame" data-ground="footage">
    <img class="poster" part="poster" alt="" decoding="async">
    <canvas class="hide" part="canvas" role="img"></canvas>
    <div class="status" part="status" role="status" aria-live="polite"></div>
  </div>
</div>
<div class="controls" part="controls" hidden>
  <button class="play" part="play" type="button" aria-label="Play" disabled>${PLAY_ICON}</button>
  <input class="scrub" part="scrub" type="range" min="0" max="1" step="0.01" value="0" aria-label="Time" disabled>
  <span class="time" part="time">0.00 / 0.00 s</span>
</div>`;
    const q = <T extends Element>(s: string) => this.shadow.querySelector(s) as T;
    this.el = {
      bar: q(".bar"),
      tabs: q(".tabs"),
      frame: q(".frame"),
      poster: q(".poster"),
      canvas: q("canvas"),
      status: q(".status"),
      controls: q(".controls"),
      play: q(".play"),
      scrub: q(".scrub"),
      time: q(".time"),
    };
    this.el.play.addEventListener("click", () => (this.playing ? this.pause() : void this.play()));
    this.el.scrub.addEventListener("pointerdown", () => {
      this.scrubResume = this.playing;
      this.stopClock(true);
    });
    this.el.scrub.addEventListener("input", () => void this.seek(Number(this.el.scrub.value)));
    this.el.scrub.addEventListener("change", () => {
      if (this.scrubResume) void this.play();
      this.scrubResume = false;
    });
    this.el.frame.addEventListener("click", () => {
      if (this.hasAttribute("controls") && this.mp) this.playing ? this.pause() : void this.play();
    });
    this.el.frame.addEventListener("keydown", (e) => this.onKey(e));
    this.el.tabs.addEventListener("keydown", (e) => this.onTabKey(e));
  }

  // ------------------------------------------------------------------------------------------
  // Properties
  // ------------------------------------------------------------------------------------------

  /** The item: "pack/id" or an id. */
  get item(): string {
    return this.getAttribute("item") ?? "";
  }
  set item(v: string) {
    this.setAttribute("item", v);
  }

  /** Your own program instead of an item: `function frame(t, $) { … }` (see `volito api`). */
  get program(): string | null {
    return this.jsProgram;
  }
  set program(code: string | null) {
    this.jsProgram = code;
    this.queue("item");
  }

  /** Props as an object; setting it overrides the props attribute. */
  get props(): Record<string, unknown> | undefined {
    return this.jsProps ?? this.safe(() => parseJsonObject(this.getAttribute("props"), "props"));
  }
  set props(v: Record<string, unknown> | undefined) {
    this.jsProps = v;
    this.queue("build");
  }

  /** A built-in style name, DESIGN.md text, or style tokens; a name also sets the brand attribute. */
  get brand(): StyleInput {
    return this.jsBrand ?? this.getAttribute("brand") ?? undefined;
  }
  set brand(v: StyleInput) {
    if (typeof v === "string" && /^[a-z0-9-]{1,64}$/i.test(v.trim())) {
      this.jsBrand = undefined;
      this.setAttribute("brand", v);
    } else {
      this.jsBrand = v;
      this.queue("build");
    }
  }

  /** Anything else a build takes (words, beats, media, motion…), under the attributes. */
  get options(): Partial<BuildOptions> {
    return this.extra;
  }
  set options(v: Partial<BuildOptions>) {
    this.extra = v ?? {};
    this.queue("build");
  }

  /** The aspect shown: 16:9, 9:16, 1:1, 4:5 or WIDTHxHEIGHT. */
  get aspect(): string {
    return this.shownAspect || this.initialAspect();
  }
  set aspect(v: string) {
    this.setAttribute("aspect", v);
  }

  get currentTime(): number {
    return this.t;
  }
  set currentTime(v: number) {
    void this.seek(v);
  }
  get duration(): number {
    return this.dur;
  }
  get paused(): boolean {
    return !this.playing;
  }
  get ended(): boolean {
    return this.atEnd;
  }
  get ready(): boolean {
    return !!this.mp;
  }
  get loop(): boolean {
    return this.hasAttribute("loop");
  }
  set loop(v: boolean) {
    this.toggleAttribute("loop", !!v);
  }
  get playbackRate(): number {
    const r = numberAttr(this.getAttribute("playback-rate"));
    return r && r > 0 ? r : 1;
  }
  set playbackRate(v: number) {
    this.setAttribute("playback-rate", String(v));
  }
  /** The program's current warnings. */
  get warnings(): string[] {
    return this.warn;
  }
  /** The underlying volito/browser player, once ready. */
  get player(): MotionPlayer | null {
    return this.mp;
  }

  // ------------------------------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------------------------------

  connectedCallback(): void {
    this.firstAspect = this.initialAspect();
    this.shownAspect = this.firstAspect;
    this.renderUI();
    this.io = new IntersectionObserver(
      (entries) => {
        this.onScreen = entries.some((e) => e.isIntersecting);
        if (this.onScreen) {
          if (!this.starting) void this.load();
          else this.resume();
        } else this.stopClock(false);
      },
      { rootMargin: "200px 0px" },
    );
    this.io.observe(this);
    this.ro = new ResizeObserver(() => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => void this.fitCanvas(), 150);
    });
    this.ro.observe(this.el.frame);
    document.addEventListener("visibilitychange", this.onVisibility);
    if (this.getAttribute("loading") === "eager") void this.load();
  }

  disconnectedCallback(): void {
    this.stopClock(false);
    this.io?.disconnect();
    this.ro?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.mp?.destroy();
    this.mp = null;
    this.starting = null;
    this.gen++;
    this.showPoster(this.posterFor(this.shownAspect));
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (old === value || !this.isConnected) return;
    if (name === "item") this.queue("item");
    else if (name === "base") this.queue("item");
    else if (name === "aspect") void this.showAspect(this.initialAspect());
    else if (name === "loading") {
      if (value === "eager") void this.load();
    } else if (BUILD_ATTRS.includes(name)) this.queue("build");
    else {
      this.renderUI();
      if (name === "autoplay" && value != null && this.mp) {
        if (!reducedMotion()) void this.play();
      }
      if ((name === "range-start" || name === "range-end") && this.mp && !this.playing) void this.seek(playRange(this.dur, this.rangeStart(), this.rangeEnd()).start);
    }
  }

  // ------------------------------------------------------------------------------------------
  // Playback
  // ------------------------------------------------------------------------------------------

  /** Load the graphic now (it otherwise waits until it is near the screen). */
  load(): Promise<void> {
    if (!this.starting) this.starting = this.start(++this.gen);
    return this.starting;
  }

  /** Play from the current time (or from the start after the end); off screen it starts when shown. */
  async play(): Promise<void> {
    this.intent = true;
    await this.load();
    this.resume();
  }

  pause(): void {
    this.intent = false;
    this.stopClock(true);
  }

  /** Show the frame at `t` seconds. */
  async seek(t: number): Promise<void> {
    const range = playRange(this.dur, this.rangeStart(), this.rangeEnd());
    this.t = Math.max(0, Math.min(Number.isFinite(t) ? t : 0, Math.max(0, this.dur - 1e-3)));
    this.atEnd = false;
    if (this.t < range.start) this.t = range.start;
    if (this.playing) {
      this.anchorT = this.t;
      this.anchorWall = performance.now();
    } else await this.paint(this.t, true);
    this.updateTime();
    this.emit("timeupdate", { currentTime: this.t });
  }

  private async start(gen: number): Promise<void> {
    this.status("");
    try {
      const item = await this.resolveItem();
      if (gen !== this.gen) return;
      this.itemName = item.name;
      this.setSize(this.shownAspect);
      const mp = await createPlayer(this.el.canvas, item, this.playerOptions());
      if (gen !== this.gen || !this.isConnected) return mp.destroy();
      this.mp = mp;
      this.dur = mp.duration;
      this.queued.build = false;
      this.t = playRange(this.dur, this.rangeStart(), this.rangeEnd()).start;
      if (this.t > 0) await this.paint(this.t, true);
      this.showCanvas();
      this.renderUI();
      const { width, height } = this.el.canvas;
      this.emit("ready", { duration: this.dur, width, height, aspect: this.shownAspect });
      this.emit("durationchange", { duration: this.dur });
      if (this.hasAttribute("autoplay") && !reducedMotion()) this.intent = true;
      this.resume();
    } catch (err) {
      if (gen === this.gen) this.fail(err);
    }
  }

  private resume(): void {
    if (!this.intent || !this.mp || !this.onScreen || document.hidden || this.playing || this.busy) return;
    const range = playRange(this.dur, this.rangeStart(), this.rangeEnd());
    if (this.atEnd || this.t >= range.end - 1e-3 || this.t < range.start) this.t = range.start;
    this.atEnd = false;
    this.playing = true;
    this.anchorT = this.t;
    this.anchorWall = performance.now();
    this.updatePlay();
    this.emit("play");
    const tick = () => {
      if (!this.playing) return;
      const now = performance.now();
      const fps = numberAttr(this.getAttribute("fps")) ?? 30;
      const r = advance(this.anchorT, (now - this.anchorWall) / 1000, this.playbackRate, playRange(this.dur, this.rangeStart(), this.rangeEnd()), this.loop, fps);
      if (r.t < this.t) {
        this.anchorT = r.t;
        this.anchorWall = now;
      }
      this.t = r.t;
      void this.paint(r.t, false);
      this.updateTime();
      if (now - this.lastEmit >= 100) {
        this.lastEmit = now;
        this.emit("timeupdate", { currentTime: r.t });
      }
      if (r.ended) {
        this.intent = false;
        this.stopClock(true);
        this.atEnd = true;
        this.emit("ended");
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Stop the clock; `announce` fires pause (a pause by someone, not the page going off screen). */
  private stopClock(announce: boolean): void {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.updatePlay();
    if (announce) this.emit("pause");
  }

  /** Draw a frame unless one is still drawing (while playing) — `wait` draws after it instead. */
  private async paint(t: number, wait: boolean): Promise<void> {
    if (!this.mp) return;
    if (this.inflight) {
      if (!wait) return;
      await this.inflight;
    }
    if (this.busy && !wait) return;
    const p = this.mp.draw(t).finally(() => {
      if (this.inflight === p) this.inflight = null;
    });
    this.inflight = p;
    await p;
  }

  // ------------------------------------------------------------------------------------------
  // Changes after load
  // ------------------------------------------------------------------------------------------

  private queue(kind: "build" | "item"): void {
    if (!this.mp) {
      // Still loading: a new item or base starts over; other changes are read when the build starts,
      // and one that lands mid-load is applied once it is ready.
      if (kind === "item" && this.starting) {
        this.starting = null;
        this.gen++;
        if (this.onScreen || this.getAttribute("loading") === "eager") void this.load();
      } else if (this.starting) this.queued.build = true;
      return;
    }
    this.queued[kind] = true;
    queueMicrotask(() => void this.flush());
  }

  private async flush(): Promise<void> {
    if (!this.mp || this.busy) return;
    const { item, build } = this.queued;
    this.queued = { build: false, item: false };
    if (item) {
      // A new item starts over: a fresh player, from its start, with its own duration.
      const wanted = this.playing || this.intent;
      this.stopClock(false);
      this.mp.destroy();
      this.mp = null;
      this.starting = null;
      this.intent = wanted;
      this.renderUI();
      this.showPoster(this.posterFor(this.shownAspect));
      await this.load();
    } else if (build) await this.reload(false);
  }

  /** Rebuild the program with the current options, keeping the time shown; `resize` for a new aspect. */
  private async reload(resize: boolean): Promise<void> {
    if (!this.mp) return;
    this.busy = true;
    try {
      if (this.inflight) await this.inflight;
      await this.mp.seek(this.t);
      if (resize) this.setSize(this.shownAspect);
      await this.mp.update(this.playerOptions());
      if (this.mp.duration !== this.dur) {
        this.dur = this.mp.duration;
        this.t = Math.min(this.t, this.dur);
        this.emit("durationchange", { duration: this.dur });
      }
      this.status("");
    } catch (err) {
      this.fail(err);
    } finally {
      this.busy = false;
    }
    this.renderUI();
    this.resume();
    if (this.queued.build || this.queued.item) queueMicrotask(() => void this.flush());
  }

  private async showAspect(a: string): Promise<void> {
    try {
      parseAspect(a);
    } catch (err) {
      return this.fail(err);
    }
    if (a === this.shownAspect) return;
    this.shownAspect = a;
    const poster = this.posterFor(a);
    if (poster) this.showPoster(poster);
    this.renderUI();
    if (this.mp) {
      this.stopClock(false);
      await this.reload(true);
      this.showCanvas();
    }
    this.emit("aspectchange", { aspect: a });
  }

  /** Match the canvas to the frame's size on screen; a big change redraws at the new size. */
  private async fitCanvas(): Promise<void> {
    if (!this.mp || this.busy) return;
    const want = this.sizeFor(this.shownAspect);
    const { width, height } = this.el.canvas;
    if (Math.abs(want.width - width) / width < 0.12 && Math.abs(want.height - height) / height < 0.12) return;
    if (this.inflight) await this.inflight;
    this.el.canvas.width = want.width;
    this.el.canvas.height = want.height;
    if (!this.playing) await this.paint(this.t, true);
  }

  // ------------------------------------------------------------------------------------------
  // Building blocks
  // ------------------------------------------------------------------------------------------

  private initialAspect(): string {
    const a = (this.getAttribute("aspect") ?? "").trim().toLowerCase();
    if (a) return a;
    return this.aspects()[0] ?? "16:9";
  }

  private aspects(): string[] {
    return this.safe(() => parseAspects(this.getAttribute("aspects"))) ?? [];
  }

  private rangeStart(): number | undefined {
    return numberAttr(this.getAttribute("range-start"));
  }

  private rangeEnd(): number | undefined {
    return numberAttr(this.getAttribute("range-end"));
  }

  private base(): string {
    const b = this.getAttribute("base");
    return b ? new URL(b, document.baseURI).href : CDN_BASE;
  }

  private async resolveItem(): Promise<MotionItem> {
    if (this.jsProgram) return customItem(this.jsProgram);
    const name = this.item.trim();
    if (!name) throw new Error('set item="pack/id" (or the program property) to choose a graphic');
    return findItem(await loadRegistry(this.base()), name);
  }

  private buildOptions(): BuildOptions {
    const colors: StyleOverrides = {};
    for (const k of ["accent", "accent2", "ink", "paper"] as const) {
      const v = this.getAttribute(k);
      if (v) colors[k] = v;
    }
    const mode = this.getAttribute("mode");
    if (mode === "dark" || mode === "light") colors.mode = mode;
    const o: BuildOptions = { ...this.extra };
    const props = this.jsProps ?? parseJsonObject(this.getAttribute("props"), "props");
    if (props) o.props = props;
    const brand = this.brand;
    if (brand) o.style = brand;
    if (Object.keys(colors).length) o.colors = { ...(this.extra.colors ?? {}), ...colors };
    o.aspect = parseAspect(this.shownAspect || this.initialAspect());
    const duration = numberAttr(this.getAttribute("duration"));
    if (duration) o.duration = duration;
    const motion = parseMotionAttr(this.getAttribute("motion"));
    if (motion) o.motion = motion;
    const mood = this.getAttribute("mood");
    if (mood) o.mood = mood;
    const seed = numberAttr(this.getAttribute("seed"));
    if (seed != null) o.seed = seed;
    const speed = numberAttr(this.getAttribute("speed"));
    if (speed) o.speed = speed;
    const beats = parseBeats(this.getAttribute("beats"));
    if (beats) o.beats = { ...(this.extra.beats ?? {}), ...beats };
    return o;
  }

  private playerOptions(): PlayerOptions {
    return {
      ...this.buildOptions(),
      base: this.base(),
      fps: numberAttr(this.getAttribute("fps")) ?? 30,
      background: this.getAttribute("background") ?? undefined,
      onWarnings: (w) => {
        this.warn = w;
        this.emit("warnings", { warnings: w });
      },
      onError: (err) => this.fail(err),
    };
  }

  private sizeFor(a: string): { width: number; height: number } {
    const { width, height } = aspectSize(a);
    this.el.frame.style.setProperty("--ar", String(width / height));
    const css = this.el.frame.getBoundingClientRect().width || this.getBoundingClientRect().width || 960;
    const cap = numberAttr(this.getAttribute("resolution")) ?? 1920;
    return canvasSize(a, css, Math.min(window.devicePixelRatio || 1, 2), cap);
  }

  private setSize(a: string): void {
    const s = this.sizeFor(a);
    this.el.canvas.width = s.width;
    this.el.canvas.height = s.height;
  }

  /** The live canvas on top; the poster (a still with the graphic baked in) out of the way. */
  private showCanvas(): void {
    this.el.canvas.classList.remove("hide");
    this.el.poster.classList.add("hide");
    this.el.canvas.setAttribute("aria-label", `${this.itemName || "Graphic"} at ${this.shownAspect}`);
  }

  /** The still for this aspect, if there is one, in place of the canvas until a frame is drawn. */
  private showPoster(src: string | null): void {
    if (src) {
      if (this.el.poster.getAttribute("src") !== src) this.el.poster.src = src;
      this.el.poster.alt = this.itemName || this.item;
      this.el.poster.classList.remove("hide");
      this.el.canvas.classList.add("hide");
    } else {
      this.el.poster.removeAttribute("src");
      this.el.poster.classList.add("hide");
    }
  }

  private posterFor(a: string): string | null {
    const map = this.safe(() => parseJsonObject(this.getAttribute("posters"), "posters"));
    const p = map?.[a];
    if (typeof p === "string") return p;
    return a === this.firstAspect ? this.getAttribute("poster") : null;
  }

  private renderUI(): void {
    const { width, height } = this.safe(() => aspectSize(this.shownAspect || this.initialAspect())) ?? { width: 16, height: 9 };
    this.el.frame.style.setProperty("--ar", String(width / height));
    const ground = groundOf(this.getAttribute("ground"));
    this.el.frame.dataset.ground = ground.kind;
    this.el.frame.style.background = ground.kind === "color" ? ground.color! : "";
    if (!this.mp && this.el.canvas.classList.contains("hide")) this.showPoster(this.posterFor(this.shownAspect || this.initialAspect()));

    const aspects = this.aspects();
    this.el.bar.hidden = aspects.length < 2;
    const now = this.shownAspect || this.initialAspect();
    if (this.el.tabs.dataset.list !== aspects.join(",") || this.el.tabs.dataset.now !== now) {
      this.el.tabs.dataset.list = aspects.join(",");
      this.el.tabs.dataset.now = now;
      this.el.tabs.innerHTML = aspects
        .map((a) => {
          const s = aspectSize(a);
          const on = a === now;
          return `<button class="tab" part="tab" type="button" role="tab" data-aspect="${a}" aria-selected="${on}" tabindex="${on ? 0 : -1}"><i class="shape" style="aspect-ratio:${s.width}/${s.height}" aria-hidden="true"></i>${a}</button>`;
        })
        .join("");
      for (const b of this.el.tabs.querySelectorAll<HTMLButtonElement>(".tab")) b.addEventListener("click", () => this.chooseTab(b.dataset.aspect!));
    }

    const controls = this.hasAttribute("controls");
    this.el.controls.hidden = !controls;
    this.el.frame.classList.toggle("clickable", controls);
    this.el.frame.tabIndex = controls ? 0 : -1;
    const ready = !!this.mp;
    this.el.play.disabled = !ready;
    this.el.scrub.disabled = !ready;
    this.el.scrub.max = String(this.dur || 1);
    this.updatePlay();
    this.updateTime();
  }

  private chooseTab(a: string): void {
    if (a === this.shownAspect) return;
    this.setAttribute("aspect", a);
  }

  private onTabKey(e: KeyboardEvent): void {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const list = this.aspects();
    const i = list.indexOf(this.shownAspect);
    const next = list[(i + d + list.length) % list.length];
    if (!next) return;
    this.chooseTab(next);
    requestAnimationFrame(() => this.el.tabs.querySelector<HTMLButtonElement>(`[data-aspect="${next}"]`)?.focus());
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.mp || !this.hasAttribute("controls")) return;
    const step = e.shiftKey ? 1 : 1 / (numberAttr(this.getAttribute("fps")) ?? 30);
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      this.playing ? this.pause() : void this.play();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      this.pause();
      void this.seek(this.t + (e.key === "ArrowRight" ? step : -step));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      this.pause();
      const r = playRange(this.dur, this.rangeStart(), this.rangeEnd());
      void this.seek(e.key === "Home" ? r.start : r.end - 1e-3);
    }
  }

  private updatePlay(): void {
    this.el.play.innerHTML = this.playing ? PAUSE_ICON : PLAY_ICON;
    this.el.play.setAttribute("aria-label", this.playing ? "Pause" : "Play");
  }

  private updateTime(): void {
    const t = Math.min(this.t, this.dur);
    this.el.time.textContent = formatTime(t, this.dur);
    this.el.scrub.value = String(t);
    this.el.scrub.style.setProperty("--p", `${this.dur ? (t / this.dur) * 100 : 0}%`);
    this.el.scrub.setAttribute("aria-valuetext", `${t.toFixed(2)} of ${this.dur.toFixed(2)} seconds`);
  }

  private status(text: string): void {
    this.el.status.textContent = text;
  }

  private fail(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.stopClock(true);
    this.intent = false;
    this.status(message);
    const poster = this.posterFor(this.shownAspect);
    if (poster) this.showPoster(poster);
    this.emit("error", { message, error: err });
  }

  private safe<T>(fn: () => T): T | undefined {
    try {
      return fn();
    } catch (err) {
      this.status(err instanceof Error ? err.message : String(err));
      return undefined;
    }
  }

  private emit(type: keyof VolitoPlayerEventMap, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

/** Register the element (done on import as <volito-player>); call with another tag to use your own. */
export function defineVolitoPlayer(tag = "volito-player"): void {
  if (typeof customElements === "undefined" || customElements.get(tag)) return;
  customElements.define(tag, tag === "volito-player" ? VolitoPlayer : class extends VolitoPlayer {});
}
