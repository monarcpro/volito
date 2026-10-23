function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = "";
  s += M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const rows = (p.features || []).filter(Boolean).slice(0, 6);
  const tf = fitLines($, $.case(p.title), Object.assign({}, $.font("display"), { ls: -0.03 }), A.w * 0.9, Math.min(120 * k, A.h * 0.16), 50 * k, 2);
  const rf = Object.assign({}, $.font("text"), { size: Math.min(56 * k, (A.h * 0.62) / Math.max(1, rows.length) / 1.9), weight: 600 });
  const rowH = rf.size * 1.9, listW = Math.min(A.w * 0.9, widest($, rows, rf) + rf.size * 2.2);
  const total = tf.lines.length * tf.size * 1.05 + 50 * k + rows.length * rowH;
  let y = H / 2 - total / 2;
  tf.lines.forEach(function (l, i) { s += M.text("title", Object.assign({ at: tin + i * 0.1, in: "rise" }, tf.font, { x: W / 2, y: y + i * tf.size * 1.05, anchor: "middle", fill: c.fg }), l); });
  y += tf.lines.length * tf.size * 1.05 + 50 * k;
  const x0 = W / 2 - listW / 2, r = rf.size * 0.62;
  rows.forEach(function (row, i) {
    const a = tin + 0.5 + i * 0.32, cy = y + i * rowH + rowH / 2;
    const ck = $.E.out3($.seg(t, a + 0.15, a + 0.45));
    let g = $.circle(x0 + r, cy, r, { fill: c.accent }) + (ck > 0 ? $.path("M" + (x0 + r * 0.55) + " " + cy + "L" + (x0 + r * 0.88) + " " + (cy + r * 0.32) + "L" + (x0 + r * 1.48) + " " + (cy - r * 0.36), { stroke: $.on(c.accent), sw: r * 0.24, draw: ck }) : "");
    g += $.text(row, Object.assign({}, rf, { x: x0 + r * 2 + rf.size * 0.5, y: cy - rf.size * 0.56, fill: c.fg, maxW: listW - r * 3 }));
    if (i < rows.length - 1) g += $.rect(x0, y + (i + 1) * rowH - 1 * k, listW, 2 * k, { fill: c.line });
    s += M.part("rows", { at: a, in: "slide", from: "left", distance: 30, box: { x: x0, y: cy - rowH / 2, w: listW, h: rowH } }, g);
  });
  return s;
}
