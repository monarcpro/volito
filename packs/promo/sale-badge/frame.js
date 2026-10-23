function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = "";
  const R = Math.min(W, H) * 0.17 * p.size / 100, cx = Math.min(W - R * 1.1, Math.max(R * 1.1, W * p.x / 100)), cy = Math.min(H - R * 1.1, Math.max(R * 1.1, H * p.y / 100));
  let d = "";
  for (let i = 0; i < 36; i++) { const a = (i / 36) * 6.2832, r = i % 2 ? R * 0.86 : R; d += (i ? "L" : "M") + (cx + Math.cos(a) * r) + " " + (cy + Math.sin(a) * r); }
  const wob = Math.sin((t - tin) * 3) * 4, spin = (t - tin) * 18;
  let badge = shapeFill($, d + "Z", c.accent);
  badge += $.circle(cx, cy, R * 0.7, { stroke: $.on(c.accent), sw: 3 * k, dash: 10 * k + " " + 8 * k, transform: "rotate(" + spin + " " + cx + " " + cy + ")", op: 0.6 });
  const big = $.case(p.big), small = $.case(p.small);
  const bf = fitFont($, big, "display", R * 0.66, R * 1.3, { ls: -0.04 }), sf = fitFont($, small, "display", R * 0.3, R * 1.1, { ls: 0.02 });
  const words = $.text(big, Object.assign({}, bf, { x: cx, y: cy - bf.size * 0.7, anchor: "middle", fill: $.on(c.accent) })) + (small ? $.text(small, Object.assign({}, sf, { x: cx, y: cy + bf.size * 0.32, anchor: "middle", fill: $.on(c.accent) })) : "");
  const box = { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R };
  s += '<g transform="rotate(' + wob + " " + cx + " " + cy + ')">' + M.part("badge", { at: tin, in: "spin", box: box }, badge) + M.part("words", { at: tin + 0.3, in: "pop", box: box }, words) + "</g>";
  return s;
}
