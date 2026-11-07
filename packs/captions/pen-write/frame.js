// Words written on in a signature script as they are said, a glowing pen tip leading the stroke and a swoosh drawn under the line.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 124 : A.wide ? 100 : 112) * k * sizeOf(p.size);
  const C = captionLines($, A, ws, t, { size: size, font: { family: "Mr Dafoe", weight: 400, ls: 0 }, charW: 0.52, lines: 2, maxWords: 6, lh: 1.05, position: p.position });
  if (!C) return "";
  const blush = p.palette === "brand" ? c.accent : "#FFC7DE";
  const blurs = {};
  let s = "", tip = "";
  C.lay.words.forEach(function (u) {
    const q = writeP($, t, u, 0.9);
    if (q <= 0) return;
    s += writeOn($, u, size, q, $.text(u.w, Object.assign({}, C.font, { x: u.x, y: u.y, fill: u.accent ? blush : "#FFFFFF" })));
    // The nib rides the writing edge, bobbing with the letters.
    if (q < 1) {
      const px = u.x + u.ww * q, py = u.y + size * (0.62 + 0.13 * Math.sin(q * Math.PI * 7));
      tip = $.circle(px, py, size * 0.06, { fill: blush, op: 0.85, extra: blurFilter($, blurs, size * 0.06) }) + $.circle(px, py, size * 0.022, { fill: "#FFFFFF" });
    }
  });
  // Once the last word is written, a swoosh is drawn under its line.
  const lay = C.lay.words, last = lay[lay.length - 1];
  const done = t - (last.s - 0.03 + Math.max(0.16, Math.min(0.6, (last.end - last.s) * 0.9)));
  if (done > 0) {
    const row = lay.filter(function (u) { return u.line === last.line; });
    const x0 = row[0].x, x1 = last.x + last.ww, y = last.y + size * 1.0;
    const d = "M" + (x0 - size * 0.1) + " " + (y + size * 0.06) + " C" + (x0 + (x1 - x0) * 0.35) + " " + (y - size * 0.1) + " " + (x0 + (x1 - x0) * 0.7) + " " + (y + size * 0.12) + " " + (x1 + size * 0.3) + " " + (y - size * 0.1);
    s += $.path(d, { stroke: blush, sw: size * 0.035, draw: $.E.out3($.clamp(done / 0.4)) });
  }
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, groupIn($, C.g, t, $.g({ extra: 'filter="url(#mg-sm)"' }, s + tip)));
}
