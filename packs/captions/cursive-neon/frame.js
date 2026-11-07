// A neon sign in a flowing script: each word's pink tube buzzes on as it is said, the words still to come in dark glass, the key word in blue.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 104 : A.wide ? 84 : 94) * k * sizeOf(p.size);
  const C = captionLines($, A, ws, t, { size: size, font: { family: "Yellowtail", weight: 400, ls: 0 }, charW: 0.46, lines: 2, maxWords: 7, lh: 1.1, position: p.position });
  if (!C) return "";
  const pink = p.palette === "brand" ? c.accent : "#FF4FA3", blue = p.palette === "brand" ? c.accent2 : "#4FD8FF";
  const key = C.g.words[keyIndex(C.g.words)];
  const blurs = {};
  let glass = "", glow = "", tubes = "";
  C.lay.words.forEach(function (u) {
    const f = Object.assign({}, C.font, { x: u.x, y: u.y });
    const since = t - (u.s - 0.03);
    // Unlit: the bare glass tube, faint.
    if (since < 0) { glass += $.text(u.w, Object.assign({}, f, { fill: "none", stroke: "#FFFFFF", sw: size * 0.02, op: 0.24 })); return; }
    const col = u.accent || u.i === key.i ? blue : pink;
    // The tube buzzes on for a quarter of a second, then holds with a faint hum.
    const lit = since > 0.26 ? 0.95 + 0.05 * Math.sin(t * 40 + u.i * 2.1) : $.hash(Math.floor(t * 30) * 7.1 + u.i) < 0.3 + since * 2.8 ? 1 : 0.12;
    glow += $.text(u.w, Object.assign({}, f, { fill: col, stroke: col, sw: size * 0.06, op: lit }));
    tubes += $.text(u.w, Object.assign({}, f, { fill: "#FFF6FB", stroke: col, sw: size * 0.05, op: Math.max(0.3, lit) }));
  });
  const s = glass + $.g({ op: 0.5, extra: blurFilter($, blurs, size * 0.38) }, glow) + $.g({ op: 0.9, extra: blurFilter($, blurs, size * 0.1) }, glow) + tubes;
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, groupIn($, C.g, t, s));
}
