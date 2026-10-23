function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.2);
  let s = ground(M, $, t);
  const str = $.case(p.text), n = Math.max(1, Math.round(p.bands));
  const D = Math.hypot(W, H), bandH = Math.min(H, W) * (n === 1 ? 0.3 : 0.62 / n + 0.06);
  const f = Object.assign({}, $.font("display"), { size: bandH * 0.64, ls: -0.02 });
  const sep = "  •  ", unit = $.measure(str + sep, f);
  let out = "";
  for (let i = 0; i < n; i++) {
    const y = (i - (n - 1) / 2) * bandH * 1.12, solid = i % 2 === 0;
    const dir = i % 2 ? -1 : 1, off = (((t * 140 * k * p.speed * dir) % unit) + unit) % unit;
    let row = "";
    for (let x = -D / 2 - unit + off; x < D / 2 + unit; x += unit) row += $.text(str + sep, Object.assign({}, f, { within: { x: -1e5, y: -1e5, w: 2e5, h: 2e5 }, x: x, y: y - f.size * 0.56, fill: solid ? $.on(c.accent) : "none", stroke: solid ? undefined : c.fg, sw: solid ? undefined : 2.6 * k }));
    const band = (solid ? $.rect(-D / 2, y - bandH / 2, D, bandH, { fill: c.accent }) : "") + row;
    out += M.part("bands", { at: tin + i * 0.12, in: "slide", from: i % 2 ? "right" : "left", distance: 160, box: { x: -D / 2, y: y - bandH / 2, w: D, h: bandH } }, band);
  }
  s += '<g transform="translate(' + W / 2 + " " + H / 2 + ") rotate(" + p.angle + ')">' + out + "</g>";
  return s;
}
