// A left-aligned stack of slanted condensed capitals with the key word circled in yellow marker, and an optional handwritten note beneath.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 6);
  if (!L) return "";
  const words = L.g.words;
  const size = (A.tall ? 110 : A.wide ? 88 : 98) * k * sizeOf(p.size);
  const f = { family: "Anton", weight: 400, ls: 0.01, size: size };
  const x0 = A.x + A.w * (A.tall ? 0.1 : 0.22), maxW = A.w * (A.tall ? 0.78 : 0.5);
  // Lines, left-aligned, as many words as fit.
  const gap = size * 0.24, lines = [];
  let cur = [], curW = 0;
  words.forEach(function (w, i) {
    const ww = $.measure(String(w.w).toUpperCase(), f);
    if (cur.length && curW + gap + ww > maxW) { lines.push(cur); cur = []; curW = 0; }
    curW += (cur.length ? gap : 0) + ww;
    cur.push({ w: w, ww: ww, i: i });
  });
  if (cur.length) lines.push(cur);
  const lh = size * 1.02, note = String(p.note || "").trim();
  const total = lines.length * lh + (note ? size * 0.55 : 0);
  let y = captionY($, A, p.position) - total / 2, s = "", ring = "", keyBox = null;
  const ki = words.indexOf(L.key);
  lines.forEach(function (ln) {
    let x = x0;
    ln.forEach(function (it) {
      s += lockRun($, t, [it.w], f, x, y, "start", "#FFFFFF", true).s;
      if (it.i === ki) keyBox = { x: x, y: y, w: it.ww };
      x += it.ww + gap;
    });
    y += lh;
  });
  // The marker ring round the key word, drawn on once it is said.
  const since = t - (L.key.s + 0.08);
  if (keyBox && since > 0) {
    const yellow = p.palette === "brand" ? c.accent : "#FFD23F";
    const cx = keyBox.x + keyBox.w / 2, cy = keyBox.y + size * 0.55, rx = keyBox.w / 2 + size * 0.28, ry = size * 0.62;
    const d = "M" + (cx - rx * 0.6) + " " + (cy - ry * 0.95) + " C" + (cx + rx * 1.1) + " " + (cy - ry * 1.25) + " " + (cx + rx * 1.15) + " " + (cy + ry * 1.05) + " " + cx + " " + (cy + ry) +
      " C" + (cx - rx * 1.2) + " " + (cy + ry * 0.95) + " " + (cx - rx * 1.1) + " " + (cy - ry * 1.15) + " " + (cx + rx * 0.2) + " " + (cy - ry * 1.05);
    ring = $.path(d, { stroke: yellow, sw: size * 0.07, draw: $.E.out3($.clamp(since / 0.4)) });
  }
  if (note) {
    const last = words[words.length - 1];
    s += lockRun($, t, [{ w: note, s: last.end + 0.1, e: last.end + 0.6 }], { family: "Caveat", weight: 700, ls: 0, size: size * 0.42 }, x0 + size * 0.1, y + size * 0.05, "start", "#FFFFFF").s;
  }
  // A slant, like italic capitals.
  s = '<g transform="translate(' + x0 + " " + y + ") skewX(-9) translate(" + -x0 + " " + -y + ')">' + s + "</g>";
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, $.g({ extra: 'filter="url(#mg-sm)"' }, s + ring)));
}
