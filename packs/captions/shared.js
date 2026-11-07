// Captions on the voice. The words come from the transcript (--words) when there is one: its own words, or the
// `text` you give timed to it. Without a transcript, `text` runs at an even pace. *Starred* words and the ones
// listed in `accents` are the accent.

/** Words with *marks* → [{ word, marked }]. */
function markedWords(str) {
  const out = [];
  String(str || "").split(/\s+/).filter(Boolean).forEach(function (w) {
    const m = /^\*(.*)\*([.,!?;:]*)$/.exec(w);
    out.push(m ? { word: m[1] + m[2], marked: true } : { word: w.replace(/\*/g, ""), marked: false });
  });
  return out;
}

/** A word reduced to letters and digits, to compare it with another. */
function plainWord(w) {
  return String(w || "").toLowerCase().replace(/[^a-z0-9%À-ɏЀ-ӿऀ-ॿ]/g, "");
}

/** The case a caption is set in: "upper", "lower", "as typed", or the brand's own ("style"). */
function inCase($, str, mode) {
  if (mode === "upper") return String(str).toUpperCase();
  if (mode === "lower") return String(str).toLowerCase();
  if (mode === "style") return $.case(String(str));
  return String(str);
}

/**
 * The words to caption, each with when it is said: [{ w, s, e, accent, i }]. With a transcript and no text, the
 * transcript's own words; with text, its words timed to the voice ($.sync) or, without a transcript, one every
 * `pace` seconds from `start`. A word ends when the next one starts (its own end for the last).
 */
function captionWords($, p, start) {
  const accents = String(p.accents || "").split(/[,\s]+/).map(plainWord).filter(Boolean);
  const marked = markedWords(String(p.text || ""));
  let ws;
  if (!marked.length && $.words.length) {
    // A transcript's words keep their own times; `start` only paces text without one.
    ws = $.words.map(function (w) { return { w: String(w.w), s: w.s, e: w.e, accent: false }; });
  } else if (marked.length) {
    const times = $.words.length
      ? $.sync([marked.map(function (m) { return m.marked ? "*" + m.word + "*" : m.word; }).join(" ")], 0, 0)[0].map(function (r) { return r.at; })
      : marked.map(function (m, i) { return start + i * Math.max(0.05, Number(p.pace) || 0.3); });
    ws = marked.map(function (m, i) { return { w: m.word, s: times[i], e: NaN, accent: m.marked }; });
  } else return [];
  return ws.map(function (w, i) {
    const next = ws[i + 1];
    const e = next ? Math.max(w.s + 0.05, next.s) : isFinite(w.e) && w.e > w.s ? w.e : w.s + Math.max(0.35, Number(p.pace) || 0.3);
    return { w: inCase($, w.w, p.case), s: w.s, e: e, end: isFinite(w.e) ? w.e : e, accent: w.accent || accents.indexOf(plainWord(w.w)) >= 0, i: i };
  });
}

/**
 * Words grouped the way captions read: at most `maxChars` characters and `maxWords` words a group, a new group
 * after a sentence ends or at a pause in the voice.
 */
function phrases(ws, maxChars, maxWords) {
  const out = [];
  let cur = [], len = 0;
  ws.forEach(function (w, i) {
    const prev = ws[i - 1];
    const pause = prev && w.s - prev.end > 0.45;
    const ended = prev && /[.!?…]["”’)]*$/.test(prev.w);
    // A sentence's last word stays with the words before it when it nearly fits, rather than standing alone.
    const lastOfSentence = /[.!?…]["”’)]*$/.test(w.w) || !ws[i + 1];
    const full = len + 1 + w.w.length > maxChars * (lastOfSentence ? 1.3 : 1) || cur.length >= maxWords + (lastOfSentence ? 1 : 0);
    if (cur.length && (full || pause || ended)) {
      out.push(cur);
      cur = [];
      len = 0;
    }
    len += (cur.length ? 1 : 0) + w.w.length;
    cur.push(w);
  });
  if (cur.length) out.push(cur);
  return out;
}

/**
 * The group on screen at t: { words, start, end, k } — on from just before its first word until the next group
 * starts (or `hold` seconds after its last word ends), k its index.
 */
function groupAt(groups, t, hold) {
  for (let k = groups.length - 1; k >= 0; k--) {
    const g = groups[k], start = g[0].s - 0.06;
    if (t < start) continue;
    const next = groups[k + 1];
    const end = next ? next[0].s - 0.06 : g[g.length - 1].end + (hold || 0.6);
    return t < end ? { words: g, start: start, end: end, k: k } : null;
  }
  return null;
}

/**
 * Words laid out in lines no wider than maxW, each line centred on cx, the first line's top at top:
 * { words: [{ …word, x, y, ww, line }], lines, h }.
 */
function lineUp($, ws, font, maxW, cx, top, lh) {
  const gap = font.size * (font.gap || 0.26);
  const lines = [];
  let cur = [], curW = 0;
  ws.forEach(function (w) {
    const ww = $.measure(w.w, font);
    if (cur.length && curW + gap + ww > maxW) {
      lines.push({ ws: cur, w: curW });
      cur = [];
      curW = 0;
    }
    curW += (cur.length ? gap : 0) + ww;
    cur.push({ w: w, ww: ww });
  });
  if (cur.length) lines.push({ ws: cur, w: curW });
  // Two lines are balanced: the break goes where the longer line is shortest, not where the first one runs out.
  if (lines.length === 2) {
    const all = lines[0].ws.concat(lines[1].ws);
    const width = function (us) { return us.reduce(function (a, u, i) { return a + u.ww + (i ? gap : 0); }, 0); };
    let best = null;
    for (let b = 1; b < all.length; b++) {
      const w1 = width(all.slice(0, b)), w2 = width(all.slice(b));
      if (w1 > maxW || w2 > maxW) continue;
      if (!best || Math.max(w1, w2) < best.m) best = { b: b, m: Math.max(w1, w2), w1: w1, w2: w2 };
    }
    if (best) {
      lines[0] = { ws: all.slice(0, best.b), w: best.w1 };
      lines[1] = { ws: all.slice(best.b), w: best.w2 };
    }
  }
  const out = [];
  lines.forEach(function (L, li) {
    let x = cx - L.w / 2;
    L.ws.forEach(function (u) {
      out.push(Object.assign({}, u.w, { x: x, y: top + li * font.size * lh, ww: u.ww, line: li }));
      x += u.ww + gap;
    });
  });
  return { words: out, lines: lines.length, widths: lines.map(function (L) { return L.w; }), h: font.size * (1 + (lines.length - 1) * lh) };
}

/** Where captions sit: the centre line of the block for "bottom", "center" or "top", clear of a phone app's interface at 9:16. */
function captionY($, A, position) {
  if (position === "top") return $.H * (A.tall ? 0.2 : 0.17);
  if (position === "center") return $.H * 0.5;
  return $.H * (A.tall ? 0.7 : A.wide ? 0.83 : 0.8);
}

/** A soft dark vignette over the frame's edges, for words over footage. */
function vignette($, a) {
  const id = $.uid("cvg"), W = $.W, H = $.H;
  $.def('<radialGradient id="' + id + '" cx="' + W / 2 + '" cy="' + H / 2 + '" r="' + Math.max(W, H) * 0.75 + '" gradientUnits="userSpaceOnUse"><stop offset="0.4" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="' + a + '"/></radialGradient>');
  return $.rect(0, 0, W, H, { fill: "url(#" + id + ")" });
}

/** An ease that overshoots a little and settles. */
function settle(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  x = Math.max(0, Math.min(1, x));
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/** A tick on every word as it is said, a pop on an accent. */
function wordCues(ws) {
  return ws.map(function (w, i) {
    return w.accent ? { at: w.s, kind: "pop", level: 0.75 } : { at: w.s, kind: "tick", level: 0.6, pitch: (i % 3) - 1 };
  });
}

/** The size multiplier for a `size` prop. */
function sizeOf(size) {
  return { small: 0.82, medium: 1, large: 1.22, huge: 1.45 }[size] || 1;
}

/**
 * The group on screen at t, laid out in lines at the caption position: { g, lay, font, maxW } or null.
 * o: role (the brand face), size, font (extra face settings), width (share of the safe width), lines, maxWords,
 * charW (a character's width in ems, to size phrases), lh, hold, position.
 */
function captionLines($, A, ws, t, o) {
  const font = Object.assign({}, $.font(o.role || "display"), o.font || {}, { size: o.size });
  const maxW = A.w * (o.width || (A.tall ? 0.9 : 0.78));
  const perLine = Math.max(6, Math.floor(maxW / (font.size * (o.charW || 0.58))));
  const g = groupAt(phrases(ws, perLine * (o.lines || 2), o.maxWords || 10), t, o.hold || 0.7);
  if (!g) return null;
  const lh = o.lh || 1.16;
  const probe = lineUp($, g.words, font, maxW, $.W / 2, 0, lh);
  const lay = lineUp($, g.words, font, maxW, $.W / 2, captionY($, A, o.position) - probe.h / 2, lh);
  return { g: g, lay: lay, font: font, maxW: maxW, lh: lh };
}

/** A group's markup with its entrance: it rises a touch and fades in as its first word comes. */
function groupIn($, g, t, s) {
  const e = $.E.out3($.clamp((t - g.start) / 0.16));
  return $.g({ op: $.clamp((t - g.start) / 0.08), transform: $.tf({ y: (1 - e) * 14 * $.k }) }, s);
}

/** A Gaussian blur filter (sx, sy in px, rounded to half pixels), defined once per frame; "" when there is none. */
function blurFilter($, cache, sx, sy) {
  const x = Math.round(Math.max(0, sx) * 2) / 2, y = Math.round(Math.max(0, sy === undefined ? sx : sy) * 2) / 2;
  if (x + y < 0.5) return "";
  const key = x + "x" + y;
  if (!cache[key]) {
    cache[key] = $.uid("cb");
    $.def('<filter id="' + cache[key] + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + x + " " + y + '"/></filter>');
  }
  return 'filter="url(#' + cache[key] + ')"';
}

/** The words of a sentence-length group with their own faces and sizes, set on shared baselines and centred: [{ …word, x, y, ww, size, font, line }]. */
function lineUpMixed($, ws, fontFor, maxW, cx, cy, lh) {
  const items = ws.map(function (w) { const f = fontFor(w); return { w: w, f: f, ww: $.measure(w.w, f) }; });
  // A face's `pad` (px) keeps extra room on both sides of its words, for marks drawn round them.
  const gapOf = function (a, b) { return Math.max(a.f.size, b.f.size) * 0.24 + (a.f.pad || 0) + (b.f.pad || 0); };
  const lines = [];
  let cur = [], curW = 0;
  items.forEach(function (it) {
    const add = cur.length ? gapOf(cur[cur.length - 1], it) + it.ww : it.ww;
    if (cur.length && curW + add > maxW) { lines.push({ items: cur, w: curW }); cur = []; curW = 0; }
    curW += cur.length ? gapOf(cur[cur.length - 1], it) + it.ww : it.ww;
    cur.push(it);
  });
  if (cur.length) lines.push({ items: cur, w: curW });
  // Baselines: each line one line-height (of its biggest word) below the last; then the block is centred on cy.
  const sizes = lines.map(function (L) { return Math.max.apply(null, L.items.map(function (it) { return it.f.size; })); });
  const bases = [];
  sizes.forEach(function (sz, i) { bases.push(i ? bases[i - 1] + sz * lh : sz * 0.8); });
  const top = 0, bottom = bases[bases.length - 1] + sizes[sizes.length - 1] * 0.22;
  const shift = cy - (top + bottom) / 2;
  const out = [];
  lines.forEach(function (L, li) {
    let x = cx - L.w / 2;
    L.items.forEach(function (it, j) {
      if (j) x += gapOf(L.items[j - 1], it);
      out.push(Object.assign({}, it.w, { x: x, y: bases[li] + shift - it.f.size * 0.8, ww: it.ww, size: it.f.size, font: it.f, line: li }));
      x += it.ww;
    });
  });
  return out;
}

// ———— Caption looks: line captions described by a spec, and lockups built around a key word ————

/** The word a group is built around: a starred or listed word, else the longest one. */
function keyIndex(words) {
  const marked = words.findIndex(function (w) { return w.accent; });
  if (marked >= 0) return marked;
  let best = 0;
  words.forEach(function (w, i) { if (plainWord(w.w).length > plainWord(words[best].w).length) best = i; });
  return best;
}

/** A look's face at a size: { family | role, weight, italic, ls (em), scale, pad (em of room either side, for swashes) }. */
function lookFont($, f, size) {
  const base = f.role ? $.font(f.role) : { family: f.family || "Inter", weight: f.weight || 700 };
  return Object.assign({}, base, f.family ? { family: f.family } : {}, f.weight ? { weight: f.weight } : {}, { italic: !!f.italic, ls: f.ls || 0, size: size * (f.scale || 1), pad: size * (f.pad || 0) });
}

/** A look's colour, swapped for the brand's accents when `palette` is "brand". */
function lookColor($, L, x) {
  if ($.data.palette !== "brand" || !x) return x;
  if (x === L.hero) return $.c.accent;
  if (x === L.hero2) return $.c.accent2;
  return x;
}

/**
 * Line captions from a look spec. L: size [tall, wide, square], font, rows (two faces, one per row, split at
 * `split` of the characters), first / accent / alt (a face for the first word / the starred or key word / every other word,
 * with fill and glow; a face that names `upper` or `lower` sets its own case),
 * colors { said, current, upcoming (null hides them), upOp, key }, stroke { color, w, cur } (em), glow { color, blur, op },
 * card { fill, r, px, py }, bars { fill }, box { fill, r }, underline { color }, enter (pop | rise | fade), shadow, maxWords,
 * charW, lh, hero / hero2 (the colours `palette: brand` swaps).
 */
function lineLook(t, $, L) {
  const p = $.data, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? L.size[0] : A.wide ? L.size[1] : L.size[2]) * k * sizeOf(p.size);
  const maxW = A.w * (A.tall ? 0.9 : 0.78);
  const col = function (x) { return lookColor($, L, x); };
  const perLine = Math.max(6, Math.floor(maxW / (size * (L.charW || 0.58))));
  const g = groupAt(phrases(ws, Math.floor(perLine * (L.rows ? 1.7 : 2)), L.maxWords || 8), t, 0.7);
  if (!g) return "";
  const ki = keyIndex(g.words);
  const up = function (s, f) { return f && f.upper ? String(s).toUpperCase() : f && f.lower ? String(s).toLowerCase() : s; };
  let split = g.words.length;
  if (L.rows) {
    const total = g.words.reduce(function (a, w) { return a + w.w.length; }, 0);
    let acc = 0;
    split = 1;
    for (let i = 0; i < g.words.length - 1; i++) { acc += g.words[i].w.length; split = i + 1; if (acc >= total * (L.split || 0.5)) break; }
  }
  const specOf = function (i, w) {
    if (L.accent && (w.accent || (L.accent.auto && i === ki))) return L.accent;
    if (L.first && i === 0) return L.first;
    if (L.alt && i % 2 === 1) return L.alt;
    return L.rows ? L.rows[i < split ? 0 : 1] : L.font;
  };
  const words = g.words.map(function (w, i) { const f = specOf(i, w); return Object.assign({}, w, { i: i, spec: f, key: i === ki, w: up(w.w, "upper" in f || "lower" in f ? f : L.font) }); });
  let lay;
  if (L.rows) {
    // Two rows, each centred and cut down to fit; the block centred on the caption line.
    const rows = [words.slice(0, split), words.slice(split)].filter(function (r) { return r.length; });
    const laid = rows.map(function (r) {
      let s = 1, out;
      for (let n = 0; n < 2; n++) {
        out = lineUpMixed($, r, function (w) { return lookFont($, w.spec, size * s); }, 1e9, W / 2, 0, 1);
        const wide = out[out.length - 1].x + out[out.length - 1].ww - out[0].x;
        if (wide <= maxW) break;
        s *= maxW / wide;
      }
      return out;
    });
    const hs = laid.map(function (r) { return Math.max.apply(null, r.map(function (u) { return u.size; })); });
    const gap = size * 0.12;
    const total = hs.reduce(function (a, h) { return a + h; }, 0) + gap * (hs.length - 1);
    let y = captionY($, A, p.position) - total / 2;
    lay = [];
    laid.forEach(function (r, ri) {
      const shift = y - Math.min.apply(null, r.map(function (u) { return u.y; }));
      r.forEach(function (u) { lay.push(Object.assign({}, u, { y: u.y + shift, line: ri })); });
      y += hs[ri] + gap;
    });
  } else {
    lay = lineUpMixed($, words, function (w) { return lookFont($, w.spec, size); }, maxW, W / 2, captionY($, A, p.position), L.lh || 1.18);
  }
  let ci = -1;
  lay.forEach(function (u, j) { if (t >= u.s - 0.03) ci = j; });
  const C = L.colors || {};
  const blurs = {};
  let back = "", glow = "", front = "";
  // Behind the words: one card, a bar per line, or a box under the word being said.
  const ext = function (us) {
    return { x0: Math.min.apply(null, us.map(function (u) { return u.x; })), x1: Math.max.apply(null, us.map(function (u) { return u.x + u.ww; })),
      y0: Math.min.apply(null, us.map(function (u) { return u.y; })), y1: Math.max.apply(null, us.map(function (u) { return u.y + u.size; })) };
  };
  if (L.card) {
    const e = ext(lay), px = size * L.card.px, py = size * L.card.py;
    back += $.rect(e.x0 - px, e.y0 - py, e.x1 - e.x0 + px * 2, e.y1 - e.y0 + py * 2, { r: size * L.card.r, fill: col(L.card.fill) });
  }
  if (L.bars) {
    const lines = {};
    lay.forEach(function (u) { (lines[u.line] = lines[u.line] || []).push(u); });
    Object.keys(lines).forEach(function (li) {
      const e = ext(lines[li]), px = size * 0.18;
      const grow = $.E.out3($.clamp((t - g.start - li * 0.08) / 0.22));
      back += $.rect(e.x0 - px, e.y0 - size * 0.04, (e.x1 - e.x0 + px * 2) * grow, e.y1 - e.y0 + size * 0.14, { r: size * 0.04, fill: col(L.bars.fill) });
    });
  }
  if (L.box && ci >= 0) {
    const cur = lay[ci], prev = lay[ci - 1], pad = size * 0.14;
    const bx = function (u) { return { x: u.x - pad, y: u.y - pad * 0.5, w: u.ww + pad * 2, h: u.size * 1.1 + pad }; };
    const b = bx(cur), e = $.E.out3($.clamp((t - cur.s + 0.03) / 0.12));
    const a = prev && prev.line === cur.line ? bx(prev) : b;
    back += $.rect($.lerp(a.x, b.x, e), $.lerp(a.y, b.y, e), $.lerp(a.w, b.w, e), $.lerp(a.h, b.h, e), { r: size * (L.box.r || 0.12), fill: col(L.box.fill) });
  }
  lay.forEach(function (u, j) {
    const said = j <= ci, cur = j === ci, since = t - (u.s - 0.03);
    if (!said && C.upcoming === null) return;
    const rowFill = u.spec.fill;
    let fill = rowFill || C.said || "#FFFFFF", op = 1;
    if (!said) { fill = rowFill || C.upcoming || fill; op = C.upOp === undefined ? 0.4 : C.upOp; }
    if (cur && C.current) fill = C.current;
    if (u.key && C.key && said) fill = C.key;
    if (u.accent && C.accent) fill = C.accent;
    fill = col(fill);
    let tf = null;
    if (said && L.enter === "pop") tf = { s: 1 + 0.28 * (1 - settle(since / 0.2)) };
    if (said && L.enter === "rise") { const e = $.E.out3($.clamp(since / 0.3)); tf = { y: (1 - e) * u.size * 0.28 }; op *= $.clamp(since / 0.2); }
    if (said && L.enter === "fade") op *= $.clamp(since / 0.15);
    const font = Object.assign({}, u.font, { x: u.x, y: u.y, fill: fill, op: op });
    const stroke = u.spec.stroke || L.stroke;
    if (stroke) Object.assign(font, { stroke: stroke.color, sw: u.size * (cur && stroke.cur ? stroke.cur : stroke.w) });
    const wrap = function (m) { return tf ? $.g({ transform: $.tf(Object.assign({ ox: u.x + u.ww / 2, oy: u.y + u.size / 2 }, tf)) }, m) : m; };
    const gl = u.spec.glow || L.glow;
    if (gl && said) {
      const blur = blurFilter($, blurs, u.size * gl.blur);
      glow += $.g({ extra: blur }, wrap($.text(u.w, Object.assign({}, u.font, { x: u.x, y: u.y, fill: col(gl.color === "self" ? fill : gl.color), op: (gl.op || 0.8) * op }))));
    }
    front += wrap($.text(u.w, font));
    if (cur && L.underline) {
      const e = $.E.out3($.clamp(since / 0.16));
      front += $.rect(u.x, u.y + u.size * 1.04, u.ww * e, Math.max(3, u.size * 0.07), { r: u.size * 0.035, fill: col(L.underline.color) });
    }
  });
  let s = back + glow + front;
  if (L.shadow) s = $.g({ extra: 'filter="url(#mg-' + L.shadow + ')"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, groupIn($, g, t, s));
}

/** The group on screen at t split around its key word: { g, before, key, after } (null when nothing is said). */
function lockupAt($, t, A, maxWords) {
  const ws = captionWords($, $.data, $.beat("in", 0.05));
  if (!ws.length) return null;
  const g = groupAt(phrases(ws, A.tall ? 26 : 34, maxWords || 5), t, 0.6);
  if (!g) return null;
  const ki = keyIndex(g.words);
  return { g: g, before: g.words.slice(0, ki), key: g.words[ki], after: g.words.slice(ki + 1) };
}

/** A run of words in one face from x (anchor start | end | middle) with its top at y, each fading in as it is said. */
function lockRun($, t, words, f, x, y, anchor, fill, upper) {
  const text = function (w) { return upper ? String(w.w).toUpperCase() : w.w; };
  // The space between words (f.gap in ems, 0.26 by default), plus the tracking a spaced face carries after its last letter.
  const gap = f.size * ((f.gap || 0.26) + Math.max(0, f.ls || 0));
  const widths = words.map(function (w) { return $.measure(text(w), f); });
  const total = widths.reduce(function (a, w) { return a + w; }, 0) + gap * Math.max(0, words.length - 1);
  let cx = anchor === "end" ? x - total : anchor === "middle" ? x - total / 2 : x;
  // Kept inside the safe area: a run that would cross its edge slides back in.
  const A = safeArea($);
  cx = Math.max(A.x, Math.min(cx, A.x + A.w - total));
  let s = "";
  words.forEach(function (w, i) {
    const since = t - (w.s - 0.03);
    if (since >= 0) {
      const e = $.E.out3($.clamp(since / 0.25));
      s += $.text(text(w), Object.assign({}, f, { x: cx, y: y + (1 - e) * f.size * 0.25, fill: fill, op: $.clamp(since / 0.15) }));
    }
    cx += widths[i] + gap;
  });
  return { s: s, w: total };
}

/** The key word's own entrance: in from a little bigger, settled. */
function keyIn($, t, key, cx, cy) {
  const since = t - (key.s - 0.03);
  return { show: since >= 0, tf: $.tf({ s: 1 + 0.18 * (1 - settle(since / 0.26)), ox: cx, oy: cy }), op: $.clamp(since / 0.08) };
}

/** How far a word is written at t: 0 until it is said, 1 once written — rate × its time, between 0.16 and 0.6 s. */
function writeP($, t, u, rate) {
  const dur = Math.max(0.16, Math.min(0.6, (u.end - u.s) * (rate || 0.9)));
  return $.clamp((t - (u.s - 0.03)) / dur);
}

/** A word's markup written on left to right: clipped to the first q (0–1) of its width, with room round it for a script's swashes. */
function writeOn($, u, size, q, markup) {
  if (q >= 1) return markup;
  if (q <= 0) return "";
  const pad = size * 0.5;
  return $.clip(u.x - pad, u.y - size * 0.7, pad + u.ww * q, size * 2.4, 0, markup);
}
