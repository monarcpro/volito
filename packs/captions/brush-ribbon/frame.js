// Brush-script words in white on a ragged teal ribbon that paints in behind each line, the words popping on in time.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 84 : A.wide ? 68 : 76) * k * sizeOf(p.size);
  const C = captionLines($, A, ws, t, { size: size, font: { family: "Kaushan Script", weight: 400, ls: 0 }, charW: 0.55, lines: 2, maxWords: 7, lh: 1.32, position: p.position });
  if (!C) return "";
  const brand = p.palette === "brand";
  const teal = brand ? c.accent : "#0E9AA7", deep = brand ? $.mix(c.accent, "#000000", 0.35) : "#08636D";
  let back = "", s = "";
  for (let li = 0; li < C.lay.lines; li++) {
    const row = C.lay.words.filter(function (u) { return u.line === li; });
    const x0 = row[0].x - size * 0.42, x1 = row[row.length - 1].x + row[row.length - 1].ww + size * 0.42;
    const y0 = row[0].y + size * 0.02, y1 = row[0].y + size * 1.2;
    // A ragged brush edge: the top and bottom wander, the ends are cut on a slant.
    const n = 14, seed = li * 31 + C.g.k * 7;
    let d = "M" + (x0 + size * 0.12) + " " + y0;
    for (let i = 1; i <= n; i++) d += " L" + (x0 + ((x1 - x0) * i) / n) + " " + (y0 + ($.hash(seed + i) - 0.5) * size * 0.1);
    d += " L" + (x1 - size * 0.1) + " " + y1;
    for (let i = n - 1; i >= 0; i--) d += " L" + (x0 + ((x1 - x0) * i) / n) + " " + (y1 + ($.hash(seed + 50 + i) - 0.5) * size * 0.1);
    d += " Z";
    // Each line's ribbon paints in as its first word comes.
    const e = $.E.out3($.clamp((t - Math.max(C.g.start, row[0].s - 0.12)) / 0.32));
    if (e > 0) {
      const ribbon = $.path(d, { fill: deep, transform: "translate(" + size * 0.06 + " " + size * 0.08 + ")" }) + $.path(d, { fill: teal });
      back += $.clip(x0 - size * 0.2, y0 - size * 0.3, (x1 - x0 + size * 0.4) * e, y1 - y0 + size * 0.6, 0, ribbon);
    }
  }
  C.lay.words.forEach(function (u) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    const sc = 1 + 0.32 * (1 - settle(since / 0.2));
    s += $.g({ op: $.clamp(since / 0.06), transform: $.tf({ s: sc, ox: u.x + u.ww / 2, oy: u.y + size * 0.6 }) }, $.text(u.w, Object.assign({}, C.font, { x: u.x, y: u.y, fill: u.accent ? "#FFE66D" : "#FFFFFF" })));
  });
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, groupIn($, C.g, t, $.g({ extra: 'filter="url(#mg-sm)"' }, back + s)));
}
