// The Volito intro, 1:1, with its own sound design. Four scenes on one paper ground: the sentence lands word by
// word with a lime marker; the mark assembles out of its three shapes and blows up into a cobalt field; the
// extruded wordmark swings in under a light sweep with the tagline and three chips; the field slides away and
// the lockup types itself onto the paper. sound($) below designs the track on the same times the picture uses.

var VOLITO_ORANGE = "#FF6A3D";

/** The times the words of the opening sentence land (by index); past the list, one every 0.2 s. */
function wordAt(i) {
  var times = [0.25, 0.45, 0.72, 0.9, 1.08];
  return times[i] !== undefined ? times[i] : 0.25 + i * 0.2;
}

/** The lime quarter disc that sits in the top-left corner of a square of side s at (x, y), clipped to the square. */
function quarterDisc($, x, y, s, r, radius, fillColor) {
  var q = radius;
  return $.clip(x, y, s, s, r, $.path("M" + $.fx(x) + " " + $.fx(y) + "h" + $.fx(q) + "a" + $.fx(q) + " " + $.fx(q) + " 0 0 1 " + $.fx(-q) + " " + $.fx(q) + "z", { fill: fillColor }));
}

/** The Volito mark at (x, y), side s: a cobalt rounded square, the lime quarter at its top-left, the orange square at its bottom-right, an ink outline. */
function mark($, x, y, s) {
  var c = $.c, r = s * 0.25, d = s * 0.22, inset = s * 0.094;
  return $.rect(x, y, s, s, { r: r, fill: c.accent }) + quarterDisc($, x, y, s, r, s * 0.5, c.accent2) + $.rect(x + s - inset - d, y + s - inset - d, d, d, { fill: VOLITO_ORANGE }) + $.rect(x, y, s, s, { r: r, fill: "none", stroke: c.ink, sw: Math.max(2, s * 0.018) });
}

function frame(t, $) {
  var p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  var A = safeArea($);
  var M = motion($, t);
  var cx = W / 2;
  var ink = c.ink, paper = c.paper;
  var s = "";

  // The ground, the whole way through: paper and a faint cobalt graph.
  s += M.part("ground", { in: "none", out: "none", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H }, glow: false }) + $.pattern(t, "graph", { color: c.accent, a: 0.35, scale: 1.25, speed: 0.12 }));

  // ———— 1. The sentence (0 – 1.95 s): words rise in on their times, a marker swipes under one, everything pushes out. ————
  // At 1.85 s the whole sentence collapses into the centre, where the mark is about to land.
  var leave1 = { out: "zoom", outAt: 1.82, outDur: 0.26, outEase: "inOut" };
  var rows = String(p.sentence || "").split("\n").map(function (r) { return r.trim(); }).filter(Boolean);
  if (t < 2.4 && rows.length) {
    var size = Math.min(150 * k, A.h * 0.17);
    rows.forEach(function (r) { size = Math.min(size, fitFont($, r, "display", size, A.w * 0.9, { ls: -0.03 }).size); });
    var lh = 1.04;
    var blockH = size * (1 + (rows.length - 1) * lh);
    var y0 = H / 2 - blockH / 2 - size * 0.08;
    var font = Object.assign({}, $.font("display"), { ls: -0.03, size: size, x: cx, y: y0, anchor: "middle", lh: lh, fill: ink });
    var text = rows.join("\n");
    var lay = M.layout(text, font, "words");
    var marked = String(p.marked || "").trim().toLowerCase();
    var block = "";
    lay.units.forEach(function (u) {
      if (!marked || u.text.toLowerCase() !== marked) return;
      var box = { x: u.x - size * 0.08, y: u.y + size * 0.3, w: u.w + size * 0.16, h: size * 0.72 };
      block += M.part("marker", { at: wordAt(u.index) + 0.22, in: "grow-x", origin: "left", ease: "out", dur: 0.34, box: box, out: "none", vary: false }, $.rect(box.x, box.y, box.w, box.h, { r: size * 0.1, fill: c.accent2, transform: $.tf({ r: -1.5, ox: box.x, oy: box.y + box.h / 2 }) }));
    });
    block += M.text("sentence", Object.assign({ split: "words", in: "rise", distance: (size * 0.5) / k, ease: "spring(2.4, 7.5)", out: "none", unitAt: function (u) { return wordAt(u.index); } }, font), text);
    // The whole block, marker and all, collapses into its centre — where the mark is about to land.
    s += M.part("opening", Object.assign({ in: "none", box: lay.box, vary: false }, leave1), block);
  }

  // ———— 2. The mark assembles (1.95 – 3 s): the square slides up, the quarter arcs in, the dot drops. ————
  var S0 = Math.min(320 * k, A.w * 0.34);
  var mx = cx - S0 / 2, my = H * 0.46 - S0 / 2;
  var r0 = S0 * 0.25, d0 = S0 * 0.22, in0 = S0 * 0.094;
  var FIELD = 3.0;
  if (t < FIELD) {
    var sh = $.seg(t, 2.1, 2.5) * (1 - $.seg(t, 2.85, FIELD));
    if (sh > 0) s += $.circle(cx, my + S0 + 16 * k, S0 * 0.5, { fill: ink, op: 0.14 * sh, transform: $.tf({ sy: 0.16, ox: cx, oy: my + S0 + 16 * k }) });
    s += M.part("square", { at: 2.05, in: "slide", from: "down", distance: 300, ease: "punchy", dur: 0.6, box: { x: mx, y: my, w: S0, h: S0 }, out: "none" }, $.rect(mx, my, S0, S0, { r: r0, fill: c.accent }));
    s += M.part("quarter", { at: 2.17, in: "arc", from: "left", distance: 240, ease: "punchy", dur: 0.6, box: { x: mx, y: my, w: S0 / 2, h: S0 / 2 }, out: "none" }, quarterDisc($, mx, my, S0, r0, S0 * 0.5, c.accent2));
    s += M.part("dot", { at: 2.29, in: "drop", distance: 260, ease: "bouncy", dur: 0.6, box: { x: mx + S0 - in0 - d0, y: my + S0 - in0 - d0, w: d0, h: d0 }, out: "none" }, $.rect(mx + S0 - in0 - d0, my + S0 - in0 - d0, d0, d0, { fill: VOLITO_ORANGE }));
    s += M.part("outline", { at: 2.4, in: "fade", dur: 0.3, out: "none", vary: false }, $.rect(mx, my, S0, S0, { r: r0, fill: "none", stroke: ink, sw: S0 * 0.018 }));
  }

  // ———— 3. The field (3 – 6.35 s): the square becomes the frame, the shapes take the corners, the wordmark swings in. ————
  if (t >= FIELD) {
    var q = $.E.inOut3($.seg(t, FIELD, FIELD + 0.36));
    var fs = S0 + (Math.max(W, H) * 1.6 - S0) * q;
    var fcy = my + S0 / 2 + (H / 2 - (my + S0 / 2)) * q;
    var fr = r0 * (1 - q);
    var fx0 = cx - fs / 2, fy0 = fcy - fs / 2;
    var field = $.rect(fx0, fy0, fs, fs, { r: fr, fill: c.accent });
    // The quarter and the dot glide from the mark into the frame's corners.
    var q2 = $.E.inOut3($.seg(t, FIELD + 0.05, FIELD + 0.5));
    var qr = $.lerp(S0 * 0.5, Math.min(W, H) * 0.3, q2), qx = $.lerp(mx, 0, q2), qy = $.lerp(my, 0, q2);
    field += $.clip(fx0, fy0, fs, fs, fr, $.path("M" + $.fx(qx) + " " + $.fx(qy) + "h" + $.fx(qr) + "a" + $.fx(qr) + " " + $.fx(qr) + " 0 0 1 " + $.fx(-qr) + " " + $.fx(qr) + "z", { fill: c.accent2 }));
    var dd = $.lerp(d0, 92 * k, q2), dx = $.lerp(mx + S0 - in0 - d0, W - 64 * k - 92 * k, q2), dy = $.lerp(my + S0 - in0 - d0, H - 64 * k - 92 * k, q2);
    field += $.rect(dx, dy, dd, dd, { fill: VOLITO_ORANGE });
    if (q < 1) field += $.rect(fx0, fy0, fs, fs, { r: fr, fill: "none", stroke: ink, sw: S0 * 0.018, op: 1 - q });

    // The wordmark: extruded in the display face, paper on its faces and lime on its sides, swinging in on a spring.
    var tw = FIELD + 0.35;
    var e = $.spring(Math.max(0, t - tw), 2.1, 6.2);
    var wy = H * 0.5;
    var sweep = $.seg(t, tw + 0.45, tw + 1.5);
    // The key light sweeps left to right across the letters and settles a little right of front, so the paper faces stay paper.
    var lx = -1.4 + 1.9 * $.E.inOut2(sweep);
    var S3 = scene3d($, { camera: { fov: 30, yaw: -6 + 12 * $.seg(t, tw, 6.4), pitch: -5, y: wy }, light: { dir: [lx, 0.4, 0.85], ambient: 0.8, spec: 0.2 + 0.7 * Math.sin(Math.PI * sweep), shine: 14 } });
    var word = String(p.wordmark || "VOLITO");
    var fd = $.font("display");
    var w100 = S3.measure(word, { face: fd, size: 100 });
    var size3 = w100 > 0 ? Math.min(Math.min(A.h * 0.26, 250 * k), ((A.w * 0.84) / w100) * 100) : 200 * k;
    var mesh = S3.text(word, { face: fd, size: size3, depth: size3 * 0.3, color: paper, side: c.accent2 });
    S3.add(mesh, { rotate: [10 * (1 - e), -78 * (1 - e), 0], scale: 0.88 + 0.12 * e, position: [0, (1 - Math.min(1, e)) * size3 * 0.2, 0] });
    var shadow = "";
    var pj = S3.project([0, size3 * 0.62, 0]);
    if (pj) {
      var sid = $.uid("fs");
      $.def('<radialGradient id="' + sid + '"><stop offset="0" stop-color="#000" stop-opacity="' + $.fx(0.35 * Math.min(1, e)) + '"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>');
      shadow = '<ellipse cx="' + $.fx(pj.x) + '" cy="' + $.fx(pj.y) + '" rx="' + $.fx(mesh.w * 0.55 * pj.s) + '" ry="' + $.fx(mesh.w * 0.55 * pj.s * 0.18) + '" fill="url(#' + sid + ')"/>';
    }
    field += M.part("wordmark", { at: tw, in: "fade", dur: 0.15, out: "none", vary: false }, shadow + S3.render());

    var tag = String(p.tagline || "").toUpperCase();
    var tf = fitFont($, tag, "mono", 30 * k, A.w * 0.8, { ls: 0.3 });
    var ty = wy + size3 * 0.78;
    if (tag) field += M.text("tagline", Object.assign({ at: 4.5, in: "rise", distance: 18, out: "none" }, tf, { x: cx, y: ty, anchor: "middle", fill: $.rgba(paper, 0.8) }), tag);

    var chips = String(p.chips || "").split(";").map(function (x) { return x.trim(); }).filter(Boolean);
    var csz = 26 * k, gap = 14 * k;
    var sizes = chips.map(function (x) { return $.chip.size(x, { size: csz }); });
    var tot = sizes.reduce(function (a, b) { return a + b.w; }, 0) + gap * Math.max(0, chips.length - 1);
    var chx = cx - tot / 2, chy = ty + tf.size + 46 * k;
    chips.forEach(function (x, i) {
      var b = { x: chx, y: chy, w: sizes[i].w, h: sizes[i].h };
      field += M.part("chip" + (i + 1), { at: 5.1 + i * 0.15, in: "pop", ease: "punchy", dur: 0.5, box: b, out: "none" }, $.chip(x, b.x, b.y, { size: csz, fill: c.accent2, color: ink }));
      chx += b.w + gap;
    });

    s += M.part("field", { in: "none", out: "slide", outFrom: "down", outAt: 6.35, outDur: 0.5, outEase: "in", distance: 470, box: { x: 0, y: 0, w: W, h: H }, vary: false }, field);
  }

  // ———— 4. The lockup (6.35 – 10 s): a command types itself, the mark pops, the name rises, the byline and the URL. ————
  if (t >= 6.3) {
    var mono = Object.assign({}, $.font("mono"), { size: 34 * k, ls: 0.02 });
    s += M.text("cmd", Object.assign({ at: 6.7, in: "typewriter", stagger: 0.065, out: "none" }, mono, { x: cx, y: A.y + 190 * k, anchor: "middle", fill: $.rgba(ink, 0.62) }), String(p.cmd || ""));
    var L = 150 * k, ly = A.y + 290 * k;
    s += M.part("logo", { at: 7.3, in: "pop", ease: "punchy", dur: 0.5, box: { x: cx - L / 2, y: ly, w: L, h: L }, out: "none" }, mark($, cx - L / 2, ly, L));
    var name = $.case(String(p.name || ""));
    var nf = fitFont($, name, "display", 170 * k, A.w * 0.8, { ls: -0.04 });
    var ny = ly + L + 34 * k;
    s += M.text("name", Object.assign({ at: 7.45, in: "rise", distance: 40, ease: "spring(2.2, 7)", out: "none" }, nf, { x: cx, y: ny, anchor: "middle", fill: ink }), name);
    var bf = Object.assign({}, $.font("text"), { size: 32 * k });
    var by = ny + nf.size * 1.12 + 14 * k;
    if (p.byline) s += M.text("byline", Object.assign({ at: 7.9, in: "fade", dur: 0.5, out: "none" }, bf, { x: cx, y: by, anchor: "middle", fill: $.rgba(ink, 0.65) }), String(p.byline));
    var url = String(p.url || "");
    if (url) {
      var uz = 30 * k, usz = $.chip.size(url, { size: uz });
      var ub = { x: cx - usz.w / 2, y: by + bf.size * 1.12 + 26 * k, w: usz.w, h: usz.h };
      s += M.part("url", { at: 8.25, in: "pop", ease: "punchy", dur: 0.5, box: ub, out: "none" }, $.chip(url, ub.x, ub.y, { size: uz, fill: c.accent2, color: ink }));
    }
  }
  return s;
}

/** The sound: every cue sits on a time the picture uses above. A D minor bed comes in with the field and steps back under the hits. */
function sound($) {
  var cues = [];
  for (var i = 0; i < 5; i++) cues.push({ at: wordAt(i), kind: "tick", pitch: -3 + i * 2.5, level: 0.9, pan: i % 2 ? 0.2 : -0.2 });
  cues.push({ at: 1.3, kind: "whoosh", pitch: 12, dur: 0.32, level: 0.6 });
  cues.push({ at: 1.82, kind: "fall", pitch: 4, dur: 0.32, level: 0.6 });
  cues.push({ at: 1.95, kind: "riser", dur: 1.15, level: 0.9 });
  cues.push({ at: 2.05, kind: "whoosh", dur: 0.4, level: 0.7 });
  cues.push({ at: 2.17, kind: "whoosh", pitch: 3, dur: 0.4, level: 0.65, pan: -0.4 });
  cues.push({ at: 2.29, kind: "whoosh", pitch: 6, dur: 0.3, level: 0.6, pan: 0.35 });
  cues.push({ at: 2.37, kind: "pop", level: 0.8 });
  cues.push({ at: 2.49, kind: "pop", pitch: 3, level: 0.75, pan: -0.3 });
  cues.push({ at: 2.63, kind: "pop", pitch: 6, level: 0.7, pan: 0.3 });
  cues.push({ at: 3.1, kind: "stamp", level: 1 });
  cues.push({ at: 3.1, kind: "sub", level: 0.9 });
  cues.push({ at: 3.33, kind: "whoosh", pitch: -3, dur: 0.45, level: 0.9 });
  cues.push({ at: 3.62, kind: "hit", level: 0.85 });
  cues.push({ at: 3.85, kind: "shimmer", dur: 1.1, level: 0.9, pan: 0.2 });
  cues.push({ at: 4.5, kind: "swell", level: 0.8 });
  for (var j = 0; j < 3; j++) cues.push({ at: 5.1 + j * 0.15, kind: "pop", pitch: j * 2.5, level: 0.7, pan: (j - 1) * 0.3 });
  cues.push({ at: 6.35, kind: "whoosh", pitch: -4, dur: 0.5, level: 0.9 });
  cues.push({ at: 6.35, kind: "fall", dur: 0.7, level: 0.55 });
  cues.push({ at: 6.7, kind: "type", dur: 0.78, level: 0.9 });
  cues.push({ at: 7.3, kind: "pop", pitch: -2, level: 1 });
  cues.push({ at: 7.3, kind: "hit", level: 0.55 });
  cues.push({ at: 7.45, kind: "whoosh", pitch: 4, dur: 0.35, level: 0.5 });
  cues.push({ at: 7.5, kind: "ding", note: "A5", level: 0.7 });
  cues.push({ at: 7.9, kind: "swell", level: 0.6 });
  cues.push({ at: 8.25, kind: "pop", pitch: 5, level: 0.7 });
  return { cues: cues, bed: { key: "D", mode: "minor", from: 3.0, to: -0.3, level: 0.55, tone: 0.45 }, auto: false, room: 0.3 };
}
