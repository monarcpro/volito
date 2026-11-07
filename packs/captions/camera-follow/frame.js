// Each sentence is written across a canvas far bigger than the frame, and a camera follows the words as they
// are said. "grow": every word lands a step bigger than the last, beside it or on a new row, and the camera pulls
// back to keep the newest word the same size on screen, so the sentence shrinks away behind it. "track": the
// words sit in lines like a page and the camera glides along them. At each sentence's end the camera pulls back
// to show it whole, then flies on to the next one.

const WORLD = { x: -1e7, y: -1e7, w: 2e7, h: 2e7 };

function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.15);
  let s = "";
  if (p.ground === "panel") s += M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  else if (p.ground !== "none") s += M.part("ground", { at: tin - 0.15, in: "fade", dur: 0.5, out: "fade", vary: false }, vignette($, 0.62));
  const ws = captionWords($, p, tin);
  if (!ws.length) return s;
  const plan = cameraPlan($, ws, A, p);
  const cam = cameraAt(plan.keys, t), was = cameraAt(plan.keys, t - 1 / 30);
  const ink = p.ground === "panel" ? c.fg : "#FFFFFF";
  // The sentence being said (earlier ones dim once the camera has moved on).
  let block = 0;
  plan.words.forEach(function (u) { if (t >= u.s - 0.06) block = u.block; });
  let words = "";
  plan.words.forEach(function (u) {
    const since = t - (u.s - 0.06);
    if (since < 0) return;
    const px = u.size * cam.sc;
    if (px < 1.2) return;
    const sx = (u.x - cam.fx) * cam.sc + W / 2, sy = (u.y - cam.fy) * cam.sc + H / 2;
    if (sx > W * 1.3 || sy > H * 1.3 || sx + u.ww * cam.sc < -W * 0.3 || sy + px < -H * 0.3) return;
    const op = $.clamp(since / 0.1) * (u.block < block ? 0.32 : 1);
    // Words are cropped by the frame on purpose here (the camera keeps the newest one inside it), so text is checked against the canvas.
    words += $.text(u.w, Object.assign({}, plan.font, { size: u.size, x: u.x, y: u.y, fill: u.accent ? c.accent : ink, op: op, within: WORLD }));
  });
  let g = '<g transform="translate(' + $.fx(W / 2) + " " + $.fx(H / 2) + ") scale(" + cam.sc.toPrecision(6) + ") translate(" + $.fx(-cam.fx) + " " + $.fx(-cam.fy) + ')">' + words + "</g>";
  // Motion blur along the camera's move: sideways for a pan, both ways for a zoom, gone when it settles.
  const amount = { off: 0, subtle: 0.45, standard: 1, heavy: 1.8 }[p.blur];
  const dz = Math.abs(Math.log(cam.sc / was.sc));
  const cap = 14 * k, f = amount === undefined ? 1 : amount;
  const bx = Math.min(cap, (Math.abs(cam.fx - was.fx) * cam.sc * 0.25 + dz * W * 0.05) * f);
  const by = Math.min(cap, (Math.abs(cam.fy - was.fy) * cam.sc * 0.25 + dz * H * 0.035) * f);
  if (bx + by > 0.8) {
    const id = $.uid("cfb");
    $.def('<filter id="' + id + '" filterUnits="userSpaceOnUse" x="' + -W * 0.1 + '" y="' + -H * 0.1 + '" width="' + W * 1.2 + '" height="' + H * 1.2 + '"><feGaussianBlur stdDeviation="' + (Math.round(bx * 2) / 2) + " " + (Math.round(by * 2) / 2) + '"/></filter>');
    g = '<g filter="url(#' + id + ')">' + g + "</g>";
  }
  if (p.ground === "none") g = $.g({ extra: 'filter="url(#mg-sm)"' }, g);
  return s + M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.3, outDur: 0.26, vary: false }, g);
}

/**
 * Where every word sits in the world and where the camera goes: { words, keys, font }. Sentences (at most twelve
 * words) are blocks laid side by side; each word is a camera move, and each block ends with a pull-back.
 */
function cameraPlan($, ws, A, p) {
  const font = Object.assign({}, $.font("display"), { ls: -0.02 });
  const growth = { steady: 1.12, standard: 1.22, bold: 1.34 }[p.growth] || 1.22;
  const W = $.W, H = $.H;
  const words = [], boxes = [];
  let ox = 0;
  phrases(ws, 1e9, 12).forEach(function (b, bi) {
    const L = p.camera === "track" ? trackBlock($, b, font, A) : growBlock($, b, font, A, growth);
    L.words.forEach(function (u) { u.x += ox; u.block = bi; words.push(u); });
    boxes.push({ x: ox, y: 0, w: L.w, h: L.h });
    ox += L.w + Math.max(L.w, L.h) * 0.6;
  });
  // How big the newest word is on screen: its height against the frame (bigger on a phone).
  const frac = ({ tight: 0.21, standard: 0.155, wide: 0.11 }[p.framing] || 0.155) * (A.tall ? 1.3 : 1);
  // Grow: the newest word at the centre. Track: its whole line in frame, leaning a little towards the word.
  const target = function (u) {
    if (p.camera === "track") {
      const line = words.filter(function (v) { return v.block === u.block && v.y === u.y; });
      const x0 = line[0].x, x1 = line[line.length - 1].x + line[line.length - 1].ww;
      const sc = Math.min((Math.min(W, H) * frac) / u.size, (W * 0.86) / (x1 - x0));
      return { sc: sc, fx: (x0 + x1) / 2 + (u.x + u.ww / 2 - (x0 + x1) / 2) * 0.18, fy: u.y + u.size / 2 };
    }
    const sc = Math.min((Math.min(W, H) * frac) / u.size, (W * 0.84) / u.ww);
    return { sc: sc, fx: u.x + u.ww / 2, fy: u.y + u.size / 2 };
  };
  const whole = function (b) { return { sc: Math.min((W * 0.86) / b.w, (H * (A.tall ? 0.62 : 0.74)) / b.h), fx: b.x + b.w / 2, fy: b.y + b.h / 2 }; };
  const keys = [];
  words.forEach(function (u, i) {
    const next = words[i + 1];
    const gap = next ? next.s - u.s : 0.6;
    const dur = Math.max(0.2, Math.min(0.55, gap * 0.85));
    keys.push({ at: u.s - 0.04, dur: dur, to: target(u), word: true });
    const last = !next || next.block !== u.block;
    if (last && p.ending !== "hold") {
      // After the last word lands; the last sentence's pull-back settles before the clip fades.
      const at = u.s + dur * 0.7 + 0.1, room = (next ? next.s - 0.1 : $.dur - 0.35) - at;
      if (room > 0.3) keys.push({ at: at, dur: Math.min(0.9, room * 0.85), to: whole(boxes[u.block]), word: false });
    }
  });
  return { words: words, keys: keys, font: font };
}

/** A block where each word is a step bigger than the last: beside it while the row stays in shape, else on a new row below. */
function growBlock($, ws, font, A, growth) {
  const rowShape = A.tall ? 4.6 : A.wide ? 7 : 5.5;
  const items = [], rows = [];
  let size = 100, row = 0, rowW = 0, rowH = 0;
  ws.forEach(function (w, i) {
    if (i) size *= growth;
    const ww = $.measure(w.w, Object.assign({}, font, { size: size })), gap = size * 0.28;
    if (i && rowW + gap + ww > rowShape * Math.max(rowH, size)) {
      rows.push({ w: rowW, h: rowH });
      row++;
      rowW = 0;
      rowH = 0;
    }
    const x = rowW ? rowW + gap : 0;
    items.push({ w: w, row: row, x: x, ww: ww, size: size });
    rowW = x + ww;
    rowH = Math.max(rowH, size);
  });
  rows.push({ w: rowW, h: rowH });
  const tops = [];
  let y = 0;
  rows.forEach(function (r) { tops.push(y); y += r.h * 1.04; });
  // Words in a row stand on the same line.
  const out = items.map(function (it) { return Object.assign({}, it.w, { x: it.x, y: tops[it.row] + rows[it.row].h - it.size, ww: it.ww, size: it.size }); });
  return { words: out, w: Math.max.apply(null, rows.map(function (r) { return r.w; })), h: y - rows[rows.length - 1].h * 0.04 };
}

/** A block set like a page: one size, lines a few words wide. */
function trackBlock($, ws, font, A) {
  const size = 100, f = Object.assign({}, font, { size: size }), gap = size * 0.28, lh = size * 1.14;
  const maxW = size * (A.tall ? 6.5 : A.wide ? 11 : 8);
  const out = [];
  let x = 0, y = 0, w = 0;
  ws.forEach(function (wd) {
    const ww = $.measure(wd.w, f);
    if (x > 0 && x + gap + ww > maxW) { x = 0; y += lh; }
    if (x > 0) x += gap;
    out.push(Object.assign({}, wd, { x: x, y: y, ww: ww, size: size }));
    x += ww;
    w = Math.max(w, x);
  });
  return { words: out, w: w, h: y + size };
}

/** The camera at t: each move starts from wherever the last one had got to, eased to a stop. */
function cameraAt(keys, t) {
  const ease = function (x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 4); };
  const mix = function (a, b, e) {
    return { sc: Math.exp(Math.log(a.sc) + (Math.log(b.sc) - Math.log(a.sc)) * e), fx: a.fx + (b.fx - a.fx) * e, fy: a.fy + (b.fy - a.fy) * e };
  };
  let cur = keys[0].to, prevStart = keys[0].to;
  for (let j = 1; j < keys.length; j++) {
    const K = keys[j], P = keys[j - 1];
    if (t < K.at) break;
    const start = j === 1 ? keys[0].to : mix(prevStart, P.to, ease((K.at - P.at) / P.dur));
    cur = mix(start, K.to, ease((t - K.at) / K.dur));
    prevStart = start;
  }
  return cur;
}

/** A tick on every word when asked, and a soft whoosh as the camera pulls back on a sentence. */
function sound($) {
  const p = $.data, ws = captionWords($, p, $.beat("in", 0.15));
  if (!ws.length) return [];
  const plan = cameraPlan($, ws, safeArea($), p);
  const pulls = plan.keys.filter(function (K) { return !K.word; }).map(function (K) { return { at: K.at, kind: "whoosh", level: 0.45, pitch: -4, dur: Math.min(0.8, K.dur) }; });
  return (p.ticks ? wordCues(ws) : []).concat(pulls);
}
