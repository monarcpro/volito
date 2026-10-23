/**
 * The motion kit: any element of a graphic, any move. Plain JavaScript prepended to every program
 * (pack items and code someone writes), so it runs wherever programs run — the CLI, the browser
 * player, the MONARC editor. A program asks `motion($, t)` for an animator and draws its elements as
 * named parts; each part enters, idles, takes emphasis hits and leaves with a move from the
 * vocabulary below (any move as an entrance or, played backwards, as an exit), on any ease, from
 * any direction, with text split by line, word or letter in any order, or follows its own
 * keyframes. The creator overrides any of it per part ($.data.__motion.parts), or asks for a mood
 * and a seed and gets a new, coherent choreography every time.
 *
 * It is a string, not a module, like the runtime: no template literals and no dollar-brace inside.
 */
export const MOTION_KIT = String.raw`
// ———————— MONARC Motion kit ————————
// UI helpers: a person's picture (or their initials), an app's icon tile.
/** Up to two capital letters for a name ("Priya Sharma" -> "PS"). */
function initials(name) {
  var w = String(name || "").replace(/^@/, "").split(/[\s._-]+/).filter(Boolean);
  return ((w[0] ? Array.from(w[0])[0] : "") + (w.length > 1 ? Array.from(w[w.length - 1])[0] : "")).toUpperCase();
}
/** A round picture from an image prop, or initials on a colour when no picture was given. o: name, fill, ring (stroke colour). */
function avatar($, prop, cx, cy, r, o) {
  o = o || {};
  var s = "";
  if (prop && $.media && $.media[prop]) s = $.image(prop, cx - r, cy - r, 2 * r, 2 * r, { r: r });
  else {
    var fill = o.fill || $.c.accent;
    s = $.circle(cx, cy, r, { fill: fill }) + $.text(initials(o.name), { family: $.font("display").family, weight: 800, size: r * 0.82, x: cx, y: cy - r * 0.43, anchor: "middle", fill: $.on(fill) });
  }
  if (o.ring) s += $.circle(cx, cy, r, { stroke: o.ring, sw: Math.max(2, r * 0.08), fill: "none" });
  return s;
}
/** A rounded app tile with an icon on it (x, y top-left). o: fill, color. */
function appIcon($, name, x, y, size, o) {
  o = o || {};
  var fill = o.fill || $.c.accent;
  return $.rect(x, y, size, size, { r: size * 0.24, fill: fill }) + $.icon(name, x + size * 0.2, y + size * 0.2, size * 0.6, { color: o.color || $.on(fill), sw: 2.2 });
}
// Layout helpers: safe areas, text that fits, landing on the voice.
/**
 * The title-safe box for this canvas: text inside it clears the frame's edges and, on 9:16, the
 * platforms' own buttons and captions (Reels, Shorts, TikTok keep ~12% at the top, ~22% at the bottom).
 * 4:5 and 1:1 are feed posts: "square", with even margins.
 */
function safeArea($) {
  const W = $.W, H = $.H;
  const tall = H >= W * 1.5, square = !tall && H > W * 0.85;
  const sx = tall ? 0.075 : square ? 0.07 : 0.055;
  const top = tall ? 0.12 : 0.07;
  const bottom = tall ? 0.22 : 0.08;
  return { x: W * sx, y: H * top, w: W * (1 - 2 * sx), h: H * (1 - top - bottom), tall: tall, square: square, wide: !tall && !square };
}

/** Words as the runtime compares them: lowercase letters and digits (Devanagari kept). */
function normWord(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9%ऀ-ॿ]/g, "");
}

/**
 * The time to land a prop's text on: 0.08 s before the first of its words that is spoken over the
 * graphic (when a transcript was given), else the fallback. Silent when none is spoken.
 */
function landOn($, str, fallback, after) {
  if (!$.words.length) return fallback;
  const from = after || 0;
  const wanted = String(str || "").split(/\s+/).map(normWord).filter(Boolean);
  for (let i = 0; i < $.words.length; i++) {
    const w = $.words[i];
    if (w.s < from - 0.05) continue;
    if (wanted.indexOf(normWord(w.w)) >= 0) return Math.max(0, w.s - 0.08);
  }
  return fallback;
}

/** The brand's face for a role at 'size', cut down until 'str' fits 'maxW' (never below 40%). */
function fitFont($, str, role, size, maxW, extra) {
  const f = Object.assign({}, $.font(role), { size: size }, extra || {});
  const w = $.measure(str, f);
  if (w > maxW && w > 0) f.size = Math.max(size * 0.4, (size * maxW) / w);
  return f;
}

/** The widest of several lines in a font. */
function widest($, lines, font) {
  let w = 0;
  for (let i = 0; i < lines.length; i++) w = Math.max(w, $.measure(lines[i], font));
  return w;
}

/**
 * The biggest size (≤ maxSize) at which 'str' sets in at most 'maxLines' lines no wider than maxW —
 * one line when it holds at 60% of maxSize or more. { size, lines, font }.
 */
function fitLines($, str, font, maxW, maxSize, minSize, maxLines) {
  const at = function (size) { return Object.assign({}, font, { size: size }); };
  const w1 = $.measure(str, at(100)) / 100;
  if (w1 > 0) {
    // A hair under the exact fit, so wrapping the same text at this size keeps it on one line.
    const s1 = Math.min(maxSize, (maxW / w1) * 0.995);
    if (s1 >= maxSize * 0.6 || maxLines <= 1) return { size: Math.max(minSize, s1), lines: [str], font: at(Math.max(minSize, s1)) };
  }
  for (let size = maxSize; size >= minSize; size *= 0.94) {
    const lines = $.wrap(str, maxW, at(size));
    if (lines.length <= maxLines && widest($, lines, at(size)) <= maxW) return { size: size, lines: lines, font: at(size) };
  }
  const lines = $.wrap(str, maxW, at(minSize));
  return { size: minSize, lines: lines, font: at(minSize) };
}


var MM_EASES = {
  linear: function (p) { return p; },
  "in": function (p) { return p * p * p; },
  out: function (p) { return 1 - Math.pow(1 - p, 3); },
  inOut: function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
  smooth: function (p) { return 1 - Math.pow(1 - p, 3); },
  sine: function (p) { return 0.5 - 0.5 * Math.cos(Math.PI * p); },
  expo: function (p) { return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); },
  back: function (p) { var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
  elastic: function (p) { if (p <= 0) return 0; if (p >= 1) return 1; return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1; },
  bounce: function (p) { var n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) { p -= 1.5 / d; return n * p * p + 0.75; } if (p < 2.5 / d) { p -= 2.25 / d; return n * p * p + 0.9375; } p -= 2.625 / d; return n * p * p + 0.984375; }
};
/** Springs [frequency, damping]: the brand feels, and a few more. */
var MM_SPRINGS = { snappy: [2.2, 6.5], punchy: [2.8, 8.5], bouncy: [2.5, 4.8], calm: [1.1, 10], gentle: [1.5, 9.5], wobbly: [2.0, 3.2], stiff: [3.4, 12] };
var mmClamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
var mmHash = function (n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
var mmNum = function (v, k) { if (!isFinite(v)) return "0"; var m = Math.pow(10, k); return String(Math.round(v * m) / m); };
var mmBump = function (t, t0, up, down) { return t < t0 ? 0 : t < t0 + up ? (t - t0) / up : Math.max(0, 1 - (t - t0 - up) / down); };

function mmBezier(x1, y1, x2, y2) {
  var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  var X = function (u) { return ((ax * u + bx) * u + cx) * u; };
  var Y = function (u) { return ((ay * u + by) * u + cy) * u; };
  return function (p) {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    var lo = 0, hi = 1, u = p;
    for (var i = 0; i < 24; i++) { u = (lo + hi) / 2; if (X(u) < p) lo = u; else hi = u; }
    return Y(u);
  };
}

/** An ease by name: "out", "bounce", "bouncy" (a spring), "brand", "spring(2.4, 7)", "steps(6)", "cubic(.2,.8,.2,1)". */
function mmEase(spec, brand) {
  var s = String(spec == null || spec === "" ? "brand" : spec).trim();
  if (s === "brand") s = brand && MM_SPRINGS[brand] ? brand : brand === "smooth" ? "gentle" : "snappy";
  if (s === "smooth" && !MM_EASES[s]) s = "gentle";
  if (MM_SPRINGS[s]) return { spring: MM_SPRINGS[s] };
  if (MM_EASES[s]) return { fn: MM_EASES[s] };
  var m = /^spring\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/.exec(s);
  if (m) return { spring: [Math.max(0.2, Number(m[1])), Math.max(0.5, Number(m[2]))] };
  m = /^steps\(\s*(\d+)\s*\)$/.exec(s);
  if (m) { var n = Math.max(1, Number(m[1])); return { fn: function (p) { return p >= 1 ? 1 : Math.floor(p * n) / n; } }; }
  m = /^cubic\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/.exec(s);
  if (m) return { fn: mmBezier(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])) };
  return { spring: MM_SPRINGS.snappy };
}

/** Eased progress dt seconds into a move that lasts dur (a spring settles in about dur, overshooting on the way). */
function mmProgress(dt, dur, ease) {
  if (dt <= 0) return 0;
  if (ease.spring) { var tt = dt * (0.65 / Math.max(0.05, dur)); return 1 - Math.exp(-ease.spring[1] * tt) * Math.cos(2 * Math.PI * ease.spring[0] * tt); }
  return ease.fn(mmClamp(dt / Math.max(0.001, dur)));
}

/** Where a move comes from: the side its start lies on. */
var MM_DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], top: [0, -1], down: [0, 1], bottom: [0, 1], "up-left": [-0.7071, -0.7071], "up-right": [0.7071, -0.7071], "down-left": [-0.7071, 0.7071], "down-right": [0.7071, 0.7071] };

/**
 * The moves. pose(e, r, c) is the element's pose e of the way in (e eased, may overshoot; r raw 0–1):
 * offsets x/y px, scale s/sx/sy, rotation r and skews in degrees, opacity op, blur bx/by px, a clip, glitch 0–1.
 * An exit plays the same move backwards. Meta: dur, ease, dir (default side), origin (pivot), box (needs the part's box), text (a text-only behaviour), land (an emphasis on landing).
 */
var MM_MOVES = {
  none: { dur: 0.01, ease: "linear", always: true, pose: function () { return {}; } },
  appear: { dur: 0.01, ease: "linear", pose: function (e, r) { return { op: r > 0 ? 1 : 0 }; } },
  fade: { dur: 0.45, ease: "smooth", pose: function (e) { return { op: e }; } },
  rise: { dur: 0.6, ease: "brand", pose: function (e, r, c) { return { y: (1 - e) * c.D, op: mmClamp(r * 2.2) }; } },
  drop: { dur: 0.6, ease: "brand", pose: function (e, r, c) { return { y: -(1 - e) * c.D, op: mmClamp(r * 2.2) }; } },
  slide: { dur: 0.6, ease: "brand", dir: "left", pose: function (e, r, c) { var q = (1 - e) * c.D * 2.4; return { x: c.v[0] * q, y: c.v[1] * q, op: mmClamp(r * 2.5) }; } },
  smear: { dur: 0.5, ease: "expo", dir: "left", pose: function (e, r, c) { var q = 1 - e; return { x: c.v[0] * q * c.D * 3, y: c.v[1] * q * c.D * 3, bx: Math.abs(c.v[0]) * Math.max(0, q) * 40 * c.K, by: Math.abs(c.v[1]) * Math.max(0, q) * 40 * c.K, op: mmClamp(r * 3) }; } },
  arc: { dur: 0.75, ease: "brand", dir: "left", pose: function (e, r, c) { var q = 1 - e, a = Math.sin(mmClamp(q) * Math.PI); return { x: c.v[0] * q * c.D * 2.6 + c.v[1] * a * c.D, y: c.v[1] * q * c.D * 2.6 - Math.abs(c.v[0]) * a * c.D * 1.3, op: mmClamp(r * 2.5) }; } },
  pop: { dur: 0.55, ease: "brand", pose: function (e, r) { return { s: 0.5 + 0.5 * e, op: mmClamp(r * 4) }; } },
  zoom: { dur: 0.6, ease: "expo", pose: function (e, r) { return { s: 0.15 + 0.85 * e, op: mmClamp(r * 2) }; } },
  push: { dur: 0.6, ease: "expo", pose: function (e, r) { return { s: 1 + (1 - e) * 0.9, op: mmClamp(r * 2) }; } },
  grow: { dur: 0.5, ease: "brand", pose: function (e) { return { s: Math.max(0, e) }; } },
  "grow-x": { dur: 0.5, ease: "out", origin: "left", pose: function (e) { return { sx: Math.max(0, e) }; } },
  "grow-y": { dur: 0.5, ease: "out", origin: "bottom", pose: function (e) { return { sy: Math.max(0, e) }; } },
  unfold: { dur: 0.55, ease: "out", origin: "top", pose: function (e, r) { return { sy: Math.max(0, e), op: mmClamp(r * 3) }; } },
  wipe: { dur: 0.55, ease: "out", dir: "left", box: true, pose: function (e, r, c) { return { clip: { kind: "wipe", p: e, v: c.v } }; } },
  iris: { dur: 0.6, ease: "out", box: true, pose: function (e) { return { clip: { kind: "iris", p: e } }; } },
  shutter: { dur: 0.6, ease: "inOut", box: true, pose: function (e) { return { clip: { kind: "shutter", p: e } }; } },
  blinds: { dur: 0.6, ease: "inOut", box: true, pose: function (e) { return { clip: { kind: "blinds", p: e } }; } },
  diagonal: { dur: 0.6, ease: "out", box: true, pose: function (e) { return { clip: { kind: "diagonal", p: e } }; } },
  blur: { dur: 0.6, ease: "smooth", pose: function (e, r, c) { var q = Math.max(0, 1 - e); return { bx: q * 26 * c.K, by: q * 26 * c.K, op: mmClamp(e * 1.4), s: 1 + q * 0.06 }; } },
  flip: { dur: 0.6, ease: "brand", origin: "top", pose: function (e, r) { var a = (1 - Math.min(1, e)) * Math.PI / 2; return { sy: Math.max(0.001, Math.cos(a)), skx: (1 - e) * 10, op: mmClamp(r * 3) }; } },
  turn: { dur: 0.6, ease: "brand", pose: function (e, r) { var a = (1 - Math.min(1, e)) * Math.PI / 2; return { sx: Math.max(0.001, Math.cos(a)), sky: (1 - e) * 8, op: mmClamp(r * 3) }; } },
  spin: { dur: 0.7, ease: "brand", pose: function (e, r, c) { return { r: -(1 - e) * 180 * c.k, s: 0.3 + 0.7 * Math.max(0, e), op: mmClamp(r * 3) }; } },
  roll: { dur: 0.75, ease: "brand", dir: "left", pose: function (e, r, c) { var q = 1 - e; return { x: c.v[0] * q * c.D * 3, r: c.v[0] * q * 360 * c.k, op: mmClamp(r * 3) }; } },
  swing: { dur: 0.8, ease: "bouncy", origin: "top", pose: function (e, r, c) { return { r: (1 - e) * -75 * c.k, op: mmClamp(r * 3) }; } },
  skew: { dur: 0.55, ease: "brand", dir: "left", pose: function (e, r, c) { var q = 1 - e; return { skx: -c.v[0] * q * 30 * c.k, x: c.v[0] * q * c.D * 1.8, op: mmClamp(r * 3) }; } },
  stretch: { dur: 0.6, ease: "bouncy", pose: function (e, r, c) { var q = 1 - e; return { sx: 1 + q * 0.9 * c.k, sy: Math.max(0.05, 1 - q * 0.75 * c.k), op: mmClamp(r * 4) }; } },
  squash: { dur: 0.6, ease: "bouncy", origin: "bottom", pose: function (e, r, c) { var q = 1 - e; return { sy: 1 + q * 0.8 * c.k, sx: Math.max(0.05, 1 - q * 0.45 * c.k), y: -q * c.D * 2, op: mmClamp(r * 4) }; } },
  bounce: { dur: 0.9, ease: "bounce", pose: function (e, r, c) { return { y: -(1 - e) * c.D * 3, op: mmClamp(r * 5) }; } },
  elastic: { dur: 0.9, ease: "elastic", pose: function (e, r) { return { s: e, op: mmClamp(r * 5) }; } },
  slam: { dur: 0.4, ease: "expo", land: "shake", pose: function (e, r, c) { return { s: 1 + (1 - e) * 1.6 * c.k, op: mmClamp(r * 5) }; } },
  tilt: { dur: 0.6, ease: "brand", pose: function (e, r, c) { var q = 1 - e; return { r: -q * 12 * c.k, y: q * c.D * 0.7, op: mmClamp(r * 2.5) }; } },
  float: { dur: 1.1, ease: "smooth", pose: function (e, r, c) { return { y: (1 - e) * c.D * 0.5, op: e }; } },
  glitch: { dur: 0.55, ease: "linear", pose: function (e, r, c) { var on = r >= 1 || mmHash(Math.floor(c.t * 30) * 7.1 + c.seed) < 0.35 + 0.65 * r; return { glitch: 1 - r, op: on ? 1 : 0 }; } },
  flicker: { dur: 0.5, ease: "linear", pose: function (e, r, c) { return { op: r >= 1 ? 1 : mmHash(Math.floor(c.t * 24) * 3.3 + c.seed) < 0.25 + 0.75 * r ? 1 : 0.08 }; } },
  typewriter: { dur: 0.01, ease: "linear", text: "type", pose: function (e, r) { return { op: r > 0 ? 1 : 0 }; } },
  scramble: { dur: 0.5, ease: "linear", text: "scramble", pose: function (e, r) { return { op: mmClamp(r * 6) }; } }
};
/** Older names and the obvious synonyms. */
var MM_ALIASES = { "fade-in": "fade", "slide-up": "rise", "slide-down": "drop", "zoom-in": "zoom", "scale": "grow", "type": "typewriter", "reveal": "wipe", "motion-blur": "smear", "punch": "push", "jelly": "stretch" };

/** Loops while the part holds (weighted in after it lands, out as it leaves). */
var MM_IDLES = {
  none: null,
  float: function (t, c) { return { y: Math.sin((t * 2 * Math.PI) / 3.2 + c.ph) * 8 * c.K * c.k }; },
  bob: function (t, c) { return { y: -Math.abs(Math.sin((t * Math.PI) / 0.55 + c.ph)) * 10 * c.K * c.k }; },
  pulse: function (t, c) { return { s: 1 + 0.03 * c.k * Math.sin((t * 2 * Math.PI) / 1.1 + c.ph) }; },
  breathe: function (t, c) { var w = Math.sin((t * 2 * Math.PI) / 3.4 + c.ph); return { s: 1 + 0.015 * c.k * w, op: 0.94 + 0.06 * w }; },
  wiggle: function (t, c) { return { r: Math.sin((t * 2 * Math.PI) / 0.8 + c.ph) * 2.5 * c.k }; },
  sway: function (t, c) { return { r: Math.sin((t * 2 * Math.PI) / 3 + c.ph) * 4 * c.k }; },
  drift: function (t, c) { var d = Math.max(0, t - c.at); return { x: d * 7 * c.K * c.k, s: 1 + d * 0.006 * c.k }; },
  jitter: function (t, c) { var n = Math.floor(t * 12); return { x: (mmHash(n + c.ph) - 0.5) * 4 * c.K * c.k, y: (mmHash(n * 1.7 + c.ph) - 0.5) * 4 * c.K * c.k, r: (mmHash(n * 2.3 + c.ph) - 0.5) * 1.6 * c.k }; },
  spin: function (t, c) { return { r: Math.max(0, t - c.at) * 60 * c.k }; },
  heartbeat: function (t, c) { var q = ((t + c.ph) % 1.2) / 1.2; var b = Math.exp(-Math.pow((q - 0.1) / 0.04, 2)) + 0.6 * Math.exp(-Math.pow((q - 0.25) / 0.04, 2)); return { s: 1 + 0.06 * c.k * b }; },
  shimmer: function (t, c) { var q = ((t + c.ph) % 2.4) / 2.4; return { op: 0.82 + 0.18 * Math.abs(Math.cos(q * Math.PI)) }; }
};

/** One-off hits at a moment: a time, a beat name, or a word that is spoken. */
var MM_HITS = {
  pulse: function (t, at, c) { return { s: 1 + 0.12 * c.k * mmBump(t, at, 0.08, 0.35) }; },
  pop: function (t, at, c) { var dt = t - at; if (dt < 0 || dt > 0.8) return {}; return { s: 1 + 0.28 * c.k * Math.exp(-7 * dt) * Math.cos(2 * Math.PI * 2.4 * dt) * Math.min(1, dt / 0.05) }; },
  shake: function (t, at, c) { var dt = t - at; if (dt < 0 || dt > 0.45) return {}; var a = Math.pow(1 - dt / 0.45, 2) * 16 * c.K * c.k, n = Math.floor(dt * 60); return { x: (mmHash(n * 3 + 1) - 0.5) * 2 * a, y: (mmHash(n * 5 + 2) - 0.5) * 2 * a }; },
  jump: function (t, at, c) { var dt = t - at; if (dt < 0 || dt > 0.5) return {}; return { y: -Math.sin(Math.PI * dt / 0.5) * 36 * c.K * c.k }; },
  wobble: function (t, at, c) { var dt = t - at; if (dt < 0 || dt > 0.9) return {}; return { r: Math.sin(dt * 28) * 9 * c.k * Math.exp(-4 * dt) }; },
  flash: function (t, at, c) { return { op: 1 - 0.75 * mmBump(t, at, 0.04, 0.3) }; },
  spin: function (t, at, c) { var p = mmClamp((t - at) / 0.6); return { r: 360 * c.k * (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2) }; },
  rubber: function (t, at, c) { var dt = t - at; if (dt < 0 || dt > 0.8) return {}; var w = Math.sin(dt * 22) * Math.exp(-5 * dt) * 0.25 * c.k; return { sx: 1 + w, sy: 1 - w }; },
  tada: function (t, at, c) { var dt = t - at; if (dt < 0 || dt > 1) return {}; var env = Math.sin(Math.PI * dt); return { s: 1 + 0.1 * c.k * env, r: Math.sin(dt * 30) * 5 * c.k * env }; }
};

/** Moods: the moves, eases, idles and splits a seed draws from. */
var MM_MOODS = {
  energetic: { "in": ["pop", "slam", "push", "stretch", "smear"], out: ["zoom", "smear", "fade", "push"], ease: ["punchy", "snappy", "back"], idle: ["none", "pulse"], split: ["none", "words", "letters"] },
  elegant: { "in": ["fade", "rise", "blur", "wipe", "float"], out: ["fade", "blur", "rise"], ease: ["gentle", "calm", "expo", "smooth"], idle: ["none", "breathe"], split: ["none", "words", "lines"] },
  playful: { "in": ["bounce", "swing", "elastic", "pop", "squash", "arc"], out: ["drop", "pop", "swing", "zoom"], ease: ["bouncy", "wobbly", "back"], idle: ["float", "wiggle", "bob"], split: ["letters", "words", "none"] },
  cinematic: { "in": ["blur", "push", "iris", "wipe", "rise", "float"], out: ["blur", "fade", "zoom"], ease: ["expo", "calm", "smooth"], idle: ["drift", "none", "breathe"], split: ["none", "lines", "words"] },
  glitchy: { "in": ["glitch", "scramble", "shutter", "flicker"], out: ["glitch", "flicker", "shutter"], ease: ["steps(6)", "snappy", "linear"], idle: ["jitter", "none", "shimmer"], split: ["letters", "none"] },
  minimal: { "in": ["fade", "grow-x", "wipe", "rise"], out: ["fade", "wipe"], ease: ["smooth", "gentle"], idle: ["none"], split: ["none", "lines"] },
  retro: { "in": ["typewriter", "shutter", "drop", "blinds", "flicker"], out: ["shutter", "fade", "blinds"], ease: ["steps(5)", "steps(8)"], idle: ["jitter", "none"], split: ["letters", "lines"] },
  kinetic: { "in": ["slide", "stretch", "skew", "slam", "spin", "roll"], out: ["slide", "skew", "smear"], ease: ["punchy", "expo"], idle: ["none"], split: ["words", "letters", "none"] }
};
var MM_MOOD_NAMES = ["energetic", "elegant", "playful", "cinematic", "glitchy", "minimal", "retro", "kinetic"];
var MM_FIELDS = ["in", "out", "dur", "outDur", "ease", "outEase", "from", "outFrom", "distance", "blur", "idle", "emphasis", "keys", "delay", "at", "outAt", "intensity", "origin", "split", "order", "stagger", "outStagger"];
var MM_SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?";

/**
 * The animator for one frame. Parts are named; o is the item's own motion for a part (in, out, at,
 * box, ease …) and the creator's overrides ($.data.__motion) land on top of it.
 */
function motion($, t) {
  var cfg = ($.data && $.data.__motion) || {};
  var user = cfg.parts && typeof cfg.parts === "object" ? cfg.parts : {};
  var speed = cfg.speed > 0 ? cfg.speed : 1;
  var K = $.k;
  var brand = $.style && $.style.motion;
  var mood = cfg.mood && MM_MOODS[cfg.mood] ? cfg.mood : null;
  var seed = isFinite(cfg.seed) && cfg.seed !== null && cfg.seed !== "" ? Number(cfg.seed) : null;
  if (seed !== null && !mood) mood = MM_MOOD_NAMES[Math.floor(mmHash(seed * 7.77 + 0.5) * MM_MOOD_NAMES.length) % MM_MOOD_NAMES.length];
  var vary = mood ? MM_MOODS[mood] : null;
  var vseed = seed === null ? 1 : seed;
  var outDefault = $.beat("out", $.dur - 0.45);
  var defined = {};
  var defOnce = function (id, markup) { if (!defined[id]) { defined[id] = 1; $.def(markup); } return id; };
  var salt = function (name) { var h = 7; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 1000003; return h; };
  var pick = function (list, name, k) { return list[Math.floor(mmHash(vseed * 13.37 + salt(name) * 0.013 + k * 1.7) * list.length) % list.length]; };
  var moveOf = function (n) { var m = MM_ALIASES[n] || n; return MM_MOVES[m] ? m : null; };

  /** The part's motion: the item's, varied by the mood when one is asked, then the creator's. */
  function resolve(name, o, kind, hasBox) {
    var s = {};
    for (var i = 0; i < MM_FIELDS.length; i++) if (o[MM_FIELDS[i]] !== undefined) s[MM_FIELDS[i]] = o[MM_FIELDS[i]];
    if (vary && o.vary !== false) {
      var fits = function (m) { var mv = MM_MOVES[m]; return mv && (!mv.box || hasBox) && (!mv.text || kind === "text"); };
      var ins = vary["in"].filter(fits), outs = vary.out.filter(fits);
      if (ins.length) s["in"] = pick(ins, name, 1);
      if (outs.length) s.out = s.out === "none" ? "none" : pick(outs, name, 2);
      s.ease = pick(vary.ease, name, 3);
      s.idle = o.idle === undefined || o.idle === "none" ? pick(vary.idle, name, 4) : o.idle;
      if (kind === "text") s.split = pick(vary.split, name, 5);
      var dirs = ["left", "right", "up", "down"];
      s.from = pick(dirs, name, 6);
      s.order = pick(["forward", "forward", "center", "random", "reverse"], name, 7);
      s.dur = undefined;
    }
    var all = user["*"] || {}, mine = user[name] || {};
    for (var j = 0; j < MM_FIELDS.length; j++) {
      var f = MM_FIELDS[j];
      if (all[f] !== undefined) s[f] = all[f];
      if (mine[f] !== undefined) s[f] = mine[f];
    }
    s["in"] = moveOf(s["in"] == null ? "fade" : String(s["in"])) || "fade";
    s.out = s.out == null ? "fade" : String(s.out) === "none" ? "none" : moveOf(String(s.out)) || "fade";
    if (s.keys && s.keys.length && mine["in"] === undefined && all["in"] === undefined && o["in"] === undefined) s["in"] = "none";
    if (kind === "text" && MM_MOVES[s["in"]].text && (!s.split || s.split === "none" || s.split === "words" || s.split === "lines")) s.split = "letters";
    return s;
  }

  /** When the part arrives and leaves, and how. */
  function timing(s) {
    var mv = MM_MOVES[s["in"]];
    var at = (isFinite(s.at) ? Number(s.at) : 0) + (isFinite(s.delay) ? Number(s.delay) : 0);
    var dur = (s.dur > 0 ? Number(s.dur) : mv.dur) / speed;
    var omv = s.out === "none" ? null : MM_MOVES[s.out];
    var outDur = omv ? (s.outDur > 0 ? Number(s.outDur) : Math.min(0.45, Math.max(0.2, omv.dur * 0.7))) / speed : 0;
    var outAt = isFinite(s.outAt) ? (s.outAt < 0 ? $.dur + Number(s.outAt) : Number(s.outAt)) : outDefault;
    if (omv && outAt + outDur > $.dur) outAt = $.dur - outDur;
    if (outAt >= $.dur - 0.02) omv = null;
    return { at: at, dur: dur, ease: mmEase(s.ease || mv.ease, brand), mv: mv, omv: omv, outAt: outAt, outDur: outDur, oease: mmEase(s.outEase || "in", brand) };
  }

  function dirOf(name, fallback) { return MM_DIRS[String(name || fallback || "left")] || MM_DIRS.left; }

  function context(s, tm, box, ox, oy, idx) {
    var k = isFinite(s.intensity) ? Math.max(0, Number(s.intensity)) : 1;
    return {
      K: K, k: k, t: t, at: tm.at, seed: vseed * 3.1 + (idx || 0) * 0.37,
      D: (isFinite(s.distance) ? Number(s.distance) : 60) * K * k,
      v: dirOf(s.from, tm.mv.dir), vo: dirOf(s.outFrom || s.from, tm.omv && tm.omv.dir),
      box: box, ox: ox, oy: oy, ph: (idx || 0) * 0.7 + salt(String(s["in"])) * 0.001
    };
  }

  function blank() { return { x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, skx: 0, sky: 0, op: 1, bx: 0, by: 0, clips: [], glitch: 0 }; }
  function merge(P, q, w) {
    if (!q) return;
    if (w === undefined) w = 1;
    if (q.x) P.x += q.x * w; if (q.y) P.y += q.y * w; if (q.r) P.r += q.r * w; if (q.skx) P.skx += q.skx * w; if (q.sky) P.sky += q.sky * w;
    if (q.bx) P.bx += q.bx * w; if (q.by) P.by += q.by * w;
    if (q.s !== undefined) P.s *= 1 + (q.s - 1) * w; if (q.sx !== undefined) P.sx *= 1 + (q.sx - 1) * w; if (q.sy !== undefined) P.sy *= 1 + (q.sy - 1) * w;
    if (q.op !== undefined) P.op *= 1 + (q.op - 1) * w;
    if (q.clip) P.clips.push(q.clip);
    if (q.glitch) P.glitch = Math.max(P.glitch, q.glitch * w);
  }

  function hitTime(at, from) {
    if (typeof at === "number") return at;
    var s = String(at == null ? "" : at).trim();
    if (/^-?[\d.]+$/.test(s)) { var n = Number(s); return n < 0 ? $.dur + n : n; }
    var b = $.beat(s, NaN);
    if (isFinite(b)) return b;
    var w = s.replace(/^word:/, "").toLowerCase().replace(/[^a-z0-9%ऀ-ॿ]/g, "");
    for (var i = 0; i < $.words.length; i++) if ($.words[i].s >= (from || 0) - 0.05 && String($.words[i].w).toLowerCase().replace(/[^a-z0-9%ऀ-ॿ]/g, "") === w) return $.words[i].s;
    return NaN;
  }
  function hits(s) {
    var e = s.emphasis;
    if (!e) return [];
    if (typeof e === "string") e = e.split(/\s*,\s*/).filter(Boolean).map(function (x) { var p = x.split("@"); return { fx: p[0], at: p[1] }; });
    if (!Array.isArray(e)) e = [e];
    return e.filter(function (h) { return h && MM_HITS[h.fx]; });
  }

  /** A value from keyframes [{t, x, y, s, sx, sy, r, skx, op, blur, ease}] (clip seconds; negative from the end). */
  function keyed(keys, tt) {
    var out = {};
    var props = ["x", "y", "s", "sx", "sy", "r", "skx", "op", "blur"];
    var list = keys.map(function (k) { var c2 = {}; for (var key in k) c2[key] = k[key]; c2.t = Number(k.t) < 0 ? $.dur + Number(k.t) : Number(k.t); return c2; }).filter(function (k) { return isFinite(k.t); }).sort(function (a, b) { return a.t - b.t; });
    props.forEach(function (pr) {
      var ks = list.filter(function (k) { return isFinite(k[pr]); });
      if (!ks.length) return;
      var v;
      if (tt <= ks[0].t) v = Number(ks[0][pr]);
      else if (tt >= ks[ks.length - 1].t) v = Number(ks[ks.length - 1][pr]);
      else for (var i = 0; i < ks.length - 1; i++) {
        var a = ks[i], b = ks[i + 1];
        if (tt >= a.t && tt <= b.t) { var e = mmProgress(tt - a.t, b.t - a.t, mmEase(b.ease || "inOut", brand)); v = Number(a[pr]) + (Number(b[pr]) - Number(a[pr])) * e; break; }
      }
      out[pr] = v;
    });
    var q = {};
    if (out.x !== undefined) q.x = out.x * K;
    if (out.y !== undefined) q.y = out.y * K;
    if (out.r !== undefined) q.r = out.r;
    if (out.skx !== undefined) q.skx = out.skx;
    if (out.s !== undefined) q.s = out.s;
    if (out.sx !== undefined) q.sx = out.sx;
    if (out.sy !== undefined) q.sy = out.sy;
    if (out.op !== undefined) q.op = out.op;
    if (out.blur !== undefined) { q.bx = out.blur * K; q.by = out.blur * K; }
    return q;
  }

  /** The pose of a part at clip time tt. */
  function poseAt(s, tm, c, tt) {
    var P = blank();
    if (!tm.mv.always) {
      var r = tt < tm.at ? 0 : mmClamp((tt - tm.at) / tm.dur);
      var e = tt < tm.at ? 0 : mmProgress(tt - tm.at, tm.dur, tm.ease);
      merge(P, tm.mv.pose(e, r, c));
      if (s.blur === true || s.blur === "true") { var q = Math.max(0, 1 - e); merge(P, { bx: q * 18 * K, by: q * 18 * K }); }
      if (tm.mv.land && MM_HITS[tm.mv.land]) merge(P, MM_HITS[tm.mv.land](tt, tm.at + tm.dur * 0.55, c));
    }
    var leaving = 0;
    if (tm.omv && tt > tm.outAt) {
      var ro = mmClamp((tt - tm.outAt) / tm.outDur);
      var eo = mmProgress(tt - tm.outAt, tm.outDur, tm.oease);
      leaving = ro;
      var oc = {}; for (var key in c) oc[key] = c[key]; oc.v = c.vo;
      merge(P, tm.omv.pose(1 - eo, 1 - ro, oc));
      if (s.blur === true || s.blur === "true") merge(P, { bx: eo * 18 * K, by: eo * 18 * K });
    }
    var idle = MM_IDLES[s.idle];
    if (idle) { var w = mmClamp((tt - tm.at - tm.dur) / 0.4) * (1 - leaving); if (w > 0) merge(P, idle(tt, c), w); }
    hits(s).forEach(function (h) { var at = hitTime(h.at, tm.at); if (isFinite(at)) merge(P, MM_HITS[h.fx](tt, at, c)); });
    if (s.keys && s.keys.length) merge(P, keyed(s.keys, tt));
    return P;
  }

  function clipMarkup(cl, b) {
    var p = cl.p;
    if (p >= 1 || !b) return null;
    var id = $.uid("mmc");
    var R = function (x, y, w, h) { return '<rect x="' + mmNum(x, 2) + '" y="' + mmNum(y, 2) + '" width="' + mmNum(Math.max(0, w), 2) + '" height="' + mmNum(Math.max(0, h), 2) + '"/>'; };
    var pad = 40 * K, x = b.x - pad, y = b.y - pad, w = b.w + 2 * pad, h = b.h + 2 * pad;
    var q = Math.max(0, p), shape = "";
    if (cl.kind === "wipe") {
      var v = cl.v || [-1, 0];
      if (v[0] < 0) shape = R(x, y, w * q, h); else if (v[0] > 0) shape = R(x + w * (1 - q), y, w * q, h); else if (v[1] < 0) shape = R(x, y, w, h * q); else shape = R(x, y + h * (1 - q), w, h * q);
    } else if (cl.kind === "iris") shape = '<circle cx="' + mmNum(b.x + b.w / 2, 2) + '" cy="' + mmNum(b.y + b.h / 2, 2) + '" r="' + mmNum((Math.sqrt(w * w + h * h) / 2) * q, 2) + '"/>';
    else if (cl.kind === "shutter") { var n = 6; for (var i = 0; i < n; i++) shape += R(x, y + (i * h) / n, w, (h / n) * q + 0.5); }
    else if (cl.kind === "blinds") { var m = 8; for (var j = 0; j < m; j++) shape += R(x + (j * w) / m, y, (w / m) * q + 0.5, h); }
    else if (cl.kind === "diagonal") { var sx = (w + h) * q; shape = '<polygon points="' + [x, y, x + sx, y, x + sx - h, y + h, x, y + h].map(function (v2) { return mmNum(v2, 2); }).join(" ") + '"/>'; }
    $.def('<clipPath id="' + id + '" clipPathUnits="userSpaceOnUse">' + shape + "</clipPath>");
    return id;
  }

  function glitchify(inner, g, b) {
    var R = defOnce("mmgR", '<filter id="mmgR" x="-20%" y="-20%" width="140%" height="140%"><feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0"/></filter>');
    var C = defOnce("mmgC", '<filter id="mmgC" x="-20%" y="-20%" width="140%" height="140%"><feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.9 0"/></filter>');
    var off = 14 * K * g;
    var bx = b || { x: 0, y: 0, w: $.W, h: $.H };
    var out = '<g filter="url(#' + R + ')" transform="translate(' + mmNum(-off, 2) + ' 0)">' + inner + '</g><g filter="url(#' + C + ')" transform="translate(' + mmNum(off, 2) + ' 0)">' + inner + "</g>";
    var n = 5, fr = Math.floor(t * 20);
    for (var i = 0; i < n; i++) {
      var id = $.uid("mmg");
      $.def('<clipPath id="' + id + '" clipPathUnits="userSpaceOnUse"><rect x="' + mmNum(bx.x - 200 * K, 2) + '" y="' + mmNum(bx.y - 20 * K + (i * (bx.h + 40 * K)) / n, 2) + '" width="' + mmNum(bx.w + 400 * K, 2) + '" height="' + mmNum((bx.h + 40 * K) / n + 0.5, 2) + '"/></clipPath>');
      var j = (mmHash(i * 13.1 + fr * 0.71 + vseed) - 0.5) * 2 * 40 * K * g;
      out += '<g clip-path="url(#' + id + ')"><g transform="translate(' + mmNum(j, 2) + ' 0)">' + inner + "</g></g>";
    }
    return out;
  }

  /** Markup posed: transform about the pivot, glitch copies, blur, clips, opacity. */
  function render(markup, P, c) {
    if (!markup) return "";
    var op = Math.max(0, Math.min(1, P.op));
    if (op <= 0.002) return "";
    var sx = P.s * P.sx, sy = P.s * P.sy;
    if (Math.abs(sx) < 1e-4 || Math.abs(sy) < 1e-4) return "";
    var tf = "";
    if (P.x || P.y) tf += "translate(" + mmNum(P.x, 2) + " " + mmNum(P.y, 2) + ") ";
    if (P.r || P.skx || P.sky || sx !== 1 || sy !== 1) {
      tf += "translate(" + mmNum(c.ox, 2) + " " + mmNum(c.oy, 2) + ") ";
      if (P.r) tf += "rotate(" + mmNum(P.r, 2) + ") ";
      if (P.skx) tf += "skewX(" + mmNum(P.skx, 2) + ") ";
      if (P.sky) tf += "skewY(" + mmNum(P.sky, 2) + ") ";
      if (sx !== 1 || sy !== 1) tf += "scale(" + mmNum(sx, 4) + " " + mmNum(sy, 4) + ") ";
      tf += "translate(" + mmNum(-c.ox, 2) + " " + mmNum(-c.oy, 2) + ")";
    }
    var inner = tf ? '<g transform="' + tf.trim() + '">' + markup + "</g>" : markup;
    if (P.glitch > 0.02) inner = glitchify(inner, P.glitch, c.box);
    if (P.bx > 0.3 || P.by > 0.3) {
      var qx = Math.round(Math.min(60, P.bx) * 2) / 2, qy = Math.round(Math.min(60, P.by) * 2) / 2;
      var fid = defOnce("mmb" + String(qx).replace(".", "_") + "x" + String(qy).replace(".", "_"), '<filter id="mmb' + String(qx).replace(".", "_") + "x" + String(qy).replace(".", "_") + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + qx + " " + qy + '"/></filter>');
      inner = '<g filter="url(#' + fid + ')">' + inner + "</g>";
    }
    for (var i = 0; i < P.clips.length; i++) { var id = clipMarkup(P.clips[i], c.box); if (id) inner = '<g clip-path="url(#' + id + ')">' + inner + "</g>"; }
    return op < 0.999 ? '<g opacity="' + mmNum(op, 3) + '">' + inner + "</g>" : inner;
  }

  function pivot(box, origin, o, fallback) {
    if (isFinite(o.ox) && isFinite(o.oy)) return [o.ox, o.oy];
    if (!box) return [$.W / 2, $.H / 2];
    var g = String(origin || fallback || "center");
    var x = box.x + box.w / 2, y = box.y + box.h / 2;
    if (/left/.test(g)) x = box.x;
    if (/right/.test(g)) x = box.x + box.w;
    if (/top/.test(g)) y = box.y;
    if (/bottom/.test(g)) y = box.y + box.h;
    return [x, y];
  }

  var api = {};
  api.mood = mood;
  api.seed = seed;
  api.outAt = outDefault;

  /** A part: any markup, posed by its motion. o: at, box {x,y,w,h}, origin | ox/oy, in, out, dur, ease, from, distance, blur, idle, emphasis, keys … */
  api.part = function (name, o) {
    o = o || {};
    var kids = "";
    for (var i = 2; i < arguments.length; i++) { var a = arguments[i]; kids += Array.isArray(a) ? a.join("") : a == null || a === false ? "" : String(a); }
    var s = resolve(name, o, "part", !!o.box);
    var tm = timing(s);
    var pv = pivot(o.box, s.origin, o, tm.mv.origin);
    var c = context(s, tm, o.box, pv[0], pv[1], salt(name) % 97);
    return render(kids, poseAt(s, tm, c, t), c);
  };

  /** Eased progress of a part's entrance and exit at t (for things an item draws itself: a line's length, a counter). */
  api.progress = function (name, o) {
    o = o || {};
    var s = resolve(name, o, "part", !!o.box);
    var tm = timing(s);
    var inP = tm.mv.always ? 1 : t < tm.at ? 0 : mmProgress(t - tm.at, tm.dur, tm.ease);
    var outP = tm.omv && t > tm.outAt ? mmClamp((t - tm.outAt) / tm.outDur) : 0;
    return { "in": inP, out: outP, at: tm.at, end: tm.at + tm.dur, outAt: tm.omv ? tm.outAt : $.dur };
  };

  /** Where text sets: its lines, and units (lines, words or letters) with their boxes. */
  api.layout = function (str, o, split) {
    var font = {};
    for (var k2 in o) if (MM_FIELDS.indexOf(k2) < 0) font[k2] = o[k2];
    var txt = String(str == null ? "" : str);
    if (font.upper) txt = txt.toUpperCase();
    font.upper = false;
    var size = font.size || 64, lh = font.lh || 1.12, anchor = font.anchor || "start", x0 = font.x || 0, y0 = font.y || 0;
    var ls = (font.ls || 0) * size;
    var lines = font.maxW ? $.wrap(txt, font.maxW, font) : txt.split("\n");
    var units = [], minX = Infinity, maxX = -Infinity;
    var simple = /^[\u0000-ɏͰ-ϿЀ-ӿḀ-ỿ -⁯₠-⃏℀-⅏\s]*$/.test(txt);
    var mode = split === "letters" && !simple ? "words" : split;
    var pre = function (line, n) { return n ? $.measure(line.slice(0, n), font) + ls : 0; };
    lines.forEach(function (line, li) {
      var lw = $.measure(line, font);
      var lx = anchor === "middle" ? x0 - lw / 2 : anchor === "end" ? x0 - lw : x0;
      var ly = y0 + li * size * lh;
      if (lw > 0) { minX = Math.min(minX, lx); maxX = Math.max(maxX, lx + lw); }
      if (mode === "lines") units.push({ text: line, x: lx, y: ly, w: lw, h: size, line: li });
      else if (mode === "words") { var re = /\S+/g, m; while ((m = re.exec(line))) units.push({ text: m[0], x: lx + pre(line, m.index), y: ly, w: $.measure(m[0], font), h: size, line: li }); }
      else if (mode === "letters") { var at = 0; Array.from(line).forEach(function (ch) { if (!/\s/.test(ch)) units.push({ text: ch, x: lx + pre(line, at), y: ly, w: $.measure(ch, font), h: size, line: li }); at += ch.length; }); }
    });
    if (!isFinite(minX)) { minX = x0; maxX = x0; }
    units.forEach(function (u, i) { u.index = i; u.box = { x: u.x, y: u.y, w: Math.max(1, u.w), h: u.h }; });
    return { text: txt, lines: lines, units: units, font: font, mode: mode || "none", box: { x: minX, y: y0, w: Math.max(1, maxX - minX), h: size * (1 + (lines.length - 1) * lh) } };
  };

  function rank(i, n, order, name) {
    var mid = (n - 1) / 2;
    if (order === "reverse") return n - 1 - i;
    if (order === "center") return Math.abs(i - mid);
    if (order === "edges") return mid - Math.abs(i - mid);
    if (order === "random") { var r = []; for (var j = 0; j < n; j++) r.push([mmHash(j * 1.31 + salt(name) * 0.01 + vseed), j]); r.sort(function (a, b) { return a[0] - b[0]; }); for (var k = 0; k < n; k++) if (r[k][1] === i) return k; }
    return i;
  }

  /**
   * Text as a part: o takes $.text's options (x, y = top, size, family, weight, anchor, fill, ls, maxW, lh …)
   * and the part's motion; split "lines" | "words" | "letters" animates each unit in turn (order forward,
   * reverse, center, edges, random; stagger s apart), or at unitAt(unit) when the item times them itself.
   * fillFor(unit) colours a unit; units are laid out exactly as api.layout returns them.
   */
  api.text = function (name, o, str) {
    o = o || {};
    var s = resolve(name, o, "text", true);
    var tm = timing(s);
    var lay = api.layout(str, o, s.split && s.split !== "none" ? s.split : null);
    var font = lay.font;
    var draw = function (txt, x, unit) { var f = {}; for (var k in font) f[k] = font[k]; f.x = x; if (unit) { f.y = unit.y; f.anchor = "start"; f.maxW = undefined; } if (o.fillFor && unit) f.fill = o.fillFor(unit); return $.text(txt, f); };
    if (!lay.units.length || lay.mode === "none") {
      var pv = pivot(lay.box, s.origin, o, tm.mv.origin);
      var c = context(s, tm, lay.box, pv[0], pv[1], salt(name) % 97);
      return render($.text(lay.text, font), poseAt(s, tm, c, t), c);
    }
    var n = lay.units.length;
    var st = (s.stagger > 0 ? Number(s.stagger) : lay.mode === "letters" ? Math.min(0.045, 0.6 / n) : lay.mode === "words" ? Math.min(0.1, 0.9 / n) : 0.14) / speed;
    var ost = (s.outStagger >= 0 && s.outStagger !== undefined ? Number(s.outStagger) : st * 0.4) / speed;
    if (tm.omv && tm.outAt + ost * (n - 1) + tm.outDur > $.dur) ost = Math.max(0, ($.dur - tm.outAt - tm.outDur) / Math.max(1, n - 1));
    var out = "", lastShown = null;
    var behave = tm.mv.text;
    // An item may time each unit itself (words on the voice) unless the creator set the stagger or the order
    // (a mood re-times the units too, except when they follow a voice).
    var mineT = user[name] || {}, allT = user["*"] || {};
    var ownTimes = typeof o.unitAt === "function" && mineT.stagger === undefined && allT.stagger === undefined && mineT.order === undefined && allT.order === undefined && (!vary || $.words.length > 0);
    lay.units.forEach(function (u, i) {
      var rk = rank(i, n, s.order, name);
      var ut = { at: ownTimes ? Number(o.unitAt(u)) + (isFinite(s.delay) ? Number(s.delay) : 0) : tm.at + rk * st, dur: tm.dur, ease: tm.ease, mv: tm.mv, omv: tm.omv, outAt: tm.outAt + rk * ost, outDur: tm.outDur, oease: tm.oease };
      if (behave === "type") ut.at = tm.at + i * (s.stagger > 0 ? Number(s.stagger) / speed : 0.055 / speed);
      var pv2 = pivot(u.box, s.origin, {}, tm.mv.origin);
      var c2 = context(s, ut, u.box, pv2[0], pv2[1], i + 1);
      var shown = u.text;
      if (behave === "scramble" && t < ut.at + ut.dur * 0.9) {
        var pool = u.text === u.text.toLowerCase() && u.text !== u.text.toUpperCase() ? MM_SCRAMBLE.toLowerCase() : MM_SCRAMBLE;
        shown = pool.charAt(Math.floor(mmHash(i * 7.7 + Math.floor(t * 18) * 1.9 + vseed) * pool.length));
      }
      if (t >= ut.at) lastShown = u;
      out += render(draw(shown, u.x, u), poseAt(s, ut, c2, t), c2);
    });
    var typed = tm.at + n * (s.stagger > 0 ? Number(s.stagger) : 0.055) / speed;
    if (behave === "type" && lastShown && t < tm.outAt && t < typed + 1.2) {
      var blink = Math.floor(t * 2.2) % 2 === 0 || t < typed + 0.2;
      if (blink) out += '<rect x="' + mmNum(lastShown.x + lastShown.w + 4 * K, 2) + '" y="' + mmNum(lastShown.y + lastShown.h * 0.06, 2) + '" width="' + mmNum(Math.max(2, lastShown.h * 0.07), 2) + '" height="' + mmNum(lastShown.h * 0.9, 2) + '" fill="' + (font.fill || $.c.fg) + '"/>';
    }
    return out;
  };

  return api;
}
`;

/** The kit as it is prepended to a program: comments and indentation stripped (programs are capped at 60 000 characters). */
export const MOTION_KIT_CODE = MOTION_KIT.replace(/\/\*\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("//"))
  .join("\n");

/** The vocabulary, for validation, help and agents — the kit's own tables (a test keeps them equal). */
export const MOVES = ["none", "appear", "fade", "rise", "drop", "slide", "smear", "arc", "pop", "zoom", "push", "grow", "grow-x", "grow-y", "unfold", "wipe", "iris", "shutter", "blinds", "diagonal", "blur", "flip", "turn", "spin", "roll", "swing", "skew", "stretch", "squash", "bounce", "elastic", "slam", "tilt", "float", "glitch", "flicker", "typewriter", "scramble"] as const;
export const MOVE_ALIASES: Record<string, string> = { "fade-in": "fade", "slide-up": "rise", "slide-down": "drop", "zoom-in": "zoom", scale: "grow", type: "typewriter", reveal: "wipe", "motion-blur": "smear", punch: "push", jelly: "stretch" };
export const IDLES = ["none", "float", "bob", "pulse", "breathe", "wiggle", "sway", "drift", "jitter", "spin", "heartbeat", "shimmer"] as const;
export const HITS = ["pulse", "pop", "shake", "jump", "wobble", "flash", "spin", "rubber", "tada"] as const;
export const EASES = ["brand", "linear", "in", "out", "inOut", "smooth", "sine", "expo", "back", "elastic", "bounce", "snappy", "punchy", "bouncy", "calm", "gentle", "wobbly", "stiff"] as const;
export const MOODS = ["energetic", "elegant", "playful", "cinematic", "glitchy", "minimal", "retro", "kinetic"] as const;
export const SPLITS = ["none", "lines", "words", "letters"] as const;
export const ORDERS = ["forward", "reverse", "center", "edges", "random"] as const;
export const DIRECTIONS = ["left", "right", "up", "down", "top", "bottom", "up-left", "up-right", "down-left", "down-right"] as const;
export const ORIGINS = ["center", "left", "right", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"] as const;

/** One line per move, for help text and agents. */
export const MOVE_NOTES: Record<(typeof MOVES)[number], string> = {
  none: "always there, no entrance",
  appear: "cuts in at its time",
  fade: "fades in",
  rise: "rises into place",
  drop: "drops into place",
  slide: "slides in from a side (from: left | right | up | down)",
  smear: "slides in fast with motion blur",
  arc: "swoops in on a curve",
  pop: "springs up from half size",
  zoom: "zooms up from small",
  push: "settles down from big",
  grow: "scales up from nothing",
  "grow-x": "grows across (origin: left | center | right)",
  "grow-y": "grows up (origin: bottom | center | top)",
  unfold: "unfolds down from the top",
  wipe: "wiped on from a side (needs the part's box)",
  iris: "revealed by a growing circle",
  shutter: "revealed in horizontal slats",
  blinds: "revealed in vertical slats",
  diagonal: "revealed by a diagonal sweep",
  blur: "comes into focus",
  flip: "flips down like a card",
  turn: "turns in like a page",
  spin: "spins in from small",
  roll: "rolls in from a side",
  swing: "swings down from its top edge",
  skew: "skids in, leaning",
  stretch: "jelly: stretched wide, springs back",
  squash: "falls in squashed, springs back",
  bounce: "falls and bounces",
  elastic: "snaps in on an elastic",
  slam: "slams down from big with a jolt",
  tilt: "rises in tilted",
  float: "drifts up gently",
  glitch: "glitches in: RGB split, sliced, flickering",
  flicker: "flickers on",
  typewriter: "text typed letter by letter with a caret",
  scramble: "letters scramble, then settle",
};

/** What a creator (or an agent) may set on one part. */
export interface MotionSpec {
  /** Entrance move. */
  in?: string;
  /** Exit move (the move played backwards), or "none" to stay to the end. */
  out?: string;
  /** Seconds the entrance takes. */
  dur?: number;
  /** Seconds the exit takes. */
  outDur?: number;
  ease?: string;
  outEase?: string;
  /** The side a move comes from. */
  from?: string;
  /** The side an exit leaves to. */
  outFrom?: string;
  /** How far a move travels, px at 1080. */
  distance?: number;
  /** Motion blur on the way in and out. */
  blur?: boolean;
  /** A loop while the part holds. */
  idle?: string;
  /** Hits: "pulse@1.2, shake@now" or [{fx, at}] — at is seconds, a beat name or a spoken word. */
  emphasis?: string | Array<{ fx: string; at: number | string }>;
  /** Keyframes: [{t, x, y, s, sx, sy, r, skx, op, blur, ease}] in clip seconds (negative from the end), px at 1080. */
  keys?: Array<Record<string, number | string>>;
  /** Seconds added to the part's start. */
  delay?: number;
  /** Clip seconds the part starts (replaces the item's). */
  at?: number;
  /** Clip seconds the exit starts (negative from the end). */
  outAt?: number;
  /** 0–2: how far, how big, how much rotation. */
  intensity?: number;
  /** The pivot for scale, rotation and skew. */
  origin?: string;
  /** Text: animate it whole, or by lines, words or letters. */
  split?: string;
  order?: string;
  /** Seconds between units. */
  stagger?: number;
  outStagger?: number;
}

/** Per part, and "*" for every part. */
export type MotionOverrides = Record<string, MotionSpec>;

/** Overrides as they arrive from a command line, an agent or JSON: values not yet read (normalizeMotion reads them). */
export type MotionInput = Record<string, MotionSpec | Record<string, unknown>>;

export interface MotionConfig {
  parts?: MotionOverrides;
  mood?: string;
  seed?: number;
  speed?: number;
}

const EASE_FORM = /^(spring\(\s*[\d.]+\s*,\s*[\d.]+\s*\)|steps\(\s*\d+\s*\)|cubic\(\s*[-\d.]+\s*,\s*[-\d.]+\s*,\s*[-\d.]+\s*,\s*[-\d.]+\s*\))$/;
const NUMBER_FIELDS = ["dur", "outDur", "distance", "delay", "at", "outAt", "intensity", "stagger", "outStagger"] as const;

/** A move name as the kit reads it (aliases resolved), or null. */
export function moveName(v: unknown): string | null {
  const s = String(v ?? "").trim();
  const m = MOVE_ALIASES[s] ?? s;
  return (MOVES as readonly string[]).includes(m) ? m : null;
}

/** Motion overrides cleaned for a program: unknown names dropped with a warning, numbers read as numbers. */
export function normalizeMotion(cfg: { parts?: MotionInput; mood?: unknown; seed?: unknown; speed?: unknown } | undefined, parts: string[] = []): { motion: MotionConfig; warnings: string[] } {
  const warnings: string[] = [];
  const out: MotionConfig = {};
  if (!cfg) return { motion: out, warnings };
  if (cfg.mood !== undefined && cfg.mood !== "") {
    if ((MOODS as readonly string[]).includes(String(cfg.mood))) out.mood = String(cfg.mood);
    else warnings.push(`mood "${cfg.mood}" is not one of ${MOODS.join(", ")}`);
  }
  if (cfg.seed !== undefined && cfg.seed !== null && String(cfg.seed) !== "") {
    const n = Number(cfg.seed);
    if (Number.isFinite(n)) out.seed = n;
    else warnings.push(`seed "${cfg.seed}" is not a number`);
  }
  if (cfg.speed !== undefined) {
    const n = Number(cfg.speed);
    if (Number.isFinite(n) && n > 0) out.speed = Math.max(0.1, Math.min(10, n));
    else warnings.push(`speed "${cfg.speed}" is not a positive number`);
  }
  const partsOut: MotionOverrides = {};
  for (const [part, spec] of Object.entries(cfg.parts ?? {})) {
    if (part !== "*" && parts.length && !parts.includes(part)) warnings.push(`motion for an unknown part "${part}" (parts: ${parts.join(", ")}, or * for all)`);
    const s: MotionSpec = {};
    for (const [k, v] of Object.entries((spec ?? {}) as Record<string, unknown>)) {
      if (k === "in" || k === "out") {
        if (k === "out" && String(v) === "none") s.out = "none";
        else if (moveName(v)) s[k] = moveName(v)!;
        else warnings.push(`${part}.${k}: "${String(v)}" is not a move (${MOVES.join(", ")})`);
      } else if (k === "ease" || k === "outEase") {
        const e = String(v).trim();
        if ((EASES as readonly string[]).includes(e) || EASE_FORM.test(e)) s[k] = e;
        else warnings.push(`${part}.${k}: "${e}" is not an ease (${EASES.join(", ")}, spring(f,d), steps(n), cubic(x1,y1,x2,y2))`);
      } else if (k === "idle") {
        if ((IDLES as readonly string[]).includes(String(v))) s.idle = String(v);
        else warnings.push(`${part}.idle: "${String(v)}" is not one of ${IDLES.join(", ")}`);
      } else if (k === "from" || k === "outFrom") {
        if ((DIRECTIONS as readonly string[]).includes(String(v))) s[k] = String(v);
        else warnings.push(`${part}.${k}: "${String(v)}" is not one of ${DIRECTIONS.join(", ")}`);
      } else if (k === "origin") {
        if ((ORIGINS as readonly string[]).includes(String(v))) s.origin = String(v);
        else warnings.push(`${part}.origin: "${String(v)}" is not one of ${ORIGINS.join(", ")}`);
      } else if (k === "split") {
        if ((SPLITS as readonly string[]).includes(String(v))) s.split = String(v);
        else warnings.push(`${part}.split: "${String(v)}" is not one of ${SPLITS.join(", ")}`);
      } else if (k === "order") {
        if ((ORDERS as readonly string[]).includes(String(v))) s.order = String(v);
        else warnings.push(`${part}.order: "${String(v)}" is not one of ${ORDERS.join(", ")}`);
      } else if (k === "blur") s.blur = v === true || /^(1|true|yes|on)$/i.test(String(v));
      else if ((NUMBER_FIELDS as readonly string[]).includes(k)) {
        const n = Number(v);
        if (Number.isFinite(n)) (s as Record<string, number>)[k] = n;
        else warnings.push(`${part}.${k}: "${String(v)}" is not a number`);
      } else if (k === "emphasis") {
        const list = typeof v === "string" ? v.split(/\s*,\s*/).filter(Boolean).map((x) => ({ fx: x.split("@")[0]!, at: x.split("@")[1] ?? "" })) : Array.isArray(v) ? (v as Array<{ fx: string; at: number | string }>) : [];
        const ok = list.filter((h) => {
          if ((HITS as readonly string[]).includes(h.fx)) return true;
          warnings.push(`${part}.emphasis: "${h.fx}" is not one of ${HITS.join(", ")}`);
          return false;
        });
        if (ok.length) s.emphasis = ok;
      } else if (k === "keys") {
        let list: unknown = v;
        if (typeof v === "string") {
          try {
            list = JSON.parse(v);
          } catch {
            list = null;
          }
        }
        if (Array.isArray(list) && list.every((x) => x && typeof x === "object" && Number.isFinite(Number((x as { t?: unknown }).t)))) s.keys = (list as Array<Record<string, number | string>>).slice(0, 64);
        else warnings.push(`${part}.keys: give an array of {t, x, y, s, r, op, …} (t in clip seconds)`);
      } else warnings.push(`${part}: "${k}" is not a motion setting`);
    }
    partsOut[part] = s;
  }
  if (Object.keys(partsOut).length) out.parts = partsOut;
  return { motion: out, warnings };
}

/** "name.in=pop", "in=pop" (every part), "*.ease=bouncy", or a JSON object → overrides. */
export function parseMotionArgs(args: string[]): MotionInput {
  const out: Record<string, Record<string, unknown>> = {};
  for (const raw of args) {
    const a = raw.trim();
    if (a.startsWith("{")) {
      const obj = JSON.parse(a) as Record<string, Record<string, unknown>>;
      for (const [p, s] of Object.entries(obj)) out[p] = { ...(out[p] ?? {}), ...s };
      continue;
    }
    const eq = a.indexOf("=");
    if (eq < 1) throw new Error(`--motion takes part.setting=value (got "${a}")`);
    const key = a.slice(0, eq).trim();
    const value = a.slice(eq + 1).trim();
    const dot = key.lastIndexOf(".");
    const part = dot > 0 ? key.slice(0, dot) : "*";
    const field = dot > 0 ? key.slice(dot + 1) : key;
    (out[part] ??= {})[field] = value;
  }
  return out;
}
