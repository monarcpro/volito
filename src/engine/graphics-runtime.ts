// Synced from MONARC core (packages/core/src/graphics-runtime.ts) by scripts/sync-engine.mjs. Change it there and sync.
/**
 * The motion graphics runtime: the library every graphic program draws with, as plain
 * JavaScript source. The desktop loads it into the sandboxed worker that runs a program
 * (apps/desktop/src/graphics/runtime.ts); tests load it into Node's vm. It is a string,
 * not a module, so no bundler can rename or transform it — what runs is what is written
 * here. No template literals and no `${` inside: it lives in String.raw.
 *
 * The timing half is the reel kit of the video engines MONARC learned from (pure functions
 * of time: seg, spring, pop, enter, shake, typed …); the drawing half returns SVG markup
 * strings, so a frame is `frame(t, $)` → one SVG body, drawn the same way in the player,
 * the export and on the phone.
 *
 * `MG.make(env, t)` builds the `$` a program sees for the frame at clip time `t`.
 */
export const MG_RUNTIME = String.raw`
var MG = (function () {
  "use strict";
  var clamp = function (v, a, b) { if (a === undefined) a = 0; if (b === undefined) b = 1; return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, p) { return a + (b - a) * p; };
  var seg = function (t, a, b) { return b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)); };
  // ———————— the sound trace ————————
  // While a trace is on (the sound designer reading a graphic), the timing helpers note when each
  // element starts — [kind, t0, a, b] — so a sound can land with it. Off, it costs one null check.
  var TRACE = null;
  var mark = function (k, t0, a, b) { if (TRACE !== null && typeof t0 === "number" && isFinite(t0)) TRACE.push([k, t0, a === undefined ? null : a, b === undefined ? null : b]); };
  var E = {
    lin: function (p) { return p; },
    out2: function (p) { return 1 - (1 - p) * (1 - p); },
    out3: function (p) { return 1 - Math.pow(1 - p, 3); },
    out5: function (p) { return 1 - Math.pow(1 - p, 5); },
    in2: function (p) { return p * p; },
    in3: function (p) { return p * p * p; },
    inOut2: function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; },
    inOut3: function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
    sine: function (p) { return 0.5 - 0.5 * Math.cos(Math.PI * p); },
    outBack: function (p) { var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
    outElastic: function (p) { if (p <= 0) return 0; if (p >= 1) return 1; return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1; }
  };
  /** A damped spring from 0 to 1, dt seconds after it was let go (overshoots a little). */
  var spring = function (dt, f, d) { if (f === undefined) f = 2.4; if (d === undefined) d = 7; return dt <= 0 ? 0 : 1 - Math.exp(-d * dt) * Math.cos(2 * Math.PI * f * dt); };
  var wave = function (t, period, phase) { return 0.5 - 0.5 * Math.cos((2 * Math.PI * (t + (phase || 0))) / period); };
  var hash = function (n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  var num = function (v, k) { if (!isFinite(v)) return "0"; var m = Math.pow(10, k); return String(Math.round(v * m) / m); };
  var fx = function (v) { return num(v, 2); };
  var fx3 = function (v) { return num(v, 3); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var pop = function (t, t0, f, d) { mark("pop", t0); return spring(t - t0, f === undefined ? 2.2 : f, d === undefined ? 6.5 : d); };
  var fadeIn = function (t, t0, dur) { mark("fade", t0); return E.out3(seg(t, t0, t0 + (dur === undefined ? 0.3 : dur))); };
  var fadeOut = function (t, t1, dur) { return 1 - E.in2(seg(t, t1, t1 + (dur === undefined ? 0.3 : dur))); };
  /** Up fast, down slower: a flash or a glow that answers a hit at t0. */
  var bump = function (t, t0, up, down) { mark("bump", t0); if (up === undefined) up = 0.07; if (down === undefined) down = 0.25; return t < t0 ? 0 : t < t0 + up ? (t - t0) / up : 1 - seg(t, t0 + up, t0 + up + down); };
  /** A decaying jolt from t0: [dx, dy] in px. */
  var shake = function (t, t0, amp, dur) {
    if (amp === undefined) amp = 18; if (dur === undefined) dur = 0.45;
    mark("shake", t0, amp);
    var dt = t - t0;
    if (dt < 0 || dt > dur) return [0, 0];
    var k = Math.pow(1 - dt / dur, 2) * amp;
    var n = Math.floor(dt * 60);
    return [(hash(n * 3 + 1) - 0.5) * 2 * k, (hash(n * 5 + 2) - 0.5) * 2 * k];
  };
  var typed = function (t, t0, text, cps) { mark("typed", t0, String(text).length / (cps || 14)); return String(text).slice(0, Math.max(0, Math.floor((t - t0) * (cps || 14)))); };
  var group3 = function (n) { var s = String(Math.abs(Math.round(n))); var out = ""; while (s.length > 3) { out = "," + s.slice(-3) + out; s = s.slice(0, -3); } return (n < 0 ? "-" : "") + s + out; };
  /** 1,284 · 12.4K · 1.2M */
  var count = function (n) {
    n = Math.round(n);
    if (Math.abs(n) < 10000) return group3(n);
    if (Math.abs(n) < 1e6) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  };

  // ———————— transforms ————————
  /** A transform attribute value: translate, then rotate/scale about (ox, oy). */
  var tf = function (o) {
    o = o || {};
    var x = o.x || 0, y = o.y || 0, r = o.r || 0;
    var sx = o.sx != null ? o.sx : o.s != null ? o.s : 1;
    var sy = o.sy != null ? o.sy : o.s != null ? o.s : 1;
    var ox = o.ox || 0, oy = o.oy || 0;
    var out = "";
    if (x || y) out += "translate(" + fx(x) + " " + fx(y) + ") ";
    if (r || sx !== 1 || sy !== 1) {
      if (ox || oy) out += "translate(" + fx(ox) + " " + fx(oy) + ") ";
      if (r) out += "rotate(" + fx(r) + ") ";
      if (sx !== 1 || sy !== 1) out += "scale(" + fx3(sx) + " " + fx3(sy) + ") ";
      if (ox || oy) out += "translate(" + fx(-ox) + " " + fx(-oy) + ")";
    }
    return out.trim();
  };
  var poseAttrs = function (p, ox, oy) {
    var t = tf({ x: p.x, y: p.y, s: p.s, r: p.r, ox: ox, oy: oy });
    return 'opacity="' + fx3(clamp(p.o)) + '"' + (t ? ' transform="' + t + '"' : "");
  };
  /** The pose of an element entering at t0: rises dy px, scales from s0, springs into place. */
  var enterPose = function (t, t0, o) {
    o = o || {};
    mark("enter", t0, Math.abs(o.dx || 0), Math.abs(o.dy === undefined ? 40 : o.dy));
    var p = pop(t, t0, o.f === undefined ? 2.2 : o.f, o.d === undefined ? 6.5 : o.d);
    var op = fadeIn(t, t0, (o.dur === undefined ? 0.45 : o.dur) * 0.6);
    return { o: op, x: (1 - p) * (o.dx || 0), y: (1 - p) * (o.dy === undefined ? 40 : o.dy), s: lerp(o.s0 === undefined ? 0.9 : o.s0, 1, p), r: (1 - p) * (o.rot || 0) };
  };
  /** The pose of an element that has entered at a and leaves to be gone by b. */
  var lifePose = function (t, a, b, o) {
    o = o || {};
    var p = enterPose(t, a, o);
    if (b != null && isFinite(b)) {
      var out = o.out === undefined ? 0.25 : o.out;
      mark("exit", b - out);
      var q = out > 0 ? E.in2(seg(t, b - out, b)) : 0;
      p.o *= 1 - q;
      p.y += -q * (o.exitDy === undefined ? 30 : o.exitDy);
      p.x += q * (o.exitDx || 0);
      p.s *= 1 - q * (o.exitShrink || 0);
    }
    return p;
  };

  // ———————— fonts and text measure ————————
  var FAMILIES = { "inter": "Inter", "space grotesk": "Space Grotesk", "space mono": "Space Mono", "poppins": "Poppins", "playfair display": "Playfair Display", "montserrat": "Montserrat", "anton": "Anton", "outfit": "Outfit", "gabarito": "Gabarito", "caveat": "Caveat", "press start 2p": "Press Start 2P", "permanent marker": "Permanent Marker", "patrick hand": "Patrick Hand", "fredoka": "Fredoka", "im fell english": "IM Fell English" };
  var familyName = function (f) { var k = String(f || "Inter").toLowerCase().trim(); return FAMILIES[k] || "Inter"; };
  var familyCss = function (f) { var n = familyName(f); return "'" + n + "', " + (n === "Space Mono" || n === "Press Start 2P" ? "ui-monospace, monospace" : n === "Playfair Display" || n === "IM Fell English" ? "Georgia, serif" : n === "Caveat" || n === "Permanent Marker" || n === "Patrick Hand" ? "'Comic Sans MS', cursive" : "Helvetica, Arial, sans-serif"); };
  /** Faces cut in one weight: any other weight asked of them would be faux-bolded, so they keep their own. */
  var ONE_WEIGHT = { "Anton": 400, "Press Start 2P": 400, "Permanent Marker": 400, "Patrick Hand": 400, "IM Fell English": 400 };
  var weightOf = function (family, w) { return ONE_WEIGHT[familyName(family)] || w || 700; };
  var measureCtx = null;
  try { if (typeof OffscreenCanvas !== "undefined") measureCtx = new OffscreenCanvas(8, 8).getContext("2d"); } catch (e) { measureCtx = null; }
  var NARROW = "il.,:;'!|ijtfr()[]{} ";
  var WIDE = "mwMW@%";
  var estimateWidth = function (s, size, weight) {
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (NARROW.indexOf(ch) >= 0) w += 0.3;
      else if (WIDE.indexOf(ch) >= 0) w += 0.86;
      else if (ch >= "A" && ch <= "Z") w += 0.68;
      else if (ch >= "0" && ch <= "9") w += 0.6;
      else w += 0.55;
    }
    return w * size * (1 + ((weight || 700) - 400) / 2200);
  };
  var fontOf = function (o) { return (o.italic ? "italic " : "") + weightOf(o.family, o.weight) + " " + (o.size || 64) + "px " + familyCss(o.family); };
  /** Width in px of one line of text in a font: { size, weight, family, ls (em), italic, upper }. */
  var measure = function (str, o) {
    o = o || {};
    var s = String(str == null ? "" : str);
    if (o.upper) s = s.toUpperCase();
    var size = o.size || 64;
    var ls = (o.ls || 0) * size * Math.max(0, s.length - 1);
    if (measureCtx) {
      measureCtx.font = fontOf(o);
      return measureCtx.measureText(s).width + ls;
    }
    return estimateWidth(s, size, o.weight) + ls;
  };
  /** Lines of text no wider than maxW (words kept whole; a word longer than maxW gets its own line). */
  var wrap = function (str, maxW, o) {
    var out = [];
    String(str == null ? "" : str).split("\n").forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean);
      var line = "";
      words.forEach(function (w) {
        var next = line ? line + " " + w : w;
        if (line && measure(next, o) > maxW) { out.push(line); line = w; } else line = next;
      });
      out.push(line);
    });
    return out;
  };

  // ———————— the $ a frame draws with ————————
  function make(env, t) {
    env = env || {};
    var W = env.width || 1080, H = env.height || 1920;
    var words = Array.isArray(env.words) ? env.words : [];
    var defs = [];
    var warnings = [];
    var uidN = 0;
    var palette = Array.isArray(env.palette) && env.palette.length ? env.palette : ["#FF6A3D", "#FFE14D", "#0D0D11", "#F6F1E7"];
    // Roles by lightness, whatever order the colours came in: ink is always the darkest (a ground),
    // paper always the lightest (text on it), the accent the first colour that is neither.
    var lum = function (hex) {
      var h = String(hex).replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h.slice(0, 6), 16);
      if (!isFinite(n)) return 0.5;
      return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
    };
    var byLum = palette.slice().sort(function (a, b) { return lum(a) - lum(b); });
    var ink = lum(byLum[0]) < 0.3 ? byLum[0] : "#0D0D11";
    var paper = lum(byLum[byLum.length - 1]) > 0.7 ? byLum[byLum.length - 1] : "#F6F1E7";
    var rest = palette.filter(function (x) { return x !== ink && x !== paper; });
    var c = {
      accent: rest[0] || palette[0], accent2: rest[1] || "#FFE14D", ink: ink, paper: paper,
      ink2: "#17171E", ink3: "#22222B", mute: "rgba(246,241,231,0.6)", line: "rgba(246,241,231,0.09)",
      green: "#34D27B", red: "#FF4A3D", white: "#FFFFFF", black: "#000000"
    };
    // A brand style (TitleProgram.style) names the roles outright; mode says which of ink and paper is the ground.
    var st = env.style && typeof env.style === "object" && env.style.colors ? env.style : null;
    var rgba = function (hex, a) {
      var h = String(hex).replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h.slice(0, 6), 16);
      if (!isFinite(n)) return hex;
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + fx3(clamp(a)) + ")";
    };
    if (st) {
      var sc = st.colors;
      if (sc.accent) c.accent = sc.accent;
      if (sc.accent2) c.accent2 = sc.accent2;
      if (sc.ink) c.ink = sc.ink;
      if (sc.paper) c.paper = sc.paper;
      if (sc.surface && st.mode !== "light") c.ink2 = sc.surface;
      if (sc.positive) c.green = sc.positive;
      if (sc.negative) c.red = sc.negative;
    }
    var light = !!st && st.mode === "light";
    c.bg = light ? c.paper : c.ink;
    c.fg = light ? c.ink : c.paper;
    c.surface = st && st.colors.surface ? st.colors.surface : light ? "#FFFFFF" : c.ink2;
    c.mute = rgba(c.fg, 0.6);
    c.line = rgba(c.fg, light ? 0.12 : 0.09);
    c.tint = rgba(c.accent, light ? 0.14 : 0.12);
    /** Ink or paper — whichever reads better on a fill. */
    var onColor = function (bgHex) { return lum(bgHex) > 0.55 ? c.ink : c.paper; };
    var parseFace = function (spec, dflt) {
      var parts = String(spec || dflt).split(":");
      return { family: familyName(parts[0]), weight: parseInt(parts[1], 10) || 700, italic: /i(talic)?$/i.test(parts[1] || "") };
    };
    var faces = {
      display: parseFace(st && st.fonts && st.fonts.display, "Inter:900"),
      text: parseFace(st && st.fonts && st.fonts.text, "Inter:700"),
      mono: parseFace(st && st.fonts && st.fonts.mono, "Space Mono:700"),
      accent: parseFace(st && st.fonts && st.fonts.accent, "Playfair Display:400i")
    };
    /** A face by role ("display" | "text" | "mono" | "accent") → { family, weight, italic } to spread into text options. */
    var font = function (role) { var f = faces[role] || faces.text; return { family: f.family, weight: f.weight, italic: f.italic }; };
    /** The style's case applied to a string (upper / title / as written). */
    var caseOf = function (str) {
      var s2 = String(str == null ? "" : str);
      if (!st) return s2;
      if (st.case === "upper") return s2.toUpperCase();
      if (st.case === "title") return s2.replace(/[A-Za-z][^ ]*/g, function (w) { return w.charAt(0).toUpperCase() + w.slice(1); });
      return s2;
    };
    var K = Math.min(W, H) / 1080;
    var MOT = { snappy: [2.2, 6.5], punchy: [2.8, 8.5], bouncy: [2.5, 4.8], smooth: [1.5, 9.5], calm: [1.1, 10] };
    var mot = MOT[st && st.motion] || MOT.snappy;
    var copy = function (o) { var o2 = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) o2[k] = o[k]; return o2; };
    var withMot = function (o) {
      o = o || {};
      if (o.f !== undefined && o.d !== undefined) return o;
      var o2 = copy(o);
      if (o2.f === undefined) o2.f = mot[0];
      if (o2.d === undefined) o2.d = mot[1];
      return o2;
    };
    var styleInfo = st ? { name: st.name || "", mode: st.mode, case: st.case, motion: st.motion, surface: st.surface, texture: st.texture, radius: (st.radius == null ? 28 : st.radius) * K, fonts: faces } : { name: "", mode: "dark", case: "as written", motion: "snappy", surface: "soft", texture: "grid", radius: 36 * K, fonts: faces };
    /** Text options with the style's face for a role filled in where the caller named none. */
    var withFace = function (o, role) {
      o = o || {};
      if (o.family && o.weight != null) return o;
      var f = faces[role || "text"];
      var o2 = copy(o);
      if (!o2.family) { o2.family = st ? f.family : "Inter"; if (o2.italic === undefined && st && f.italic) o2.italic = true; }
      if (o2.weight == null) o2.weight = st ? f.weight : 700;
      return o2;
    };
    var region = env.region || { x: 0, y: 0, w: W, h: H };
    var win = env.window || null;
    var uid = function (p) { uidN++; return "mg" + (p || "u") + uidN; };
    var def = function (markup) { defs.push(String(markup)); return ""; };
    var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9%ऀ-ॿ]/g, ""); };
    var normWords = words.map(function (w) { return norm(w.w); });

    /** When the n-th occurrence of a spoken word (or phrase) starts — clip seconds; edge "e" for its end. */
    var at = function (word, n, edge) {
      n = n || 0;
      var q = String(word).split(/\s+/).map(norm).filter(Boolean);
      if (!q.length) { warnings.push("at(): empty word"); return 0; }
      var k = 0;
      var tries = [
        function (i, j) { return normWords[i + j] === q[j]; },
        function (i, j) { var a = normWords[i + j] || ""; return a.length >= 3 && q[j].length >= 3 && (a.indexOf(q[j]) === 0 || q[j].indexOf(a) === 0); }
      ];
      for (var m = 0; m < tries.length; m++) {
        k = 0;
        for (var i = 0; i < normWords.length; i++) {
          var ok = true;
          for (var j = 0; j < q.length; j++) if (!tries[m](i, j)) { ok = false; break; }
          if (ok && k++ === n) return edge === "e" ? words[i + q.length - 1].e : words[i].s;
        }
      }
      warnings.push('at("' + word + '"' + (n ? ", " + n : "") + ') is not in the words spoken over this graphic');
      return NaN;
    };
    /** at(), or the fallback when the word is not spoken over this graphic (the miss is still reported). */
    var atOr = function (word, fallback, n, edge) { var v = at(word, n, edge); return isFinite(v) ? v : fallback; };
    /** A named moment (clip seconds) the agent gave this graphic, or the fallback. */
    var beat = function (name, fallback) {
      var b = env.beats && env.beats[name];
      if (typeof b === "number" && isFinite(b)) { mark("beat", b); return b; }
      if (fallback === undefined) warnings.push('beat("' + name + '") is not set');
      return fallback === undefined ? 0 : fallback;
    };
    /** Rows of display words timed to the voice: rows are strings, *stars* mark highlighted runs. Words the voice does not say follow the one before. */
    var sync = function (rows, start, lead) {
      if (start === undefined) start = 0;
      if (lead === undefined) lead = 0.04;
      var i = 0;
      while (i < words.length && words[i].s < start - 0.05) i++;
      var last = start;
      var inHl = false;
      return (Array.isArray(rows) ? rows : [rows]).map(function (row) {
        return String(row).split(" ").filter(Boolean).map(function (word) {
          if (word.charAt(0) === "*") inHl = true;
          var hl = inHl;
          if (/\*[.,!?…:]*$/.test(word)) inHl = false;
          var text = word.replace(/\*/g, "");
          var k = norm(text);
          var j = i;
          while (j < words.length && normWords[j] !== k) j++;
          if (k && j < words.length) { last = words[j].s - lead; i = j + 1; } else last += 0.07;
          return { text: text, at: last, hl: hl };
        });
      });
    };

    // ———— shapes ————
    var fill = function (v, dflt) { return v == null ? dflt : v; };
    var common = function (o) {
      var s = "";
      if (o.op != null) s += ' opacity="' + fx3(clamp(o.op)) + '"';
      if (o.shadow) s += ' filter="url(#mg-' + o.shadow + ')"';
      if (o.transform) {
        // A pose ($.enter / $.life return attributes) passed as a transform: use its attributes as they are.
        var tr = String(o.transform);
        if (tr.indexOf('="') >= 0) s += " " + (o.op != null ? tr.replace(/opacity="[^"]*"\s*/, "") : tr);
        else s += ' transform="' + tr + '"';
      }
      if (o.extra) s += " " + o.extra;
      return s;
    };
    var strokeAttrs = function (o, dflt) {
      var st = fill(o.stroke, dflt);
      if (!st) return "";
      return ' stroke="' + st + '" stroke-width="' + fx(fill(o.sw, 2)) + '"' + (o.cap ? ' stroke-linecap="' + o.cap + '"' : "") + (o.join ? ' stroke-linejoin="' + o.join + '"' : "") + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "");
    };
    var rect = function (x, y, w, h, o) {
      o = o || {};
      var r = fill(o.r, 0);
      return '<rect x="' + fx(x) + '" y="' + fx(y) + '" width="' + fx(Math.max(0, w)) + '" height="' + fx(Math.max(0, h)) + '"' + (r ? ' rx="' + fx(Math.min(r, w / 2, h / 2)) + '"' : "") + ' fill="' + fill(o.fill, "none") + '"' + strokeAttrs(o, null) + common(o) + "/>";
    };
    var circle = function (cx, cy, r, o) {
      o = o || {};
      return '<circle cx="' + fx(cx) + '" cy="' + fx(cy) + '" r="' + fx(Math.max(0, r)) + '" fill="' + fill(o.fill, "none") + '"' + strokeAttrs(o, null) + common(o) + "/>";
    };
    /** A path; draw (0–1) draws it on along its length. */
    var path = function (d, o) {
      o = o || {};
      var drawn = o.draw != null ? ' pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + fx3(1 - clamp(o.draw)) + '"' : "";
      return '<path d="' + d + '" fill="' + fill(o.fill, "none") + '"' + strokeAttrs({ stroke: fill(o.stroke, o.fill ? null : c.fg), sw: o.sw, cap: fill(o.cap, "round"), join: fill(o.join, "round"), dash: o.draw != null ? null : o.dash }, null) + drawn + common(o) + "/>";
    };
    /** A straight line drawn p (0–1) of the way from (x1,y1) to (x2,y2). */
    var line = function (x1, y1, x2, y2, o) {
      o = o || {};
      var p = clamp(fill(o.p, 1));
      return '<line x1="' + fx(x1) + '" y1="' + fx(y1) + '" x2="' + fx(lerp(x1, x2, p)) + '" y2="' + fx(lerp(y1, y2, p)) + '"' + strokeAttrs({ stroke: fill(o.stroke, c.fg), sw: fill(o.sw, 4), cap: fill(o.cap, "round"), dash: o.dash }, null) + common(o) + "/>";
    };
    /** A gradient in defs; returns "url(#id)" for a fill. stops: ["#a", "#b"] or [[0,"#a"],[1,"#b"]]. */
    var gradient = function (stops, o) {
      o = o || {};
      var id = uid("gr");
      var list = stops.map(function (s, i) { return Array.isArray(s) ? s : [stops.length > 1 ? i / (stops.length - 1) : 0, s]; });
      var st = list.map(function (s) { return '<stop offset="' + fx3(s[0]) + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + fx3(s[2]) + '"' : "") + "/>"; }).join("");
      if (o.radial) def('<radialGradient id="' + id + '" cx="' + fx3(fill(o.cx, 0.5)) + '" cy="' + fx3(fill(o.cy, 0.5)) + '" r="' + fx3(fill(o.r, 0.5)) + '">' + st + "</radialGradient>");
      else {
        var a = ((fill(o.angle, 90) - 90) * Math.PI) / 180;
        var dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
        def('<linearGradient id="' + id + '" x1="' + fx3(0.5 - dx) + '" y1="' + fx3(0.5 - dy) + '" x2="' + fx3(0.5 + dx) + '" y2="' + fx3(0.5 + dy) + '">' + st + "</linearGradient>");
      }
      return "url(#" + id + ")";
    };
    /** Children as markup: strings, arrays of strings, nested; falsy ones drop out. */
    var join = function (list) {
      var out = "";
      for (var i = 0; i < list.length; i++) {
        var x = list[i];
        if (Array.isArray(x)) out += join(x);
        else if (x || x === 0) out += String(x);
      }
      return out;
    };
    /** A group: <g opacity transform>children…</g>. attrs is an attribute string (from enter/life) or an object {op, transform}; any number of children. */
    var g = function (attrs) {
      var kids = join(Array.prototype.slice.call(arguments, 1));
      // A bare number is an opacity ($.g($.fadeIn(t, a), …) — a common slip).
      if (typeof attrs === "number") attrs = { op: attrs };
      // A string that is not attributes (a child passed first) is a child.
      else if (typeof attrs === "string" && attrs && attrs.charAt(0) === "<") { kids = attrs + kids; attrs = ""; }
      if (attrs && typeof attrs === "object") {
        // { op, transform: $.enter(...) }: the pose goes on an inner group so no attribute is written twice.
        if (typeof attrs.transform === "string" && attrs.transform.indexOf('="') >= 0) {
          var rest = copy(attrs);
          var pose = rest.transform;
          delete rest.transform;
          return "<g " + common(rest).trim() + "><g " + pose + ">" + kids + "</g></g>";
        }
        attrs = common(attrs).trim();
      }
      return "<g " + (attrs || "") + ">" + kids + "</g>";
    };
    /** Clip children to a rounded rectangle. */
    var clip = function (x, y, w, h, r) {
      var id = uid("cp");
      def('<clipPath id="' + id + '"><rect x="' + fx(x) + '" y="' + fx(y) + '" width="' + fx(w) + '" height="' + fx(h) + '"' + (r ? ' rx="' + fx(r) + '"' : "") + "/></clipPath>");
      return '<g clip-path="url(#' + id + ')">' + join(Array.prototype.slice.call(arguments, 5)) + "</g>";
    };

    // ———— text ————
    var ASC = 0.8;
    /** Report text wider than the space it is drawn in (the region, else the canvas) — it gets cut off at the edge. */
    var overflow = function (whole, lines, x, o) {
      var anchor = fill(o.anchor, "start");
      var box = o.within || region;
      for (var i = 0; i < lines.length; i++) {
        var w = measure(lines[i], o);
        var left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
        var over = Math.max(box.x - left, left + w - (box.x + box.w));
        if (over > box.w * 0.01) {
          var msg = 'text "' + String(lines[i]).slice(0, 40) + '" is ' + Math.round(w) + " px wide and runs " + Math.round(over) + " px off the frame (" + Math.round(box.w) + " px) — make it smaller, wrap it with maxW, or split the line";
          if (warnings.indexOf(msg) < 0) warnings.push(msg);
          return;
        }
      }
    };
    /** Text with its TOP at y (not the baseline). o: size, weight, family, fill, anchor start|middle|end, ls (em), lh, maxW (wraps), upper, italic, op, stroke, sw, shadow. */
    var text = function (str, o) {
      o = withFace(o, "text");
      var size = fill(o.size, 64);
      var s = String(str == null ? "" : str);
      if (o.upper) s = s.toUpperCase();
      var lines = o.maxW ? wrap(s, o.maxW, o) : s.split("\n");
      var x = fill(o.x, 0);
      var y = fill(o.y, 0);
      overflow(s, lines, x, o);
      var out = '<text x="' + fx(x) + '" y="' + fx(y + size * ASC) + '" font-family="' + familyCss(o.family) + '" font-size="' + fx(size) + '" font-weight="' + weightOf(o.family, fill(o.weight, 700)) + '"' + (o.italic ? ' font-style="italic"' : "") + ' fill="' + fill(o.fill, c.fg) + '"' + (o.ls ? ' letter-spacing="' + fx(o.ls * size) + '"' : "") + ' text-anchor="' + fill(o.anchor, "start") + '" xml:space="preserve"' + (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + fx(fill(o.sw, size * 0.08)) + '" paint-order="stroke" stroke-linejoin="round"' : "") + common(o) + ">";
      for (var i = 0; i < lines.length; i++) out += '<tspan x="' + fx(x) + '"' + (i ? ' dy="' + fx(size * fill(o.lh, 1.12)) + '"' : "") + ">" + esc(lines[i]) + "</tspan>";
      return out + "</text>";
    };
    /** Height of a block of text: lines × size × lh. */
    var textHeight = function (str, o) {
      o = withFace(o, "text");
      var lines = o.maxW ? wrap(String(str), o.maxW, o) : String(str).split("\n");
      return fill(o.size, 64) * (1 + (lines.length - 1) * fill(o.lh, 1.12));
    };
    /**
     * Kinetic headline: rows of {text, at, hl} (from sync()) pop in word by word on their times;
     * highlighted runs get a marker swiped under them after the run is said.
     * o: x, y (top), size, weight, family, fill, anchor (middle), ls, lh, marker (colour), hlFill, out (seconds it leaves).
     */
    var headline = function (t, rows, o) {
      o = o || {};
      var size = fill(o.size, 84);
      var font = { size: size, weight: fill(o.weight, st ? faces.display.weight : 800), family: fill(o.family, st ? faces.display.family : "Inter"), ls: fill(o.ls, -0.03), italic: o.italic, upper: o.upper === undefined ? !!st && st.case === "upper" : o.upper };
      var space = measure(" ", font) + (font.ls || 0) * size;
      var anchor = fill(o.anchor, "middle");
      var x0 = fill(o.x, W / 2), y0 = fill(o.y, 200), lh = fill(o.lh, 1.12);
      var out = "";
      rows.forEach(function (row, ri) {
        var ws = row.map(function (w) { return { text: w.text, at: w.at, hl: w.hl, width: measure(w.text, font) }; });
        var total = ws.reduce(function (a, w) { return a + w.width; }, 0) + space * Math.max(0, ws.length - 1);
        var x = anchor === "middle" ? x0 - total / 2 : anchor === "end" ? x0 - total : x0;
        var top = y0 + ri * size * lh;
        var xs = [];
        ws.forEach(function (w) { xs.push(x); x += w.width + space; });
        // Marker runs behind the words.
        for (var i = 0; i < ws.length; i++) {
          if (!ws[i].hl) continue;
          var j = i;
          while (j + 1 < ws.length && ws[j + 1].hl) j++;
          var left = xs[i] - size * 0.1;
          var right = xs[j] + ws[j].width + size * 0.1;
          var sweep = E.out3(seg(t, ws[j].at + 0.08, ws[j].at + 0.4));
          if (sweep > 0) out += '<rect x="' + fx(left) + '" y="' + fx(top + size * 0.18) + '" width="' + fx(right - left) + '" height="' + fx(size * 0.86) + '" rx="' + fx(size * 0.14) + '" fill="' + fill(o.marker, c.accent2) + '" transform="' + tf({ sx: sweep, r: -1.2, ox: left, oy: top + size * 0.6 }) + '"/>';
          i = j;
        }
        ws.forEach(function (w, k) {
          mark("word", w.at);
          var p = pop(t, w.at, mot[0] + 0.2, mot[1] + 1);
          var op = fadeIn(t, w.at, 0.16);
          if (op <= 0.001) return;
          var cx = xs[k] + w.width / 2, cy = top + size * 0.5;
          out += '<g opacity="' + fx3(op) + '" transform="' + tf({ y: (1 - p) * size * 0.4, s: lerp(0.75, 1, p), ox: cx, oy: cy }) + '">' + text(w.text, { x: xs[k], y: top, size: size, weight: font.weight, family: font.family, ls: font.ls, italic: font.italic, upper: font.upper, fill: w.hl ? fill(o.hlFill, fill(o.fill, c.fg)) : fill(o.fill, c.fg) }) + "</g>";
        });
      });
      if (o.out != null) {
        var q = E.in2(seg(t, o.out, o.out + 0.25));
        return '<g opacity="' + fx3(1 - q) + '" transform="translate(0 ' + fx(-q * 40) + ')">' + out + "</g>";
      }
      return out;
    };
    /** Letters of one word popping in one after another from t0 (stagger s apart), each rising dy px. */
    var letters = function (t, t0, str, o) {
      o = o || {};
      var size = fill(o.size, 160);
      var font = { size: size, weight: fill(o.weight, st ? faces.display.weight : 900), family: fill(o.family, st ? faces.display.family : "Inter"), ls: fill(o.ls, -0.04), italic: o.italic };
      var up = o.upper === undefined ? !!st && st.case === "upper" : o.upper;
      var s = up ? String(str).toUpperCase() : String(str);
      var widths = [];
      for (var i = 0; i < s.length; i++) widths.push(measure(s[i], font) + (font.ls || 0) * size);
      var total = widths.reduce(function (a, b) { return a + b; }, 0) - (font.ls || 0) * size;
      var anchor = fill(o.anchor, "middle");
      overflow(s, [s], anchor === "middle" ? fill(o.x, W / 2) : fill(o.x, 0), { size: size, weight: font.weight, family: font.family, ls: font.ls, italic: font.italic, anchor: anchor });
      var x = anchor === "middle" ? fill(o.x, W / 2) - total / 2 : anchor === "end" ? fill(o.x, W) - total : fill(o.x, 0);
      var out = "";
      for (var k = 0; k < s.length; k++) {
        var a = t0 + k * fill(o.stagger, 0.03);
        if (s[k] !== " ") mark("letter", a);
        var q = pop(t, a, 2.4, 7);
        var op = fadeIn(t, a, 0.12);
        if (op > 0.001 && s[k] !== " ") out += '<g opacity="' + fx3(op) + '" transform="translate(0 ' + fx((1 - q) * fill(o.dy, size * 0.6)) + ')">' + text(s[k], { x: x, y: fill(o.y, 0), size: size, weight: font.weight, family: font.family, italic: font.italic, fill: fill(o.fill, c.fg) }) + "</g>";
        x += widths[k];
      }
      return out;
    };
    /** Text typed from t0 at cps characters a second, with a blinking caret while it types. */
    var typing = function (t, t0, str, o) {
      o = o || {};
      var shown = typed(t, t0, str, fill(o.cps, 16));
      var size = fill(o.size, 48);
      var done = shown.length >= String(str).length;
      var caret = !done || Math.floor(t * 2) % 2 === 0 ? '<rect x="' + fx(fill(o.x, 0) + measure(shown, o) + size * 0.08) + '" y="' + fx(fill(o.y, 0) + size * 0.08) + '" width="' + fx(size * 0.08) + '" height="' + fx(size * 0.9) + '" fill="' + fill(o.caret, c.accent) + '"/>' : "";
      return text(shown, o) + (o.noCaret ? "" : caret);
    };
    /** 0 → n with commas over [a, b] (eased), as a string; o: from, dec (decimals), prefix, suffix, short (12.4K). */
    var counter = function (t, a, b, n, o) {
      o = o || {};
      mark("count", a, b - a);
      var v = lerp(fill(o.from, 0), n, E.out3(seg(t, a, b)));
      var s = o.short ? count(v) : o.dec ? v.toFixed(o.dec) : group3(v);
      return fill(o.prefix, "") + s + fill(o.suffix, "");
    };

    // ———— icons (24-unit, 2px stroke, Lucide-style) ————
    var ICONS = {
      target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
      list: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>',
      search: '<circle cx="11" cy="11" r="6.5"/><path d="M20.5 20.5l-4.6-4.6"/>',
      map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
      code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/>',
      check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
      x: '<path d="M6 6l12 12M18 6L6 18"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      minus: '<path d="M5 12h14"/>',
      gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
      wrench: '<path d="M14.5 5.5a4 4 0 0 0-5 5L3.5 16.5a2.1 2.1 0 0 0 3 3l6-6a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
      flag: '<path d="M5 21V3.5M5 4h12l-2.5 4.5L17 13H5"/>',
      brain: '<path d="M9.5 4A3 3 0 0 0 6.5 7a3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3 2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM14.5 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3 2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
      globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
      users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.8 2.9-6 6.5-6s6.5 2.2 6.5 6"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.4c2.2.7 3.5 2.6 3.5 5.6"/>',
      userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
      chart: '<path d="M5 20V11M11 20V5M17 20v-6M22 20H2"/>',
      trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
      trendDown: '<path d="M22 17 13.5 8.5 8.5 13.5 2 7"/><path d="M16 17h6v-6"/>',
      flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7.2 15h9.6"/>',
      refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L3 9M3 4v5h5M4 13a8 8 0 0 0 14.5 4.5L21 15M21 20v-5h-5"/>',
      send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z"/>',
      doc: '<path d="M14 3H6.5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V7.5L14 3zM14 3v4.5h4.5M8.5 12.5h7M8.5 16.5h5"/>',
      heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
      crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z"/>',
      mountain: '<path d="M2 20l7-12 4 6 3-4 6 10z"/>',
      waves: '<path d="M2 8c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 14c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 20c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/>',
      radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6.4-6.4"/>',
      arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
      arrowUp: '<path d="M12 20V4M5 11l7-7 7 7"/>',
      arrowDown: '<path d="M12 4v16M5 13l7 7 7-7"/>',
      msg: '<path d="M4 5h16v11H9.5L4 20.5z"/>',
      chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
      bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
      sparkle: '<path d="M12 2l2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3z"/>',
      loop: '<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>',
      bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
      cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 2h3l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
      file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8M10 9H8"/>',
      newspaper: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/>',
      bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
      help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
      megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
      clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
      phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
      home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
      play: '<path d="M7 4v16l13-8z"/>',
      pause: '<path d="M7 4v16M17 4v16"/>',
      camera: '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>',
      video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3z"/>',
      mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
      image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
      lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      star: '<path d="m12 2.6 2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5-4.8-4.5 6.5-.8z"/>',
      link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
      upload: '<path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
      download: '<path d="M12 3v12M7 10l5 5 5-5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
      dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
      rupee: '<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a5 5 0 0 0 0-10"/>',
      percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
      rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
      trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
      bulb: '<path d="M9 18h6M10 22h4M15.1 14c.2-1 .7-1.7 1.4-2.5A5.9 5.9 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>',
      pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
      mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
      share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
      alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
      info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
      fire: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3.5 1.6 1.4 2.8 2.5 2.8z"/>',
      thumbsUp: '<path d="M7 10v12M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9z"/>',
      smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
      layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
      cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>',
      terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
      database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
      cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
      grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
      reel: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 8h18M8 3l3 5M14 3l3 5"/>',
      tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/>'
    };
    /** An icon at (x, y) top-left, size px; o: color, sw (stroke, icon units), fill (true = solid). */
    var icon = function (name, x, y, size, o) {
      o = o || {};
      var body = ICONS[name];
      if (!body) { warnings.push('icon("' + name + '") does not exist'); body = ICONS.sparkle; }
      size = size || 48;
      var col = fill(o.color, c.fg);
      var paint = o.fill ? ' fill="' + col + '" stroke="none"' : ' fill="none" stroke="' + col + '" stroke-width="' + fx(fill(o.sw, 2)) + '" stroke-linecap="round" stroke-linejoin="round"';
      return '<g transform="translate(' + fx(x) + " " + fx(y) + ") scale(" + fx3(size / 24) + ')"' + paint + common({ op: o.op }) + ">" + body + "</g>";
    };

    // ———— building blocks ————
    /** A rounded card; o: r, fill, stroke, sw, shadow ("sm" | "md" | "lg" | "glow" | null), op. */
    var card = function (x, y, w, h, o) {
      o = o || {};
      var surf = st ? st.surface : "soft";
      var r = fill(o.r, styleInfo.radius);
      if (surf === "pixel") return pixelBox(x, y, w, h, { fill: o.fill, stroke: o.stroke, sw: o.sw, shadow: o.shadow, op: o.op });
      if (surf === "paper") return cutout(x, y, w, h, { fill: fill(o.fill, c.surface), edge: "cut", rot: 0, seed: o.seed, shadow: o.shadow === undefined ? "sm" : o.shadow, op: o.op });
      if (surf === "clay") return clay(0, { op: o.op, shadow: o.shadow === null ? false : undefined }, rect(x, y, w, h, { r: r, fill: fill(o.fill, c.surface) }));
      if (surf === "sketch") {
        var hb = o.t == null ? undefined : o.t;
        return g({ op: o.op }, rect(x + 3 * K, y + 3 * K, w - 6 * K, h - 6 * K, { fill: fill(o.fill, c.surface) }),
          '<path d="' + smoothD(hand.rect(x, y, w, h, { seed: o.seed, boil: hb })) + '" fill="none" stroke="' + fill(o.stroke, c.fg) + '" stroke-width="' + fx(fill(o.sw, 4 * K)) + '" stroke-linecap="round" stroke-linejoin="round"/>',
          '<path d="' + smoothD(hand.rect(x + 2 * K, y + 1 * K, w - 3 * K, h - 2 * K, { seed: fill(o.seed, x * 0.019 + y * 0.041 + w * 0.003) + 50, boil: hb })) + '" fill="none" stroke="' + fill(o.stroke, c.fg) + '" stroke-opacity="0.45" stroke-width="' + fx(fill(o.sw, 4 * K) * 0.6) + '" stroke-linecap="round"/>');
      }
      if (surf === "glass") return rect(x, y, w, h, { r: r, fill: fill(o.fill, rgba(c.surface, 0.62)), stroke: fill(o.stroke, rgba(c.fg, 0.22)), sw: fill(o.sw, 1.5), shadow: o.shadow === undefined ? "md" : o.shadow, op: o.op });
      if (surf === "bold") return rect(x, y, w, h, { r: r, fill: fill(o.fill, c.surface), stroke: fill(o.stroke, c.ink), sw: fill(o.sw, 4 * K), shadow: o.shadow === undefined ? "hard" : o.shadow, op: o.op });
      if (surf === "flat") return rect(x, y, w, h, { r: r, fill: fill(o.fill, c.surface), stroke: fill(o.stroke, c.line), sw: fill(o.sw, 1.5), shadow: o.shadow === undefined ? null : o.shadow, op: o.op });
      return rect(x, y, w, h, { r: r, fill: fill(o.fill, c.surface), stroke: fill(o.stroke, c.line), sw: fill(o.sw, 2), shadow: o.shadow === undefined ? "lg" : o.shadow, op: o.op });
    };
    var chipSize = function (str, o) {
      o = o || {};
      var size = fill(o.size, 28);
      var pad = fill(o.pad, [size * 0.45, size * 0.85]);
      var iconW = o.icon ? size * 1.15 : 0;
      var dotW = o.dot ? size * 0.65 : 0;
      return { w: measure(str, { size: size, weight: fill(o.weight, st ? Math.max(600, faces.text.weight) : 650), family: fill(o.family, st ? faces.text.family : "Inter"), ls: o.ls, upper: o.upper }) + pad[1] * 2 + iconW + dotW, h: size + pad[0] * 2 };
    };
    /** A pill with text (optional icon or glowing dot); x, y = top-left (anchor "middle" centres it on x). */
    var chip = function (str, x, y, o) {
      o = o || {};
      var size = fill(o.size, 28);
      var pad = fill(o.pad, [size * 0.45, size * 0.85]);
      var sz = chipSize(str, o);
      var left = fill(o.anchor, "start") === "middle" ? x - sz.w / 2 : o.anchor === "end" ? x - sz.w : x;
      var col = fill(o.color, c.accent);
      var out = rect(left, y, sz.w, sz.h, { r: sz.h / 2, fill: fill(o.fill, rgba(col, light ? 0.14 : 0.10)), stroke: fill(o.stroke, o.fill ? null : col), sw: fill(o.sw, 2) });
      var cx = left + pad[1];
      if (o.dot) { out += circle(cx + size * 0.22, y + sz.h / 2, size * 0.22, { fill: col }); cx += size * 0.65; }
      if (o.icon) { out += icon(o.icon, cx, y + (sz.h - size) / 2, size, { color: col, sw: fill(o.iconSw, 2.2) }); cx += size * 1.15; }
      return out + text(str, { x: cx, y: y + pad[0] - size * 0.02, size: size, weight: fill(o.weight, st ? Math.max(600, faces.text.weight) : 650), family: fill(o.family, st ? faces.text.family : "Inter"), fill: col, ls: o.ls, upper: o.upper });
    };
    chip.size = chipSize;
    /** A track and a fill, p (0–1) of the way. */
    var meter = function (x, y, w, h, p, o) {
      o = o || {};
      var r = fill(o.r, h / 2);
      return rect(x, y, w, h, { r: r, fill: fill(o.bg, rgba(c.fg, 0.12)) }) + rect(x, y, Math.max(0, w * clamp(p)), h, { r: r, fill: fill(o.fill, c.accent), shadow: o.glow ? "glow" : null });
    };
    /** A rubber stamp slammed down at at: scale 2.4 → 1 with a jolt. */
    var stamp = function (t, at, str, x, y, o) {
      o = o || {};
      mark("stamp", at);
      if (t < at) return "";
      var size = fill(o.size, 120);
      var col = fill(o.color, c.red);
      var w = measure(str, { size: size, weight: 900, family: o.family, ls: 0.06 }) + size * 0.8;
      var h = size * 1.45;
      var s = lerp(2.4, 1, clamp(spring(t - at, 2.6, 9), 0, 1.2));
      var j = shake(t, at, fill(o.shakeAmp, 14), 0.35);
      return '<g opacity="' + fx3(fadeIn(t, at, 0.05)) + '" transform="' + tf({ x: j[0], y: j[1], s: s, r: fill(o.rot, -9), ox: x, oy: y }) + '">' + rect(x - w / 2, y - h / 2, w, h, { r: size * 0.22, fill: fill(o.bg, "rgba(13,13,17,0.35)"), stroke: col, sw: fill(o.border, size * 0.1) }) + text(str, { x: x, y: y - size * 0.52, size: size, weight: 900, family: o.family, fill: col, anchor: "middle", ls: 0.06 }) + "</g>";
    };
    /** A strike-through bar drawn from (x1,y1) to (x2,y2) over dur from at. */
    var strike = function (t, at, x1, y1, x2, y2, o) {
      o = o || {};
      mark("strike", at);
      var p = E.out3(seg(t, at, at + fill(o.dur, 0.14)));
      if (p <= 0) return "";
      return line(x1, y1, x2, y2, { p: p, stroke: fill(o.color, c.red), sw: fill(o.w, 26) });
    };
    /** Particles flying out of (x, y) from t0. o: n, r (reach), colors, size, dur, g (gravity px/s²). */
    var burst = function (t, t0, x, y, o) {
      o = o || {};
      mark("burst", t0);
      var dur = fill(o.dur, 0.8);
      var dt = t - t0;
      if (dt < 0 || dt > dur) return "";
      var n = fill(o.n, 14), r = fill(o.r, 220), size = fill(o.size, 14), gr = fill(o.g, 0);
      var cols = fill(o.colors, [c.accent, c.accent2, c.fg]);
      var out = "";
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 + hash(i + t0 * 13) * 0.6;
        var d = E.out3(dt / dur) * r * (0.6 + 0.6 * hash(i * 7 + 3));
        var px = x + Math.cos(a) * d;
        var py = y + Math.sin(a) * d + gr * dt * dt;
        var sz = size * (0.6 + hash(i * 3 + 1) * 0.8);
        var op = 1 - E.in2(dt / dur);
        var col = cols[i % cols.length];
        if (i % 2) out += circle(px, py, sz / 2, { fill: col, op: op });
        else out += rect(px - sz / 2, py - sz * 0.25, sz, sz * (i % 3 ? 1 : 0.45), { r: 3, fill: col, op: op, transform: "rotate(" + fx(a * 57 + dt * 400) + " " + fx(px) + " " + fx(py) + ")" });
      }
      return out;
    };
    /** Rays spinning round (cx, cy). o: n, r0, r1, w, color, op, spin (deg/s), p (0–1 grows them). */
    var rays = function (t, cx, cy, o) {
      o = o || {};
      var n = fill(o.n, 12), r0 = fill(o.r0, 140), r1 = fill(o.r1, 330), w = fill(o.w, 12), p = clamp(fill(o.p, 1));
      var out = "";
      for (var i = 0; i < n; i++) out += '<rect x="' + fx(-w / 2) + '" y="' + fx(-r1 * p) + '" width="' + fx(w) + '" height="' + fx(Math.max(0, (r1 - r0) * p)) + '" rx="' + fx(w / 2) + '" fill="' + fill(o.color, c.accent) + '" transform="translate(' + fx(cx) + " " + fx(cy) + ") rotate(" + fx(i * (360 / n) + t * fill(o.spin, 20)) + ')"/>';
      return '<g opacity="' + fx3(fill(o.op, 0.25)) + '">' + out + "</g>";
    };
    /** A white (or coloured) flash over the whole canvas answering a hit at at. */
    var flash = function (t, at, o) {
      o = o || {};
      mark("flash", at);
      var a = fill(o.a, 0.55) * bump(t, at, fill(o.up, 0.02), fill(o.down, 0.12));
      return a > 0.001 ? rect(0, 0, W, H, { fill: fill(o.color, "#fff"), op: a }) : "";
    };
    /** A soft glow drifting slowly round (x, y). */
    var glow = function (t, x, y, o) {
      o = o || {};
      var r = fill(o.r, 700);
      var gx = x + Math.sin(t * 0.5) * 40, gy = y + Math.cos(t * 0.4) * 40;
      var id = uid("gl");
      def('<radialGradient id="' + id + '"><stop offset="0" stop-color="' + fill(o.color, c.accent) + '" stop-opacity="' + fx3(fill(o.a, 0.22)) + '"/><stop offset="1" stop-color="' + fill(o.color, c.accent) + '" stop-opacity="0"/></radialGradient>');
      return circle(gx, gy, r, { fill: "url(#" + id + ")" });
    };
    /** A line grid over a box. o: step, color, sw. */
    var grid = function (x, y, w, h, o) {
      o = o || {};
      var step = fill(o.step, 72);
      var id = uid("pt");
      def('<pattern id="' + id + '" x="' + fx(x - 1) + '" y="' + fx(y - 1) + '" width="' + fx(step) + '" height="' + fx(step) + '" patternUnits="userSpaceOnUse"><path d="M0 0H' + fx(step) + "M0 0V" + fx(step) + '" stroke="' + fill(o.color, rgba(c.fg, light ? 0.06 : 0.045)) + '" stroke-width="' + fx(fill(o.sw, 3)) + '" fill="none"/></pattern>');
      return rect(x, y, w, h, { fill: "url(#" + id + ")" });
    };
    /** The region's background: a dark ground, a grid, a drifting glow. o: fill, grid (true), glow ([x, y] or false), glowColor. */
    var panel = function (t, o) {
      o = o || {};
      var b = o.box || region;
      var tex = st ? st.texture : "grid";
      var out = rect(b.x, b.y, b.w, b.h, { fill: fill(o.fill, c.bg), r: o.r });
      if (o.grid === true || (o.grid === undefined && tex === "grid")) out += grid(b.x, b.y, b.w, b.h, { color: o.gridColor });
      if (o.glow === true || Array.isArray(o.glow) || (o.glow === undefined && (tex === "grid" || tex === "glow"))) {
        var gp = Array.isArray(o.glow) ? o.glow : [b.x + b.w * 0.7, b.y + b.h * 0.35];
        out += clip(b.x, b.y, b.w, b.h, o.r || 0, glow(t, gp[0], gp[1], { r: Math.max(b.w, b.h) * 0.55, color: o.glowColor, a: fill(o.glowA, tex === "glow" ? 0.3 : light ? 0.14 : 0.22) }));
      }
      if (o.grain === true || (o.grain === undefined && tex === "grain")) out += grain(t, { box: b });
      if (o.texture !== false) {
        var art = artTexture(t, tex, b);
        if (art) out += o.r ? clip(b.x, b.y, b.w, b.h, o.r, art) : art;
      }
      return out;
    };
    /** Film grain over the canvas, a new pattern every frame. */
    var grain = function (t, o) {
      o = o || {};
      var id = uid("gn");
      def('<filter id="' + id + '" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="' + fx3(fill(o.freq, 0.9)) + '" numOctaves="2" seed="' + Math.floor(t * 30) + '" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>');
      var gb = o.box || region;
      return rect(gb.x, gb.y, gb.w, gb.h, { fill: "#808080", op: fill(o.op, 0.07), extra: 'filter="url(#' + id + ')" style="mix-blend-mode:overlay"' });
    };
    /** The arrow pointer with its tip at (x, y); press 0–1 squashes it, ripple 0–1 rings out. */
    var cursor = function (x, y, o) {
      o = o || {};
      var out = "";
      var rp = fill(o.ripple, -1);
      if (rp >= 0 && rp <= 1) out += circle(x, y, lerp(10, 90, E.out3(rp)), { stroke: "rgba(26,26,26," + fx3(0.45 * (1 - rp)) + ")", sw: 4 });
      var s = fill(o.scale, 2.2) * (1 - 0.12 * fill(o.press, 0));
      return out + '<g transform="translate(' + fx(x) + " " + fx(y) + ") scale(" + fx3(s) + ') translate(-5 -3)" filter="url(#mg-sm)"><path d="M5 3l17 9.5-7.4 1.8L11 21z" fill="#1a1a1a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></g>';
    };
    /** An arrow from (x1,y1) to (x2,y2) drawn p of the way, with a head once it arrives. */
    var arrow = function (x1, y1, x2, y2, o) {
      o = o || {};
      var p = clamp(fill(o.p, 1));
      var col = fill(o.color, c.fg), sw = fill(o.sw, 6);
      var xe = lerp(x1, x2, p), ye = lerp(y1, y2, p);
      var a = Math.atan2(y2 - y1, x2 - x1), hs = fill(o.head, sw * 3.2);
      var head = p > 0.15 ? '<path d="M' + fx(xe - Math.cos(a - 0.5) * hs) + " " + fx(ye - Math.sin(a - 0.5) * hs) + "L" + fx(xe) + " " + fx(ye) + "L" + fx(xe - Math.cos(a + 0.5) * hs) + " " + fx(ye - Math.sin(a + 0.5) * hs) + '" fill="none" stroke="' + col + '" stroke-width="' + fx(sw) + '" stroke-linecap="round" stroke-linejoin="round"/>' : "";
      return line(x1, y1, x2, y2, { p: p, stroke: col, sw: sw, dash: o.dash }) + head;
    };
    /** A ring progress (0–1) round (cx, cy). */
    var ring = function (cx, cy, r, p, o) {
      o = o || {};
      return circle(cx, cy, r, { stroke: fill(o.bg, rgba(c.fg, 0.12)), sw: fill(o.sw, 14) }) + '<circle cx="' + fx(cx) + '" cy="' + fx(cy) + '" r="' + fx(r) + '" fill="none" stroke="' + fill(o.color, c.accent) + '" stroke-width="' + fx(fill(o.sw, 14)) + '" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + fx3(1 - clamp(p)) + '" transform="rotate(-90 ' + fx(cx) + " " + fx(cy) + ')"/>';
    };
    /** A phone at (x, y), w px wide; inner is SVG laid out on a 390×844 screen. */
    var phone = function (x, y, w, inner, o) {
      o = o || {};
      var bez = w * 0.03;
      var k = (w - 2 * bez) / 390;
      var h = 844 * k + 2 * bez;
      var r = w * 0.15;
      var id = uid("ph");
      def('<clipPath id="' + id + '"><rect x="0" y="0" width="390" height="844" rx="' + fx((r - bez) / k) + '"/></clipPath>');
      return rect(x, y, w, h, { r: r, fill: "#121014", stroke: "#3b3640", sw: 3, shadow: "lg" }) + '<svg x="' + fx(x + bez) + '" y="' + fx(y + bez) + '" width="' + fx(w - 2 * bez) + '" height="' + fx(h - 2 * bez) + '" viewBox="0 0 390 844"><g clip-path="url(#' + id + ')"><rect width="390" height="844" fill="' + fill(o.screen, "#fff") + '"/>' + (inner || "") + '<rect x="134" y="11" width="122" height="35" rx="18" fill="#000"/></g></svg>';
    };
    phone.size = function (w) { var bez = w * 0.03; var k = (w - 2 * bez) / 390; return { w: w, h: 844 * k + 2 * bez, k: k, bez: bez }; };
    /** A picture from the project (an id this graphic was given) in a box; o: r, fit "cover" | "contain", op. */
    var image = function (id, x, y, w, h, o) {
      o = o || {};
      var src = env.media && env.media[id];
      if (!src) { warnings.push('image("' + id + '") is not among this graphic\'s media'); return rect(x, y, w, h, { r: o.r, fill: "rgba(246,241,231,0.08)" }); }
      var el = '<image href="' + src + '" x="' + fx(x) + '" y="' + fx(y) + '" width="' + fx(w) + '" height="' + fx(h) + '" preserveAspectRatio="xMidYMid ' + (fill(o.fit, "cover") === "cover" ? "slice" : "meet") + '"' + common({ op: o.op }) + "/>";
      return o.r ? clip(x, y, w, h, o.r, el) : el;
    };

    /** A soft gradient for legibility over footage: dark toward o.to ("bottom" | "top" | "left" | "right"). o: color, a. */
    var scrim = function (x, y, w, h, o) {
      o = o || {};
      var to = fill(o.to, "bottom");
      var angle = to === "top" ? 0 : to === "right" ? 90 : to === "left" ? 270 : 180;
      var col = fill(o.color, "#000000");
      return rect(x, y, w, h, { fill: gradient([[0, col, 0], [0.55, col, fill(o.a, 0.55) * 0.55], [1, col, fill(o.a, 0.55)]], { angle: angle }), op: o.op });
    };
    /** Children revealed by a wipe from t0 over dur: from "left" | "right" | "top" | "bottom" | "center". */
    var reveal = function (t2, t0, x, y, w, h, o) {
      o = o || {};
      mark("reveal", t0);
      var p = E.out3(seg(t2, t0, t0 + fill(o.dur, 0.5)));
      if (p <= 0) return "";
      var kids = join(Array.prototype.slice.call(arguments, 7));
      if (p >= 1) return kids;
      var from = fill(o.from, "left");
      var bx = x, by = y, bw = w, bh = h;
      if (from === "left") bw = w * p;
      else if (from === "right") { bw = w * p; bx = x + w - bw; }
      else if (from === "top") bh = h * p;
      else if (from === "bottom") { bh = h * p; by = y + h - bh; }
      else { bw = w * p; bx = x + (w - bw) / 2; }
      return clip(bx, by, bw, bh, 0, kids);
    };
    var buttonSize = function (label, o) {
      o = o || {};
      var size = fill(o.size, 44 * K);
      var tw = measure(label, withFace({ size: size, weight: fill(o.weight, st ? Math.max(700, faces.text.weight) : 800), family: o.family, ls: fill(o.ls, 0.02), upper: o.upper }, "text"));
      var iw = o.icon ? size * 1.25 : 0;
      return { w: tw + iw + size * 1.6, h: size * 2 };
    };
    /**
     * A pill button, pressed at o.pressAt (squash, darken, ripple) — label switches to o.done after.
     * o: size, fill (accent), color (auto contrast), icon, pressAt, done, doneFill, doneIcon, anchor "start" | "middle" | "end", shadow.
     */
    var button = function (t2, label, x, y, o) {
      o = o || {};
      if (o.pressAt != null) mark("press", o.pressAt);
      var pressed = o.pressAt != null && t2 >= o.pressAt;
      var lab = pressed && o.done ? o.done : label;
      var ic = pressed && o.done ? fill(o.doneIcon, "check") : o.icon;
      var sz = buttonSize(lab, { size: o.size, weight: o.weight, family: o.family, ls: o.ls, upper: o.upper, icon: ic });
      var size = fill(o.size, 44 * K);
      var left = fill(o.anchor, "start") === "middle" ? x - sz.w / 2 : o.anchor === "end" ? x - sz.w : x;
      var bgc = pressed && o.done ? fill(o.doneFill, c.surface) : fill(o.fill, c.accent);
      var fgc = fill(o.color, onColor(bgc));
      var press = o.pressAt != null ? bump(t2, o.pressAt, 0.06, 0.22) : 0;
      var s2 = 1 - 0.07 * press;
      var cx = left + sz.w / 2, cy = y + sz.h / 2;
      var out = rect(left, y, sz.w, sz.h, { r: sz.h / 2, fill: bgc, stroke: st && st.surface === "bold" ? c.ink : null, sw: 4 * K, shadow: fill(o.shadow, st && st.surface === "bold" ? "hard" : st && st.surface === "flat" ? null : "md") });
      if (press > 0) out += rect(left, y, sz.w, sz.h, { r: sz.h / 2, fill: "#000", op: 0.12 * press });
      var tx = left + size * 0.8;
      if (ic) { out += icon(ic, tx, cy - size * 0.5, size, { color: fgc, sw: 2.4 }); tx += size * 1.25; }
      out += text(lab, withFace({ x: tx, y: cy - size * 0.52, size: size, weight: fill(o.weight, st ? Math.max(700, faces.text.weight) : 800), family: o.family, fill: fgc, ls: fill(o.ls, 0.02), upper: o.upper }, "text"));
      var rp = o.pressAt != null ? seg(t2, o.pressAt, o.pressAt + 0.6) : 0;
      var ring2 = rp > 0 && rp < 1 ? rect(left - 30 * rp * K, y - 30 * rp * K, sz.w + 60 * rp * K, sz.h + 60 * rp * K, { r: sz.h / 2 + 30 * rp * K, stroke: bgc, sw: 6 * K * (1 - rp), op: 1 - rp }) : "";
      return ring2 + '<g transform="' + tf({ s: s2, ox: cx, oy: cy }) + '">' + out + "</g>";
    };
    button.size = buttonSize;
    /** A brush-like underline drawn on under a word from at: x, y (the line's left and height), w. o: color, sw, dur, wobble. */
    var underline = function (t2, at, x, y, w, o) {
      o = o || {};
      mark("underline", at);
      var p = E.out3(seg(t2, at, at + fill(o.dur, 0.4)));
      if (p <= 0) return "";
      var wob = fill(o.wobble, 10 * K);
      var d = "M" + fx(x) + " " + fx(y + wob * 0.3) + " C" + fx(x + w * 0.3) + " " + fx(y - wob) + " " + fx(x + w * 0.65) + " " + fx(y + wob) + " " + fx(x + w) + " " + fx(y - wob * 0.2);
      return path(d, { stroke: fill(o.color, c.accent2), sw: fill(o.sw, 12 * K), draw: p, cap: "round" });
    };
    /**
     * Bars growing from a baseline, one after another from at. values: numbers; o: max, gap (0–1), stagger, colors,
     * highlight (index in the accent, the rest muted), r, labels (under each, mono), valueLabels (true = numbers on top), fmt.
     */
    var bars = function (t2, at, x, y, w, h, values, o) {
      o = o || {};
      var n = values.length || 1;
      var max = fill(o.max, Math.max.apply(null, values.concat([1e-9])));
      var gap = fill(o.gap, 0.28);
      var bw = w / (n + (n - 1) * gap);
      var out = "";
      for (var i = 0; i < n; i++) {
        var a = at + i * fill(o.stagger, 0.09);
        mark("bar", a);
        var p = clamp(spring(t2 - a, mot[0], mot[1] + 1), 0, 1.06);
        var bh = (values[i] / max) * h * p;
        var bx = x + i * bw * (1 + gap);
        var col = o.colors ? o.colors[i % o.colors.length] : o.highlight == null || o.highlight === i ? c.accent : rgba(c.fg, 0.28);
        out += rect(bx, y + h - bh, bw, bh, { r: fill(o.r, Math.min(bw / 2, 14 * K)), fill: col });
        if (o.valueLabels && p > 0.05) out += text(o.fmt ? o.fmt(values[i] * Math.min(1, p)) : String(Math.round(values[i] * Math.min(1, p))), withFace({ x: bx + bw / 2, y: y + h - bh - 54 * K, size: 40 * K, anchor: "middle", fill: c.fg, op: fadeIn(t2, a, 0.2) }, "mono"));
        if (o.labels && o.labels[i] != null) out += text(String(o.labels[i]), withFace({ x: bx + bw / 2, y: y + h + 16 * K, size: 28 * K, anchor: "middle", fill: c.mute, ls: 0.08 }, "mono"));
      }
      return out;
    };
    // ———— explainer art styles: hand-drawn, pixel, paper, clay, storybook ————
    /** Time held on whole frames (stop motion, pixel art, boiling lines): step(t, 12) moves on twelves. */
    var step = function (t2, fps) { fps = fps || 12; return Math.floor(t2 * fps + 1e-6) / fps; };
    /** A held-frame wobble [dx, dy, rot°] that re-rolls fps times a second (stop-motion jitter). */
    var jitter = function (t2, amp, fps, seed) {
      amp = fill(amp, 2 * K);
      var n = Math.floor(t2 * fill(fps, 12) + 1e-6) * 13 + fill(seed, 0) * 101;
      return [(hash(n + 0.31) - 0.5) * 2 * amp, (hash(n + 0.73) - 0.5) * 2 * amp, (hash(n + 0.17) - 0.5) * 2];
    };
    var dist = function (a, b) { var dx = b[0] - a[0], dy = b[1] - a[1]; return Math.sqrt(dx * dx + dy * dy); };
    var plen = function (pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; };
    /** The first d px of a polyline. */
    var cutPts = function (pts, d) {
      if (!pts.length || d <= 0) return pts.slice(0, 1);
      var out = [pts[0]], acc = 0;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], s = dist(a, b);
        if (acc + s >= d) { var f = s ? (d - acc) / s : 0; out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); return out; }
        acc += s;
        out.push(b);
      }
      return out;
    };
    /** A polyline as a smooth path (quadratic curves through the midpoints). */
    var smoothD = function (pts, close) {
      if (!pts.length) return "";
      var P = function (p) { return fx(p[0]) + " " + fx(p[1]); };
      if (pts.length < 3) return "M" + pts.map(P).join("L") + (close ? "Z" : "");
      var d = "M" + P(pts[0]);
      for (var i = 1; i < pts.length - 1; i++) d += "Q" + P(pts[i]) + " " + fx((pts[i][0] + pts[i + 1][0]) / 2) + " " + fx((pts[i][1] + pts[i + 1][1]) / 2);
      return d + "L" + P(pts[pts.length - 1]) + (close ? "Z" : "");
    };
    var hexRgb = function (hex) {
      var h = String(hex).replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h.slice(0, 6), 16);
      return isFinite(n) && /^[0-9a-fA-F]{6}/.test(h) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : null;
    };
    /** Two hex colours mixed p of the way (a non-hex colour comes back as it is). */
    var mix = function (a, b, p) {
      var x = hexRgb(a), y = hexRgb(b);
      if (!x || !y) return a;
      var h2 = function (v) { var s = Math.round(v).toString(16); return s.length < 2 ? "0" + s : s; };
      return "#" + h2(lerp(x[0], y[0], p)) + h2(lerp(x[1], y[1], p)) + h2(lerp(x[2], y[2], p));
    };

    // Hand-drawn shapes as points: a smooth, slow wobble (two sines with seeded phases), re-rolled 8× a second when boil: t is passed.
    var handSeed = function (o, base) { var s = fill(o.seed, base); if (o.boil != null) s += Math.floor(o.boil * fill(o.fps, 8) + 1e-6) * 17.31; return s; };
    var wobFn = function (seed) {
      var f1 = 0.7 + hash(seed + 0.11) * 1.3, f2 = 2.2 + hash(seed + 0.57) * 2.5, p1 = hash(seed + 0.91), p2 = hash(seed + 0.33);
      return function (u) { return 0.62 * Math.sin(2 * Math.PI * (u * f1 + p1)) + 0.38 * Math.sin(2 * Math.PI * (u * f2 + p2)); };
    };
    var hand = {
      /** A wobbly line that overshoots its ends a little. o: rough (px), seed, boil (t). */
      line: function (x1, y1, x2, y2, o) {
        o = o || {};
        var seed = handSeed(o, x1 * 0.013 + y1 * 0.029 + x2 * 0.007 + y2 * 0.017);
        var len = Math.max(1, Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)));
        var rough = fill(o.rough, 2.6 * K) * Math.min(2, 0.6 + len / (600 * K));
        var nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
        var bow = (hash(seed + 0.5) - 0.5) * 2 * rough * 1.4, w = wobFn(seed), e = Math.min(10 * K, len * 0.03) / len;
        var n = Math.max(6, Math.ceil(len / (14 * K))), pts = [];
        for (var i = 0; i <= n; i++) {
          var u = lerp(-e, 1 + e, i / n), off = bow * Math.sin(Math.PI * clamp(u)) + w(u) * rough * 0.5;
          pts.push([x1 + (x2 - x1) * u + nx * off, y1 + (y2 - y1) * u + ny * off]);
        }
        return pts;
      },
      /** A curve from (x1,y1) to (x2,y2) bent sideways by bend × its length. */
      curve: function (x1, y1, x2, y2, o) {
        o = o || {};
        var seed = handSeed(o, x1 * 0.017 + y1 * 0.023 + x2 * 0.011 + y2 * 0.031);
        var len = Math.max(1, Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)));
        var nx = -(y2 - y1) / len, ny = (x2 - x1) / len, bend = fill(o.bend, 0.2) * len;
        var qx = (x1 + x2) / 2 + nx * bend, qy = (y1 + y2) / 2 + ny * bend;
        var rough = fill(o.rough, 2.6 * K), w = wobFn(seed), n = Math.max(8, Math.ceil(len / (14 * K))), pts = [];
        for (var i = 0; i <= n; i++) {
          var u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), cc = u * u, off = w(u) * rough * 0.6;
          pts.push([a * x1 + b * qx + cc * x2 + nx * off, a * y1 + b * qy + cc * y2 + ny * off]);
        }
        return pts;
      },
      /** A rectangle in one stroke, corners overshooting. */
      rect: function (x, y, w, h, o) {
        o = o || {};
        var seed = handSeed(o, x * 0.019 + y * 0.041 + w * 0.003);
        var q = function (s) { var o2 = copy(o); o2.seed = seed + s; o2.boil = undefined; return o2; };
        return hand.line(x, y, x + w, y, q(1)).concat(hand.line(x + w, y, x + w, y + h, q(2)), hand.line(x + w, y + h, x, y + h, q(3)), hand.line(x, y + h, x, y, q(4)));
      },
      /** An ellipse drawn the way a hand draws a circle: a little more than one turn, not quite closing on itself. */
      circle: function (cx, cy, rx, ry, o) {
        o = o || {};
        if (ry == null) ry = rx;
        var seed = handSeed(o, cx * 0.021 + cy * 0.013 + rx * 0.007);
        var turns = fill(o.turns, 1.1), a0 = -Math.PI * 0.62 + (hash(seed) - 0.5) * 0.7, w = wobFn(seed);
        var rough = fill(o.rough, 2.6 * K) / Math.max(rx, ry, 1);
        var n = Math.max(28, Math.ceil((Math.PI * (rx + ry) * turns) / (14 * K))), pts = [];
        for (var i = 0; i <= n; i++) {
          var u = i / n, a = a0 + u * turns * Math.PI * 2, r = 1 + w(u * turns) * rough * 2.2 + (u - 0.5) * 0.07;
          pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
        }
        return pts;
      },
      /** A bent arrow: [shaft, head] strokes. o: bend (0.12), head (px), rough. */
      arrow: function (x1, y1, x2, y2, o) {
        o = o || {};
        var shaft = hand.curve(x1, y1, x2, y2, { bend: fill(o.bend, 0.12), rough: o.rough, seed: o.seed, boil: o.boil, fps: o.fps });
        var end = shaft[shaft.length - 1], prev = shaft[Math.max(0, shaft.length - 3)];
        var a = Math.atan2(end[1] - prev[1], end[0] - prev[0]), hs = fill(o.head, 34 * K);
        var tip = function (s) { return [end[0] - Math.cos(a + s * 0.5) * hs, end[1] - Math.sin(a + s * 0.5) * hs]; };
        return [shaft, [tip(-1), end, tip(1)]];
      },
      /** Zig-zag hatching across a box (45°), for shading and quick fills. o: gap. */
      hatch: function (x, y, w, h, o) {
        o = o || {};
        var gap = fill(o.gap, 18 * K), seed = handSeed(o, x * 0.03 + y * 0.05), pts = [], k2 = 0;
        for (var c0 = x + y + gap * 0.5; c0 < x + w + y + h; c0 += gap) {
          var ax = Math.max(x, c0 - (y + h)), bx = Math.min(x + w, c0 - y);
          var A = [ax, c0 - ax], B = [bx, c0 - bx], j = (hash(seed + k2) - 0.5) * gap * 0.3;
          if (k2 % 2) { var tmp = A; A = B; B = tmp; }
          pts.push([A[0] + j, A[1]]);
          pts.push([B[0], B[1] - j]);
          k2++;
        }
        return pts;
      },
      /** A tick in one stroke (x, y = the top-left of a size × size box). */
      check: function (x, y, size, o) {
        o = o || {};
        var j = function (n) { return (hash(handSeed(o, x * 0.01 + y * 0.02) + n) - 0.5) * size * 0.06; };
        return [[x + j(1), y + size * 0.55 + j(2)], [x + size * 0.36 + j(3), y + size * 0.92], [x + size * 0.62, y + size * 0.48], [x + size + j(4), y + j(5)]];
      },
      /** A cross: two strokes. */
      cross: function (cx, cy, size, o) {
        o = o || {};
        var r = size / 2, o1 = copy(o), o2 = copy(o);
        o1.seed = handSeed(o, cx * 0.01) + 1;
        o2.seed = handSeed(o, cx * 0.01) + 2;
        o1.boil = o2.boil = undefined;
        return [hand.line(cx - r, cy - r, cx + r, cy + r, o1), hand.line(cx + r, cy - r, cx - r, cy + r, o2)];
      }
    };

    // One hand holds one pen: every ink / write leaves a placeholder, and _post keeps only the pen of the
    // newest stroke still drawing (or, when nothing draws, the one lifting away last) — in place, so its group's transform holds.
    var pens = [];
    var penMark = function (start, active, end, markup) {
      pens.push({ id: pens.length, start: start, active: active, end: end, markup: markup });
      return "<!--mgpen" + (pens.length - 1) + "-->";
    };
    var postFrame = function (svg) {
      if (!pens.length) return svg;
      var best = null;
      for (var i = 0; i < pens.length; i++) {
        var p = pens[i];
        if (!best) best = p;
        else if (p.active && (!best.active || p.start >= best.start)) best = p;
        else if (!p.active && !best.active && p.end >= best.end) best = p;
      }
      return String(svg).replace(/<!--mgpen(\d+)-->/g, function (m, id) { return best && String(best.id) === id ? best.markup : ""; });
    };
    /** A marker or pencil held by an unseen right hand, tip at (x, y). */
    var penAt = function (x, y, kind, col, sc, op) {
      var body;
      if (kind === "pencil") {
        body = '<path d="M0 0L-9 27L9 27Z" fill="#E9C9A0"/><path d="M0 0L-3.2 9.6L3.2 9.6Z" fill="#2B2B30"/><rect x="-9" y="27" width="18" height="150" fill="#F2C14E"/><rect x="-3" y="27" width="6" height="150" fill="#E0A82E"/><rect x="-9" y="177" width="18" height="14" fill="#B9B9B9"/><rect x="-9" y="190" width="18" height="17" rx="5" fill="#F29C9C"/>';
      } else {
        body = '<path d="M-4 0L4 0L9 16L-9 16Z" fill="' + col + '"/><rect x="-11" y="16" width="22" height="14" rx="2" fill="#3A3A40"/><rect x="-15" y="30" width="30" height="158" rx="7" fill="#F4F4F2" stroke="#D2D2CE" stroke-width="2"/><rect x="-15" y="66" width="30" height="24" fill="' + col + '"/><rect x="-15" y="178" width="30" height="34" rx="9" fill="' + col + '"/>';
      }
      return '<g transform="translate(' + fx(x) + " " + fx(y) + ") rotate(-32) scale(" + fx3(sc) + ')" opacity="' + fx3(clamp(op)) + '" filter="url(#mg-sm)">' + body + "</g>";
    };
    /**
     * Draws hand-drawn points (from $.hand.*: one stroke, or a list of strokes drawn one after another) on from at,
     * the pen leading. o: color, sw, dur | speed (px/s), pen ("marker" | "pencil"), fill (closed shape, fills once drawn), op.
     */
    var ink = function (t2, at, shape, o) {
      o = o || {};
      var strokes = shape && shape.length && Array.isArray(shape[0]) && Array.isArray(shape[0][0]) ? shape : [shape || []];
      var lens = strokes.map(plen), L = 0;
      for (var i = 0; i < lens.length; i++) L += lens[i];
      L = L || 1;
      var dur = fill(o.dur, clamp(L / fill(o.speed, 1500 * K), 0.25, 2.4));
      if (at != null) mark("ink", at, dur, o.pen === "pencil" ? 1 : 0);
      var p = at == null ? 1 : E.inOut2(seg(t2, at, at + dur));
      if (p <= 0) return "";
      var col = fill(o.color, c.fg), sw = fill(o.sw, 6 * K), D = p * L, acc = 0, tip = null, out = "";
      if (o.fill && p >= 1) out += '<path d="' + smoothD(strokes[0], true) + '" fill="' + o.fill + '" opacity="' + fx3((at == null ? 1 : fadeIn(t2, at + dur, 0.3)) * fill(o.fillOp, 1)) + '"/>';
      for (var j = 0; j < strokes.length; j++) {
        if (acc >= D || strokes[j].length < 2) { acc += lens[j]; continue; }
        var part = D - acc >= lens[j] ? strokes[j] : cutPts(strokes[j], D - acc);
        out += '<path d="' + smoothD(part) + '" fill="none" stroke="' + col + '" stroke-width="' + fx(sw) + '" stroke-linecap="round" stroke-linejoin="round"/>';
        tip = part[part.length - 1];
        acc += lens[j];
      }
      if (o.pen && tip && at != null) {
        var lift = seg(t2, at + dur, at + dur + 0.3);
        if (lift < 1) out += penMark(at, p < 1, at + dur, penAt(tip[0] + lift * 70 * K, tip[1] + lift * 110 * K, o.pen, col, fill(o.penSize, 1.5) * K, 1 - lift));
      }
      return "<g" + common({ op: o.op, transform: o.transform }) + ">" + out + "</g>";
    };
    /** Handwriting: text written on from at, line by line at cps characters a second, the pen at the nib. o: text options + cps, gap, pen. */
    var write = function (t2, at, str, o) {
      o = withFace(o, "text");
      var size = fill(o.size, 64), lh = fill(o.lh, 1.15), cps = fill(o.cps, 16), x = fill(o.x, 0), y = fill(o.y, 0), anchor = fill(o.anchor, "start");
      var s = String(str == null ? "" : str);
      if (o.upper) s = s.toUpperCase();
      var lines = o.maxW ? wrap(s, o.maxW, o) : s.split("\n");
      var writing = lines.reduce(function (a, ln) { return a + Math.max(0.15, ln.length / cps) + fill(o.gap, 0.12); }, 0) - fill(o.gap, 0.12);
      mark("write", at, writing, o.pen === "pencil" ? 1 : 0);
      var out = "", t0 = at, tip = null, last = null, endAt = at;
      for (var i = 0; i < lines.length; i++) {
        var ln = lines[i], lw = measure(ln, o), ldur = Math.max(0.15, ln.length / cps);
        var p = seg(t2, t0, t0 + ldur);
        var left = anchor === "middle" ? x - lw / 2 : anchor === "end" ? x - lw : x, top = y + i * size * lh;
        if (p > 0) {
          var o2 = copy(o);
          o2.y = top;
          o2.maxW = 0;
          o2.op = null;
          o2.transform = null;
          var tx = text(ln, o2);
          out += p >= 1 ? tx : clip(left - size * 0.3, top - size * 0.4, size * 0.3 + lw * p, size * 1.8, 0, tx);
          if (p < 1) tip = [left + lw * p, top + size * (0.62 + 0.14 * Math.sin(t2 * 38))];
        }
        last = [left + lw, top + size * 0.62];
        t0 += ldur + fill(o.gap, 0.12);
        endAt = t0;
      }
      if (o.pen !== false && o.pen != null) {
        var lift = seg(t2, endAt, endAt + 0.3);
        var at2 = tip || (t2 >= endAt && lift < 1 ? [last[0] + lift * 70 * K, last[1] + lift * 110 * K] : null);
        if (at2 && t2 >= at) out += penMark(at, !!tip, endAt, penAt(at2[0], at2[1], o.pen === true ? "marker" : o.pen, fill(o.fill, c.fg), fill(o.penSize, 1.5) * K, tip ? 1 : 1 - lift));
      }
      return "<g" + common({ op: o.op, transform: o.transform }) + ">" + out + "</g>";
    };
    /** Line boil: children redrawn with a fresh wobble fps (8) times a second. o: amp (px), freq, fps. */
    var boil = function (t2, o) {
      o = o || {};
      var kids = join(Array.prototype.slice.call(arguments, 2));
      var id = uid("bl");
      def('<filter id="' + id + '" filterUnits="userSpaceOnUse" x="0" y="0" width="' + fx(W) + '" height="' + fx(H) + '"><feTurbulence type="fractalNoise" baseFrequency="' + fx3(fill(o.freq, 0.022) / K) + '" numOctaves="2" seed="' + ((Math.floor(t2 * fill(o.fps, 8) + 1e-6) % 97) + 1) + '"/><feDisplacementMap in="SourceGraphic" scale="' + fx(fill(o.amp, 6 * K)) + '" xChannelSelector="R" yChannelSelector="G"/></filter>');
      return '<g filter="url(#' + id + ')">' + kids + "</g>";
    };

    // ———— pixel art ————
    var SPRITES = {
      heart: ["..kk.kk..", ".klakaak.", "kaaaaaaak", "kaaaaaaak", ".kaaaaak.", "..kaaak..", "...kak...", "....k...."],
      coin: ["..kkkk..", ".kyyyyk.", "kylyyyok", "kylyyyok", "kyyyyyok", "kyyyyyok", ".kooook.", "..kkkk.."],
      star: [".....k.....", "....kyk....", "....kyk....", "kkkkyyykkkk", "kyyyylyyyyk", ".kyyyyyyyk.", "..kyyyyyk..", "..kyykyyk..", ".kyyk.kyyk.", ".kkk...kkk."],
      bolt: ["...kkkk", "..kyyk.", ".kyyk..", "kyyykkk", "kkyyyyk", "..kyyk.", ".kyyk..", ".kyk...", "kyk....", "kk....."],
      gem: ["..kkkkk..", ".klbbbbk.", "klbbbbbbk", "kBBBBBBBk", ".kbbbbbk.", "..kbbbk..", "...kbk...", "....k...."],
      check: ["......kk", ".....kgk", "k...kgk.", "kk.kgk..", "kgkgk...", ".kgk....", "..k....."],
      cross: ["kk...kk", "krk.krk", ".krkrk.", "..krk..", ".krkrk.", "krk.krk", "kk...kk"],
      arrow: ["....kk...", "....kwk..", "kkkkkwwk.", "kwwwwwwwk", "kkkkkwwk.", "....kwk..", "....kk..."],
      key: [".kkk......", "kyyyk.....", "kykykkkkkk", "kyyyyyyyyk", ".kkkkkykyk", "......k.k."],
      flag: ["kkkkkk..", "kaaaaak.", "kaaaaaak", "kaaaaak.", "kkkkkk..", "k.......", "k.......", "k......."]
    };
    /** A pixel sprite: rows of characters (or a built-in name), one cell px per character. Colours: k ink, w white, a/A accent (dark), b/B accent2 (dark), g green, r red, y yellow, o orange, s silver, f fg, p paper, l light, d shade; . is clear. o: colors {char: colour}, op, transform. */
    var sprite = function (rows, x, y, cell, o) {
      o = o || {};
      if (typeof rows === "string") { var nm = rows; rows = SPRITES[nm]; if (!rows) { warnings.push('sprite("' + nm + '") does not exist'); rows = SPRITES.star; } }
      cell = cell || 8 * K;
      var pal = { k: c.ink, w: "#FFFFFF", a: c.accent, A: mix(c.accent, "#000000", 0.32), b: c.accent2, B: mix(c.accent2, "#000000", 0.32), g: c.green, r: c.red, y: "#FFD23F", o: "#F2961B", s: "#A7ADB5", f: c.fg, p: c.paper, l: "rgba(255,255,255,0.75)", d: "rgba(0,0,0,0.28)" };
      if (o.colors) for (var key in o.colors) if (Object.prototype.hasOwnProperty.call(o.colors, key)) pal[key] = o.colors[key];
      var out = "";
      for (var r = 0; r < rows.length; r++) {
        var row = String(rows[r]), i = 0;
        while (i < row.length) {
          var ch = row.charAt(i), j = i;
          while (j + 1 < row.length && row.charAt(j + 1) === ch) j++;
          if (ch !== "." && ch !== " " && pal[ch]) out += '<rect x="' + fx(x + i * cell) + '" y="' + fx(y + r * cell) + '" width="' + fx((j - i + 1) * cell + 0.5) + '" height="' + fx(cell + 0.5) + '" fill="' + pal[ch] + '"/>';
          i = j + 1;
        }
      }
      return '<g shape-rendering="crispEdges"' + common(o) + ">" + out + "</g>";
    };
    /** {w, h} of a sprite at a cell size. */
    sprite.size = function (rows, cell) {
      rows = typeof rows === "string" ? SPRITES[rows] || [] : rows || [];
      var w = 0;
      for (var i = 0; i < rows.length; i++) w = Math.max(w, String(rows[i]).length);
      return { w: w * (cell || 8 * K), h: rows.length * (cell || 8 * K) };
    };
    /** A box with stepped (two-pixel) corners, s px per step. */
    var stepPath = function (x, y, w, h, s) {
      var X = function (v) { return fx(v); };
      return "M" + X(x + 2 * s) + " " + X(y) + "H" + X(x + w - 2 * s) + "V" + X(y + s) + "H" + X(x + w - s) + "V" + X(y + 2 * s) + "H" + X(x + w) + "V" + X(y + h - 2 * s) + "H" + X(x + w - s) + "V" + X(y + h - s) + "H" + X(x + w - 2 * s) + "V" + X(y + h) + "H" + X(x + 2 * s) + "V" + X(y + h - s) + "H" + X(x + s) + "V" + X(y + h - 2 * s) + "H" + X(x) + "V" + X(y + 2 * s) + "H" + X(x + s) + "V" + X(y + s) + "H" + X(x + 2 * s) + "Z";
    };
    /** A pixel-art panel: stepped corners, a chunky border, a hard pixel shadow. o: cell, sw, fill, stroke, shadow (null = none), op, transform. */
    var pixelBox = function (x, y, w, h, o) {
      o = o || {};
      var s = fill(o.cell, 6 * K), bw = fill(o.sw, s), out = "";
      if (o.shadow !== null && o.shadow !== false) out += '<path d="' + stepPath(x + s * 1.5, y + s * 1.5, w, h, s) + '" fill="rgba(0,0,0,0.5)"/>';
      out += '<path d="' + stepPath(x, y, w, h, s) + '" fill="' + fill(o.stroke, c.fg) + '"/>';
      out += '<path d="' + stepPath(x + bw, y + bw, w - 2 * bw, h - 2 * bw, s) + '" fill="' + fill(o.fill, c.surface) + '"/>';
      out += rect(x + bw + 2 * s, y + bw + s * 0.5, Math.max(0, w - 2 * bw - 4 * s), s * 0.7, { fill: "rgba(255,255,255,0.14)" });
      return '<g shape-rendering="crispEdges"' + common({ op: o.op, transform: o.transform }) + ">" + out + "</g>";
    };

    // ———— paper ————
    /** Points along one edge of a paper piece, a toward b (b left off), pushed inward by the cut. */
    var tornEdge = function (pts, ax, ay, bx, by, kind, amp, seed) {
      var dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / len, ny = dx / len;
      var stepL = kind === "torn" ? 9 * K : kind === "wavy" ? 14 * K : kind === "cut" ? Math.max(len / 3, 30 * K) : len;
      var n = Math.max(1, Math.round(len / stepL));
      for (var i = 0; i < n; i++) {
        var u = i / n, off = 0;
        if (kind === "torn") off = hash(seed + i * 1.37) * amp + (hash(seed * 3.1 + i * 0.71) < 0.15 ? amp * 0.6 : 0);
        else if (kind === "wavy") off = (Math.sin(u * Math.PI * 2 * Math.max(1, Math.round(len / (160 * K))) + seed) * 0.5 + 0.5) * amp;
        else if (kind === "cut") off = hash(seed + i * 2.3) * amp * 0.5;
        pts.push([ax + dx * u + nx * off, ay + dy * u + ny * off]);
      }
    };
    /** The outline of a paper piece: edge "torn" | "cut" (scissors) | "wavy" | "straight". */
    var paperPoly = function (x, y, w, h, o) {
      o = o || {};
      var kind = fill(o.edge, "torn"), amp = fill(o.amp, kind === "torn" ? 7 * K : 4 * K), seed = fill(o.seed, x * 0.131 + y * 0.077 + w * 0.011), pts = [];
      if (o.shape === "circle") {
        // A round piece: the same cuts along an ellipse, pushed toward the centre.
        var rx = w / 2, ry = h / 2, per = Math.PI * (rx + ry);
        var n = Math.max(24, Math.round(per / (kind === "torn" ? 9 * K : kind === "wavy" ? 14 * K : kind === "cut" ? 40 * K : 6 * K)));
        for (var i = 0; i < n; i++) {
          var a = (i / n) * Math.PI * 2, off = 0;
          if (kind === "torn") off = hash(seed + i * 1.37) * amp + (hash(seed * 3.1 + i * 0.71) < 0.15 ? amp * 0.6 : 0);
          else if (kind === "wavy") off = (Math.sin(a * Math.max(3, Math.round(per / (160 * K))) + seed) * 0.5 + 0.5) * amp;
          else if (kind === "cut") off = hash(seed + i * 2.3) * amp * 0.5;
          pts.push([x + rx + Math.cos(a) * (rx - off), y + ry + Math.sin(a) * (ry - off)]);
        }
        return "M" + pts.map(function (p) { return fx(p[0]) + " " + fx(p[1]); }).join("L") + "Z";
      }
      tornEdge(pts, x, y, x + w, y, kind, amp, seed + 1);
      tornEdge(pts, x + w, y, x + w, y + h, kind, amp, seed + 2);
      tornEdge(pts, x + w, y + h, x, y + h, kind, amp, seed + 3);
      tornEdge(pts, x, y + h, x, y, kind, amp, seed + 4);
      return "M" + pts.map(function (p) { return fx(p[0]) + " " + fx(p[1]); }).join("L") + "Z";
    };
    /** A strip of tape centred on (cx, cy), w long, with torn ends. o: h, rot (deg), color, op. */
    var tape = function (cx, cy, w, o) {
      o = o || {};
      var h = fill(o.h, 46 * K), rot = fill(o.rot, -4), teeth = 4, th = h / teeth, zz = 5 * K, pts = [];
      var x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2;
      pts.push([x0, y0], [x1, y0]);
      for (var i = 0; i < teeth; i++) pts.push([x1 - zz, y0 + (i + 0.5) * th], [x1, y0 + (i + 1) * th]);
      pts.push([x0, y0 + h]);
      for (var j = teeth - 1; j >= 0; j--) pts.push([x0 + zz, y0 + (j + 0.5) * th], [x0, y0 + j * th]);
      return '<path d="M' + pts.map(function (p) { return fx(p[0]) + " " + fx(p[1]); }).join("L") + 'Z" fill="' + fill(o.color, "rgba(246,238,206,0.8)") + '" stroke="rgba(0,0,0,0.07)" stroke-width="1" transform="rotate(' + fx(rot) + " " + fx(cx) + " " + fx(cy) + ')"' + common({ op: o.op }) + "/>";
    };
    /**
     * A cut-paper piece with children on it: torn or scissor edges, an optional white margin, a soft shadow,
     * a small seeded tilt, tape. o: fill, edge, shape ("rect" | "circle"), border (px of white margin), rot (deg; 0 = straight), tape (true | "corners"), shadow ("sm" | false), seed, op.
     */
    var cutout = function (x, y, w, h, o) {
      o = o || {};
      var kids = join(Array.prototype.slice.call(arguments, 5));
      var seed = fill(o.seed, x * 0.131 + y * 0.077 + w * 0.011), rot = fill(o.rot, (hash(seed) - 0.5) * 6), border = fill(o.border, 0);
      var shadow = o.shadow === false || o.shadow === null ? "" : ' filter="url(#mg-' + fill(o.shadow, "sm") + ')"';
      var out = '<path d="' + paperPoly(x, y, w, h, { edge: fill(o.edge, "torn"), seed: seed, amp: o.amp, shape: o.shape }) + '" fill="' + (border ? fill(o.borderColor, "#FFFFFF") : fill(o.fill, c.surface)) + '"' + shadow + "/>";
      if (border) out += '<path d="' + paperPoly(x + border, y + border, w - 2 * border, h - 2 * border, { edge: fill(o.innerEdge, "cut"), seed: seed + 9, amp: 2.5 * K, shape: o.shape }) + '" fill="' + fill(o.fill, c.surface) + '"/>';
      out += kids;
      if (o.tape) {
        var tw = Math.min(w * 0.42, 190 * K);
        if (o.tape === "corners") out += tape(x + 20 * K, y + 12 * K, tw * 0.8, { rot: -38 }) + tape(x + w - 20 * K, y + 12 * K, tw * 0.8, { rot: 38 });
        else out += tape(x + w / 2, y - 2 * K, tw, { rot: (hash(seed + 5) - 0.5) * 10 });
      }
      return "<g" + common({ op: o.op, transform: o.transform }) + "><g" + (rot ? ' transform="rotate(' + fx(rot) + " " + fx(x + w / 2) + " " + fx(y + h / 2) + ')"' : "") + ">" + out + "</g></g>";
    };
    /** Halftone dots over a box (newsprint). o: step, r, color, angle, op. */
    var halftone = function (x, y, w, h, o) {
      o = o || {};
      var stp = fill(o.step, 16 * K), id = uid("ht");
      def('<pattern id="' + id + '" width="' + fx(stp) + '" height="' + fx(stp) + '" patternUnits="userSpaceOnUse" patternTransform="rotate(' + fx(fill(o.angle, 45)) + ')"><circle cx="' + fx(stp / 2) + '" cy="' + fx(stp / 2) + '" r="' + fx(fill(o.r, stp * 0.28)) + '" fill="' + fill(o.color, rgba(c.fg, 0.2)) + '"/></pattern>');
      return rect(x, y, w, h, { fill: "url(#" + id + ")", op: o.op, transform: o.transform });
    };
    /** Ransom-note letters: each on its own scrap of paper (faces, fills and tilts mixed), landing on twelves from at. x, y = anchor point, top of the first row. Rows: "\n" or maxW. o: size, anchor (middle), maxW, lh (1.3), stagger, fills, seed, upper. */
    var ransom = function (t2, at, str, x, y, o) {
      o = o || {};
      var size = fill(o.size, 96 * K), s = String(str == null ? "" : str);
      if (o.upper || (o.upper === undefined && st && st.case === "upper")) s = s.toUpperCase();
      var fills = o.fills || ["#FFFFFF", c.accent, c.ink, c.accent2, c.paper];
      var fcs = [faces.display, faces.text, faces.accent], gap = size * 0.06, space = size * 0.32, sd = fill(o.seed, s.length), idx = 0;
      var tileOf = function (ch) {
        var i = idx++, f = fcs[Math.floor(hash(i * 7.7 + sd) * 3) % 3], sz = size * (0.86 + hash(i * 3.3 + sd + 1) * 0.3);
        var font = { size: sz, family: f.family, weight: f.weight, italic: f.italic }, pad = sz * 0.14;
        return { ch: ch, font: font, w: measure(ch, font) + pad * 2, h: sz * 1.1, fill: fills[Math.floor(hash(i * 5.1 + sd + 2) * fills.length) % fills.length], rot: (hash(i * 9.1 + sd + 4) - 0.5) * 14, dy: (hash(i * 4.4 + sd + 6) - 0.5) * size * 0.12, n: i };
      };
      // Words of tiles, wrapped into rows (a word is never split).
      var rows = [];
      s.split("\n").forEach(function (line) {
        var row = [], rw = 0;
        line.split(/\s+/).filter(Boolean).forEach(function (word) {
          var tiles = [], ww = -gap;
          for (var i = 0; i < word.length; i++) { var tl = tileOf(word.charAt(i)); tiles.push(tl); ww += tl.w + gap; }
          var add = (row.length ? space : 0) + ww;
          if (o.maxW && row.length && rw + add > o.maxW) { rows.push({ words: row, w: rw }); row = []; rw = 0; add = ww; }
          row.push(tiles);
          rw += add;
        });
        rows.push({ words: row, w: rw });
      });
      var anchor = fill(o.anchor, "middle"), box = o.within || region, out = "", n = 0;
      rows.forEach(function (row, ri) {
        var cx = anchor === "middle" ? x - row.w / 2 : anchor === "end" ? x - row.w : x, ry = y + ri * size * fill(o.lh, 1.3);
        if (cx < box.x - 2 || cx + row.w > box.x + box.w + 2) warnings.push('ransom row "' + row.words.map(function (w) { return w.map(function (tl) { return tl.ch; }).join(""); }).join(" ").slice(0, 30) + '" is ' + Math.round(row.w) + " px wide and runs off the frame (" + Math.round(box.w) + " px) — make it smaller, set maxW or split it with \\n");
        row.words.forEach(function (tiles, wi) {
          if (wi) cx += space;
          tiles.forEach(function (tl, ti) {
            if (ti) cx += gap;
            var ta = (at == null ? -1e9 : at) + n++ * fill(o.stagger, 0.07);
            if (t2 >= ta) {
              var age = step(t2, 12) - step(ta, 12), sc = age < 1 / 12 ? 1.35 : age < 2 / 12 ? 0.92 : 1;
              var jt = o.jitter === false ? [0, 0] : jitter(t2, 1.2 * K, 12, tl.n);
              out += '<g transform="translate(' + fx(cx + tl.w / 2 + jt[0]) + " " + fx(ry + tl.h / 2 + tl.dy + jt[1]) + ") rotate(" + fx(tl.rot) + ") scale(" + fx3(sc) + ')"><path d="' + paperPoly(-tl.w / 2, -tl.h / 2, tl.w, tl.h, { edge: "cut", seed: tl.n * 3.1 + sd, amp: 3 * K }) + '" fill="' + tl.fill + '" filter="url(#mg-sm)"/>' + text(tl.ch, { x: 0, y: -tl.font.size * 0.45, size: tl.font.size, family: tl.font.family, weight: tl.font.weight, italic: tl.font.italic, anchor: "middle", fill: onColor(tl.fill), within: { x: -1e5, y: -1e5, w: 2e5, h: 2e5 } }) + "</g>";
            }
            cx += tl.w;
          });
        });
      });
      return "<g" + common({ op: o.op, transform: o.transform }) + ">" + out + "</g>";
    };
    /** A soft shadow cast up onto the layer behind, as a few faint offset copies of the shape (a blur this wide costs a frame's budget). */
    var paperShade = function (d) {
      var out = "";
      for (var j = 6; j >= 1; j--) out += '<path d="' + d + '" fill="#1A1208" opacity="' + fx3(0.062 - j * 0.0065) + '" transform="translate(' + fx(j * 1.1 * K) + " " + fx(-j * 2.6 * K) + ')"/>';
      return out;
    };
    /** A diorama layer: paper hills cut along the top, filling down to y + h, casting a soft shadow on the layer behind. o: fill, hills (bumps across), amp (px), seed, shadow (false = none), op. */
    var ridge = function (x, y, w, h, o) {
      o = o || {};
      var seed = fill(o.seed, x * 0.07 + y * 0.13 + 1), hills = fill(o.hills, 2.5), amp = fill(o.amp, Math.min(h * 0.4, 120 * K));
      var n = Math.max(12, Math.ceil(w / (12 * K))), pts = [], ph1 = hash(seed) * 6.28, ph2 = hash(seed + 1) * 6.28;
      for (var i = 0; i <= n; i++) {
        var u = i / n, v = 0.62 * Math.sin(u * Math.PI * hills + ph1) + 0.38 * Math.sin(u * Math.PI * hills * 2.3 + ph2);
        pts.push([x + u * w, y + amp * (0.5 - 0.5 * v) + (hash(seed + i * 0.91) - 0.5) * 2.4 * K]);
      }
      var d = smoothD(pts) + "L" + fx(x + w) + " " + fx(y + h) + "L" + fx(x) + " " + fx(y + h) + "Z";
      return "<g" + common({ op: o.op, transform: o.transform }) + ">" + (o.shadow === false ? "" : paperShade(d)) + '<path d="' + d + '" fill="' + fill(o.fill, c.surface) + '"/></g>';
    };
    /** A slow camera for parallax: {x, y, zoom} easing from one side to the other over [a, b] (default the clip). o: dx, dy, zoom, a, b. */
    var drift = function (t2, o) {
      o = o || {};
      var p = E.sine(seg(t2, fill(o.a, 0), fill(o.b, env.duration || 6))), dx = fill(o.dx, 140 * K), dy = fill(o.dy, 0);
      return { x: lerp(-dx / 2, dx / 2, p), y: lerp(-dy / 2, dy / 2, p), zoom: lerp(1, fill(o.zoom, 1.06), p) };
    };
    /** Children at a depth (0 = far, still; 1 = near, moves with the camera) under a camera from $.drift. */
    var parallax = function (depth, cam) {
      var kids = join(Array.prototype.slice.call(arguments, 2));
      cam = cam || { x: 0, y: 0, zoom: 1 };
      var s = 1 + (fill(cam.zoom, 1) - 1) * depth, cx = region.x + region.w / 2, cy = region.y + region.h / 2;
      return '<g transform="translate(' + fx(cx - fill(cam.x, 0) * depth) + " " + fx(cy - fill(cam.y, 0) * depth) + ") scale(" + fx3(s) + ") translate(" + fx(-cx) + " " + fx(-cy) + ')">' + kids + "</g>";
    };

    // ———— clay ————
    /**
     * Children modelled in clay: lumpy edges, a soft lit bevel with a sheen, thumbprint texture and a contact shadow.
     * o: depth (bevel, 7), lumps (px), soft (bevel width), shine, light (azimuth°), boil (true = the clay re-settles on twelves like stop motion), shadow (false = none), op, transform.
     */
    var clay = function (t2, o) {
      o = o || {};
      var kids = join(Array.prototype.slice.call(arguments, 2));
      var id = uid("cl"), seed = o.boil ? (Math.floor(t2 * fill(o.fps, 12) + 1e-6) % 89) + 1 : fill(o.seed, 3);
      var depth = fill(o.depth, 7), lumps = fill(o.lumps, 3 * K), az = fill(o.light, 225);
      var f = '<filter id="' + id + '" x="-25%" y="-25%" width="150%" height="175%" color-interpolation-filters="sRGB">';
      f += lumps > 0 ? '<feTurbulence type="fractalNoise" baseFrequency="' + fx3(0.018 / K) + '" numOctaves="2" seed="' + seed + '" result="ln"/><feDisplacementMap in="SourceGraphic" in2="ln" scale="' + fx(lumps) + '" xChannelSelector="R" yChannelSelector="G" result="src"/>' : '<feOffset in="SourceGraphic" result="src"/>';
      f += '<feGaussianBlur in="src" stdDeviation="' + fx(fill(o.soft, 9) * K) + '" result="hb"/>';
      f += o.prints === false ? '<feOffset in="hb" result="hm"/>' : '<feTurbulence type="fractalNoise" baseFrequency="' + fx3(0.09 / K) + '" numOctaves="2" seed="' + (seed + 7) + '" result="pn"/><feComposite in="pn" in2="hb" operator="arithmetic" k1="0" k2="0.05" k3="1" k4="-0.025" result="hm"/>';
      f += '<feDiffuseLighting in="hm" surfaceScale="' + fx(depth) + '" diffuseConstant="1.15" lighting-color="#FFFFFF" result="df"><feDistantLight azimuth="' + fx(az) + '" elevation="58"/></feDiffuseLighting>';
      f += '<feComposite in="src" in2="df" operator="arithmetic" k1="1" k2="0" k3="0" k4="0" result="sh"/>';
      f += '<feSpecularLighting in="hm" surfaceScale="' + fx(depth) + '" specularConstant="' + fx3(fill(o.shine, 0.5)) + '" specularExponent="18" lighting-color="#FFFFFF" result="sp"><feDistantLight azimuth="' + fx(az) + '" elevation="40"/></feSpecularLighting>';
      f += '<feComposite in="sp" in2="src" operator="in" result="spi"/><feComposite in="spi" in2="sh" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="lit"/>';
      f += o.shadow === false ? "" : '<feGaussianBlur in="src" stdDeviation="' + fx(12 * K) + '" result="sb"/><feOffset in="sb" dx="' + fx(5 * K) + '" dy="' + fx(16 * K) + '" result="so"/><feColorMatrix in="so" type="matrix" values="0 0 0 0 0.12 0 0 0 0 0.09 0 0 0 0 0.07 0 0 0 0.42 0" result="cs"/><feMerge><feMergeNode in="cs"/><feMergeNode in="lit"/></feMerge>';
      def(f + "</filter>");
      return '<g filter="url(#' + id + ')"' + common({ op: o.op, transform: o.transform }) + ">" + kids + "</g>";
    };

    // ———— storybook ————
    /** A watercolour wash: a pigment blob with soft bleeding edges, granulation and a darker rim where the pigment pools; p (0–1) bleeds it in. o: color, a (opacity .6), shape ("blob" | "rect"), rim (px, 7), p, seed. */
    var wash = function (x, y, w, h, o) {
      o = o || {};
      var p = clamp(fill(o.p, 1));
      if (p <= 0) return "";
      var seed = fill(o.seed, x * 0.11 + y * 0.07 + 3), col = fill(o.color, c.accent), cx = x + w / 2, cy = y + h / 2, d;
      if (o.shape === "rect") d = paperPoly(x, y, w, h, { edge: "wavy", amp: 10 * K, seed: seed });
      var ep = E.out3(p);
      if (o.shape !== "rect") {
        // A ragged, blooming edge from a few seeded harmonics (cheaper than displacing pixels every frame), raggeder as it bleeds out.
        var pts = [], n = 160, ph = [hash(seed) * 6.28, hash(seed + 1) * 6.28, hash(seed + 2) * 6.28, hash(seed + 3) * 6.28, hash(seed + 4) * 6.28, hash(seed + 5) * 6.28];
        for (var i = 0; i < n; i++) {
          var a = (i / n) * Math.PI * 2;
          var rr = 1 + (0.07 * Math.sin(a * 3 + ph[0]) + 0.045 * Math.sin(a * 5 + ph[1]) + 0.025 * Math.sin(a * 9 + ph[2]) + 0.014 * Math.sin(a * 15 + ph[3]) + 0.009 * Math.sin(a * 26 + ph[4]) + 0.006 * Math.sin(a * 41 + ph[5])) * lerp(0.6, 1, ep) + (hash(seed + i * 0.37) - 0.5) * 0.024;
          pts.push([cx + Math.cos(a) * (w / 2) * rr, cy + Math.sin(a) * (h / 2) * rr]);
        }
        pts.push(pts[0], pts[1]);
        d = smoothD(pts, true);
      }
      var id = uid("wa"), m = Math.max(w, h) * 0.12;
      // Soft edge, then the pigment pooling darker along it (the edge minus its blur).
      def('<filter id="' + id + '" filterUnits="userSpaceOnUse" x="' + fx(x - m) + '" y="' + fx(y - m) + '" width="' + fx(w + 2 * m) + '" height="' + fx(h + 2 * m) + '" color-interpolation-filters="sRGB">' +
        '<feGaussianBlur in="SourceGraphic" stdDeviation="' + fx(1.4 * K) + '" result="d"/>' +
        '<feGaussianBlur in="d" stdDeviation="' + fx(fill(o.rim, 7) * K) + '" result="b"/>' +
        '<feComposite in="d" in2="b" operator="arithmetic" k1="0" k2="1" k3="-1" k4="0" result="rim"/>' +
        '<feComposite in="rim" in2="d" operator="arithmetic" k1="0" k2="1.6" k3="1" k4="0"/></filter>');
      // Granulation: the paper's grain showing through the pigment.
      var body = '<path d="' + d + '" fill="' + col + '"/>';
      var grain = '<path d="' + d + '" fill="url(#' + grainPattern(c.ink) + ')" opacity="0.7"/>';
      var sc = lerp(0.9, 1, ep);
      return '<g opacity="' + fx3(fill(o.a, 0.6) * E.out2(p)) + '" transform="translate(' + fx(cx) + " " + fx(cy) + ") scale(" + fx3(sc) + ") translate(" + fx(-cx) + " " + fx(-cy) + ')" style="mix-blend-mode:multiply"><g filter="url(#' + id + ')">' + body + "</g>" + grain + "</g>";
    };
    /** A storybook frame: a ruled border and an inner frame with scooped corners, drawn on as draw goes 0 → 1. o: draw, color, sw, inset, corner, op. */
    var inkFrame = function (x, y, w, h, o) {
      o = o || {};
      var p = clamp(fill(o.draw, 1)), col = fill(o.color, c.fg), sw = fill(o.sw, 3 * K), ins = fill(o.inset, 16 * K), r = fill(o.corner, 26 * K);
      var ix = x + ins, iy = y + ins, iw = w - 2 * ins, ih = h - 2 * ins, A = function (ex, ey) { return "A" + fx(r) + " " + fx(r) + " 0 0 0 " + fx(ex) + " " + fx(ey); };
      var outer = "M" + fx(x) + " " + fx(y) + "H" + fx(x + w) + "V" + fx(y + h) + "H" + fx(x) + "Z";
      var inner = "M" + fx(ix + r) + " " + fx(iy) + "H" + fx(ix + iw - r) + A(ix + iw, iy + r) + "V" + fx(iy + ih - r) + A(ix + iw - r, iy + ih) + "H" + fx(ix + r) + A(ix, iy + ih - r) + "V" + fx(iy + r) + A(ix + r, iy) + "Z";
      var out = path(outer, { stroke: col, sw: sw, draw: p }) + path(inner, { stroke: col, sw: sw * 0.5, draw: clamp(p * 1.15 - 0.15) });
      if (p > 0.85) {
        var dop = (p - 0.85) / 0.15;
        [[ix, iy], [ix + iw, iy], [ix + iw, iy + ih], [ix, iy + ih]].forEach(function (q) { out += '<path d="M' + fx(q[0]) + " " + fx(q[1] - 7 * K) + "L" + fx(q[0] + 7 * K) + " " + fx(q[1]) + "L" + fx(q[0]) + " " + fx(q[1] + 7 * K) + "L" + fx(q[0] - 7 * K) + " " + fx(q[1]) + 'Z" fill="' + col + '" opacity="' + fx3(dop) + '"/>'; });
      }
      return "<g" + common({ op: o.op, transform: o.transform }) + ">" + out + "</g>";
    };
    /** Darker edges over a box (default the region). o: color, a (.35), inner (.55 — where it starts), box, op. */
    var vignette = function (o) {
      o = o || {};
      var b = o.box || region, col = fill(o.color, "#000000");
      return rect(b.x, b.y, b.w, b.h, { fill: gradient([[0, col, 0], [fill(o.inner, 0.55), col, 0], [1, col, fill(o.a, 0.35)]], { radial: true, r: 0.75 }), op: o.op });
    };

    // ———— the art textures ————
    // Paper grain is noise that never changes, so it is drawn once into a small seamless tile and repeated — a
    // full-frame turbulence filter would be recomputed every frame. Grain tiles are kept per colour for the frame.
    var grainTiles = {};
    var grainPattern = function (col) {
      var key = String(col);
      if (grainTiles[key]) return grainTiles[key];
      var T = Math.round(256 * K), fid = uid("gf"), pid = uid("gp"), rgb = hexRgb(col) || [0, 0, 0];
      def('<filter id="' + fid + '" filterUnits="userSpaceOnUse" x="0" y="0" width="' + T + '" height="' + T + '"><feTurbulence type="fractalNoise" baseFrequency="' + fx3(0.75 / K) + '" numOctaves="2" seed="11" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 ' + fx3(rgb[0] / 255) + " 0 0 0 0 " + fx3(rgb[1] / 255) + " 0 0 0 0 " + fx3(rgb[2] / 255) + ' 1.4 0 0 0 -0.5"/></filter>');
      def('<pattern id="' + pid + '" width="' + T + '" height="' + T + '" patternUnits="userSpaceOnUse"><rect width="' + T + '" height="' + T + '" fill="#000000" filter="url(#' + fid + ')"/></pattern>');
      grainTiles[key] = pid;
      return pid;
    };
    var fibre = function (b, op) { return rect(b.x, b.y, b.w, b.h, { fill: "url(#" + grainPattern(c.ink) + ")", op: op }); };
    /** Big soft stains in one colour at seeded places: the uneven tone of paper or parchment. */
    var blotches = function (b, col, a, n, seed) {
      var out = "", R = Math.max(b.w, b.h);
      for (var i = 0; i < n; i++) {
        var r = R * (0.18 + 0.22 * hash(seed + i * 1.7)), gx = b.x + b.w * hash(seed + i * 3.1 + 1), gy = b.y + b.h * hash(seed + i * 5.3 + 2);
        out += circle(gx, gy, r, { fill: gradient([[0, col, a * (0.5 + 0.5 * hash(seed + i))], [1, col, 0]], { radial: true }) });
      }
      return clip(b.x, b.y, b.w, b.h, 0, out);
    };
    var artTexture = function (t2, tex, b) {
      if (tex === "paper") return blotches(b, c.ink, 0.05, 7, 5) + fibre(b, 0.1);
      if (tex === "parchment") return blotches(b, c.ink, 0.16, 9, 3) + fibre(b, 0.12) + vignette({ box: b, color: c.ink, a: 0.42, inner: 0.45 });
      if (tex === "board") {
        var out = rect(b.x, b.y, b.w, b.h, { fill: gradient([[0, c.ink, 0], [1, c.ink, 0.05]], { angle: 160 }) });
        out += rect(b.x, b.y, b.w, b.h, { fill: gradient([[0, "#FFFFFF", 0], [0.4, "#FFFFFF", 0.5], [0.5, "#FFFFFF", 0], [0.62, "#FFFFFF", 0.3], [1, "#FFFFFF", 0]], { angle: 115 }) });
        for (var i = 0; i < 3; i++) {
          var gx = b.x + b.w * (0.15 + 0.6 * hash(i * 3.7 + 1)), gy = b.y + b.h * (0.15 + 0.7 * hash(i * 5.3 + 2)), gw = b.w * (0.2 + 0.25 * hash(i + 9));
          out += '<path d="' + smoothD(hand.curve(gx, gy, gx + gw, gy + (hash(i + 4) - 0.5) * 80 * K, { bend: 0.25, seed: i + 1 })) + '" fill="none" stroke="' + rgba(c.ink, 0.028) + '" stroke-width="' + fx(28 * K) + '" stroke-linecap="round" filter="url(#mg-blur)"/>';
        }
        return out;
      }
      if (tex === "pixel") {
        var cell = 6 * K, d1 = uid("px"), d2 = uid("sl");
        def('<pattern id="' + d1 + '" width="' + fx(cell * 2) + '" height="' + fx(cell * 2) + '" patternUnits="userSpaceOnUse"><rect width="' + fx(cell * 0.4) + '" height="' + fx(cell * 0.4) + '" fill="' + rgba(c.fg, 0.08) + '"/></pattern>');
        def('<pattern id="' + d2 + '" width="' + fx(4 * K) + '" height="' + fx(4 * K) + '" patternUnits="userSpaceOnUse"><rect width="' + fx(4 * K) + '" height="' + fx(2 * K) + '" fill="rgba(0,0,0,0.16)"/></pattern>');
        return rect(b.x, b.y, b.w, b.h, { fill: "url(#" + d1 + ")" }) + rect(b.x, b.y, b.w, b.h, { fill: "url(#" + d2 + ")" }) + vignette({ box: b, a: 0.45 });
      }
      if (tex === "studio") {
        return rect(b.x, b.y, b.w, b.h, { fill: gradient([[0, "#FFFFFF", 0.55], [1, "#FFFFFF", 0]], { radial: true, cx: 0.5, cy: 0.25, r: 0.6 }) }) +
          rect(b.x, b.y, b.w, b.h, { fill: gradient([[0, c.ink, 0], [0.6, c.ink, 0], [0.74, c.ink, 0.05], [1, c.ink, 0.11]], { angle: 180 }) }) +
          vignette({ box: b, color: c.ink, a: 0.14 });
      }
      return "";
    };
    /** The style's texture over a box (default the region): grid + glow, glow, grain — or nothing. */
    var texture = function (t2, o) {
      o = o || {};
      var b = o.box || region;
      var tex = fill(o.kind, st ? st.texture : "grid");
      var out = "";
      if (tex === "grid") out += grid(b.x, b.y, b.w, b.h, {});
      if (tex === "grid" || tex === "glow") out += clip(b.x, b.y, b.w, b.h, 0, glow(t2, b.x + b.w * 0.7, b.y + b.h * 0.35, { r: Math.max(b.w, b.h) * 0.55, a: tex === "glow" ? 0.3 : 0.2 }));
      if (tex === "grain") out += grain(t2, { box: b });
      out += artTexture(t2, tex, b);
      return out;
    };

    return {
      // canvas and context
      W: W, H: H, dur: env.duration || 0, fps: env.fps || 30, t: t,
      region: region, window: win, words: words, data: env.data || {}, palette: palette, c: c, media: env.media || {},
      style: styleInfo, font: font, case: caseOf, on: onColor, rgba: rgba, k: K,
      // timing
      at: at, atOr: atOr, beat: beat, sync: sync,
      clamp: clamp, lerp: lerp, seg: seg, E: E, spring: spring, wave: wave, hash: hash, pop: function (t2, t0, f, d) { return pop(t2, t0, f === undefined ? mot[0] : f, d === undefined ? mot[1] : d); }, fadeIn: fadeIn, fadeOut: fadeOut, bump: bump, shake: shake, typed: typed, count: count, fx: fx, esc: esc,
      // poses → attributes
      tf: tf, enter: function (t2, t0, o) { o = withMot(o); return poseAttrs(enterPose(t2, t0, o), o.ox || 0, o.oy || 0); }, life: function (t2, a, b, o) { o = withMot(o); return poseAttrs(lifePose(t2, a, b, o), o.ox || 0, o.oy || 0); }, enterPose: function (t2, t0, o) { return enterPose(t2, t0, withMot(o)); }, lifePose: function (t2, a, b, o) { return lifePose(t2, a, b, withMot(o)); },
      // svg
      uid: uid, def: def, g: g, clip: clip, rect: rect, circle: circle, path: path, line: line, gradient: gradient,
      text: text, textHeight: textHeight, measure: function (str, o) { return measure(str, withFace(o, "text")); }, wrap: function (str, maxW, o) { return wrap(str, maxW, withFace(o, "text")); }, headline: headline, letters: letters, typing: typing, counter: counter,
      icon: icon, icons: Object.keys(ICONS), card: card, chip: chip, meter: meter, stamp: stamp, strike: strike, burst: burst, rays: rays, flash: flash, glow: glow, grid: grid, panel: panel, grain: grain, cursor: cursor, arrow: arrow, ring: ring, phone: phone, image: image,
      scrim: scrim, reveal: reveal, button: button, underline: underline, bars: bars, texture: texture,
      // explainer art styles
      step: step, jitter: jitter, mix: mix, hand: hand, ink: ink, write: write, boil: boil, smooth: smoothD,
      sprite: sprite, sprites: Object.keys(SPRITES), pixelBox: pixelBox,
      cutout: cutout, tape: tape, halftone: halftone, ransom: ransom, ridge: ridge, drift: drift, parallax: parallax,
      clay: clay, wash: wash, inkFrame: inkFrame, vignette: vignette,
      // collected by the runner after the frame
      _defs: function () { return defs.join(""); }, _warnings: function () { return warnings.slice(); }, _post: postFrame
    };
  }

  /** Start (on) or stop collecting the trace; traced() hands back what was collected and starts afresh. */
  var trace = function (on) { TRACE = on ? [] : null; };
  var traced = function () { var x = TRACE || []; if (TRACE !== null) TRACE = []; return x; };
  return { make: make, trace: trace, traced: traced, K: { clamp: clamp, lerp: lerp, seg: seg, E: E, spring: spring, wave: wave, hash: hash, pop: pop, fadeIn: fadeIn, fadeOut: fadeOut, bump: bump, shake: shake, typed: typed, count: count, fx: fx, esc: esc }, measure: measure, familyName: familyName };
})();
`;

/** The filters every frame can use by name (`shadow: "lg"` → url(#mg-lg)); the renderer adds them to each frame's defs. */
export const MG_STD_DEFS =
  '<filter id="mg-sm" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.28"/></filter>' +
  '<filter id="mg-md" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000" flood-opacity="0.32"/></filter>' +
  '<filter id="mg-lg" x="-25%" y="-25%" width="150%" height="170%"><feDropShadow dx="0" dy="30" stdDeviation="34" flood-color="#000" flood-opacity="0.42"/></filter>' +
  '<filter id="mg-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
  '<filter id="mg-blur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="12"/></filter>' +
  '<filter id="mg-hard" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="10" dy="10" stdDeviation="0" flood-color="#111111" flood-opacity="1"/></filter>';

/** The pixel sprites the runtime has built in ($.sprite(name, …)), read from its source. */
export const MG_SPRITE_NAMES: string[] = (() => {
  const from = MG_RUNTIME.indexOf("var SPRITES = {");
  const to = MG_RUNTIME.indexOf("\n    };", from);
  return [...MG_RUNTIME.slice(from, to).matchAll(/^\s+([a-z]+): \[/gm)].map((m) => m[1]!);
})();

/** The icon names the runtime draws ($.icon(name, …)), read from its source so the two never drift. */
export const MG_ICON_NAMES: string[] = (() => {
  const from = MG_RUNTIME.indexOf("var ICONS = {");
  const to = MG_RUNTIME.indexOf("\n    };", from);
  return [...MG_RUNTIME.slice(from, to).matchAll(/^\s+([a-zA-Z]+): '/gm)].map((m) => m[1]!);
})();
