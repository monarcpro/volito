function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  let s = "";
  const tx = W * p.x / 100, ty = H * p.y / 100;
  const right = p.side === "right" || (p.side === "auto" && tx < W / 2);
  const up = ty > H * 0.4, dir = right ? 1 : -1;
  const tf = Object.assign({}, $.font("display"), { size: 46 * k }), df = Object.assign({}, $.font("text"), { size: 28 * k });
  const title = $.case(p.title), maxW = Math.min(W * 0.4, 560 * k);
  const dl = p.detail ? $.wrap(p.detail, maxW, df).slice(0, 3) : [];
  const cw = Math.min(maxW, Math.max($.measure(title, tf), widest($, dl, df))) + 56 * k, ch = 40 * k + tf.size * 1.1 + (dl.length ? 14 * k + dl.length * df.size * 1.3 : 0) + 4 * k;
  // An elbow: out at 45° for d1, then level to the card.
  const d1 = Math.min(W, H) * 0.14, ex = tx + dir * d1, ey = ty + (up ? -d1 : d1);
  let cx = right ? ex + Math.min(W, H) * 0.08 : ex - Math.min(W, H) * 0.08 - cw;
  cx = Math.min(W - cw - 24 * k, Math.max(24 * k, cx));
  const lineEnd = right ? cx : cx + cw, cy = Math.min(H - ch - 24 * k, Math.max(24 * k, ey - ch / 2));
  const lp = $.E.inOut2($.seg(t, tin + 0.3, tin + 0.8));
  s += M.part("dot", { at: tin, in: "pop", box: { x: tx - 16 * k, y: ty - 16 * k, w: 32 * k, h: 32 * k } }, $.circle(tx, ty, 10 * k, { fill: col, stroke: "#FFFFFF", sw: 3 * k }) + pulse($, t, tin + 0.2, tx, ty, 12 * k, col));
  if (lp > 0) s += M.part("line", { at: tin + 0.3, in: "none" }, $.path("M" + tx + " " + ty + "L" + ex + " " + ey + "L" + lineEnd + " " + ey, { stroke: col, sw: 4 * k, draw: lp, cap: "round" }));
  let card = $.card(cx, cy, cw, ch, { t: t }) + $.rect(right ? cx : cx + cw - 8 * k, cy, 8 * k, ch, { fill: col });
  card += $.text(title, Object.assign({}, tf, { x: cx + 28 * k, y: cy + 22 * k, fill: c.fg }));
  dl.forEach(function (l, i) { card += $.text(l, Object.assign({}, df, { x: cx + 28 * k, y: cy + 22 * k + tf.size * 1.1 + 14 * k + i * df.size * 1.3, fill: c.mute })); });
  s += M.part("card", { at: tin + 0.75, in: "slide", from: right ? "left" : "right", distance: 20, box: { x: cx, y: cy, w: cw, h: ch } }, card);
  return s;
}
