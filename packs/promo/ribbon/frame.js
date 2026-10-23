function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = "";
  const D = Math.hypot(W, H), th = Math.min(W, H) * 0.1;
  const tapes = [[p.text, -9, c.accent, 0.42], [p.text2, 7, c.accent2, 0.62]].filter(function (q) { return q[0]; });
  tapes.forEach(function (q, i) {
    const str = $.case(q[0]), f = Object.assign({}, $.font("display"), { size: th * 0.5, ls: 0.02 });
    const sep = "  •  ", unit = $.measure(str + sep, f), dir = i ? -1 : 1, off = (((t * 160 * k * p.speed * dir) % unit) + unit) % unit;
    let row = $.rect(-D / 2, -th / 2, D, th, { fill: q[2] }) + $.rect(-D / 2, -th / 2 + 6 * k, D, 3 * k, { fill: $.rgba($.on(q[2]), 0.5) }) + $.rect(-D / 2, th / 2 - 9 * k, D, 3 * k, { fill: $.rgba($.on(q[2]), 0.5) });
    for (let x = -D / 2 - unit + off; x < D / 2 + unit; x += unit) row += $.text(str + sep, Object.assign({}, f, { within: { x: -1e5, y: -1e5, w: 2e5, h: 2e5 }, x: x, y: -f.size * 0.56, fill: $.on(q[2]) }));
    const cy = H * q[3];
    s += M.part("tapes", { at: tin + i * 0.2, in: "wipe", from: i ? "right" : "left", dur: 0.5, box: { x: 0, y: cy - th, w: W, h: th * 2 } }, '<g transform="translate(' + W / 2 + " " + cy + ") rotate(" + q[1] + ')">' + row + "</g>");
  });
  return s;
}
