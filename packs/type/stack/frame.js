function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.2);
  let s = ground(M, $, t);
  const rows = (p.lines || []).map(function (l) { const m = /^\*(.*)\*$/.exec(String(l).trim()); return m ? { text: m[1], acc: true } : { text: $.case(String(l).trim()), acc: false }; }).filter(function (r) { return r.text; });
  if (!rows.length) return s;
  const maxH = (A.h * 0.92) / rows.length;
  const sized = rows.map(function (r) { return fitFont($, r.text, r.acc ? "accent" : "display", maxH / 1.0, A.w * 0.92, { ls: r.acc ? -0.01 : -0.04 }); });
  const total = sized.reduce(function (a, f) { return a + f.size * 0.98; }, 0);
  let y = H / 2 - total / 2;
  rows.forEach(function (r, i) {
    const f = sized[i];
    s += M.text("lines", Object.assign({ at: tin + i * 0.16, in: "slide", from: i % 2 ? "right" : "left", distance: 60 }, f, { x: W / 2, y: y - f.size * 0.06, anchor: "middle", fill: r.acc ? c.accent : c.fg }), r.text);
    y += f.size * 0.98;
    if (i < rows.length - 1) s += M.part("rules", { at: tin + i * 0.16 + 0.25, in: "grow-x", origin: "center", box: { x: A.x, y: y - 2 * k, w: A.w, h: 4 * k } }, $.rect(A.x + A.w * 0.2, y - 1.5 * k, A.w * 0.6, 3 * k, { fill: $.rgba(c.fg, 0.35) }));
  });
  return s;
}
