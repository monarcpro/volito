// Fine lowercase script in white with the key word in gold, each word coming up out of a soft blur, and a hairline rule with a small diamond drawn out beneath.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05)).map(function (w) { return Object.assign({}, w, { w: String(w.w).toLowerCase() }); });
  if (!ws.length) return "";
  const size = (A.tall ? 118 : A.wide ? 94 : 106) * k * sizeOf(p.size);
  const C = captionLines($, A, ws, t, { size: size, font: { family: "Sacramento", weight: 400, ls: 0 }, charW: 0.36, lines: 2, maxWords: 7, lh: 0.95, position: p.position });
  if (!C) return "";
  const gold = p.palette === "brand" ? c.accent : "#E9C46A";
  const key = C.g.words[keyIndex(C.g.words)];
  const blurs = {};
  let s = "";
  C.lay.words.forEach(function (u) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    const e = $.clamp(since / 0.4), col = u.accent || u.i === key.i ? gold : "#FFFFFF";
    // A hairline face, thickened a touch with its own colour so it reads over footage.
    const word = $.text(u.w, Object.assign({}, C.font, { x: u.x, y: u.y + (1 - $.E.out3(e)) * size * 0.14, fill: col, stroke: col, sw: size * 0.012, op: $.clamp(since / 0.25) }));
    s += e < 1 ? $.g({ extra: blurFilter($, blurs, size * 0.07 * (1 - e)) }, word) : word;
  });
  // The rule: two hairlines growing out from a small diamond under the last line.
  const lay = C.lay.words, bottom = Math.max.apply(null, lay.map(function (u) { return u.y; })) + size * 1.42;
  const half = Math.min(Math.max.apply(null, C.lay.widths) / 2 + size * 0.2, A.w * 0.44);
  const e = $.E.inOut3($.clamp((t - C.g.start - 0.1) / 0.7)), dm = size * 0.055 * $.E.outBack($.clamp((t - C.g.start) / 0.3));
  if (e > 0) {
    const sw = Math.max(1.5, size * 0.014), cx = W / 2;
    s += $.line(cx - dm * 2, bottom, cx - dm * 2 - (half - dm * 2) * e, bottom, { stroke: gold, sw: sw }) + $.line(cx + dm * 2, bottom, cx + dm * 2 + (half - dm * 2) * e, bottom, { stroke: gold, sw: sw });
  }
  if (dm > 0) s += $.path("M" + W / 2 + " " + (bottom - dm) + " L" + (W / 2 + dm) + " " + bottom + " L" + W / 2 + " " + (bottom + dm) + " L" + (W / 2 - dm) + " " + bottom + " Z", { fill: gold });
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, groupIn($, C.g, t, $.g({ extra: 'filter="url(#mg-sm)"' }, s)));
}
