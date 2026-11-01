function frame(t, $) {
  var p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  var bIdle = $.beat("idle", 0.5), bRing = $.beat("ring", 1.5), bClear = $.beat("clear", 2.5);
  var tf = $.font("text");
  var bs = unit($, 0.18);
  var cx = W / 2, cy = H / 2, bx = cx - bs / 2, by = cy - bs / 2;
  var appear = $.E.outBack($.seg(t, 0, bIdle * 0.9));
  var sway = t >= bIdle && t < bRing ? Math.sin(loopP(t, bIdle, bRing) * Math.PI * 2) * 2.5 : 0;
  // Ringing: a damped swing about the hook at the top.
  var rt = t - bRing;
  var swing = t >= bRing && t < bClear ? 22 * Math.exp(-rt * 3.2) * Math.sin(rt * 26) : 0;
  var disc = bs * 1.7;
  var s = uiBox($, cx - disc / 2, cy - disc / 2, disc, disc, disc / 2, c.surface, "md");
  s += '<g transform="rotate(' + n2(sway + swing) + " " + n2(cx) + " " + n2(by + bs * 0.08) + ')">' + $.icon("bell", bx, by, bs, { color: c.fg, sw: 2.2 }) + "</g>";
  // The badge pops in when it rings and shrinks away when read.
  var show = t < bRing ? 0 : t < bClear ? $.pop(t, bRing + 0.08, 2.6, 6) : 1 - $.E.in3($.seg(t, bClear, bClear + 0.3));
  if (show > 0.01) {
    var n = String(Math.max(1, Math.round(Number(p.count) || 1)));
    var r = bs * 0.24, bcx = cx + bs * 0.32, bcy = by + bs * 0.18;
    var badge = $.circle(bcx, bcy, r, { fill: c.accent, stroke: c.surface, sw: 4 * k }) + $.text(n, { x: bcx, y: bcy - r * 0.62, size: r * 1.15, weight: Math.max(700, tf.weight), family: tf.family, fill: $.on(c.accent), anchor: "middle" });
    s += posed(badge, bcx, bcy, show, 0, 0, Math.min(1, show * 2));
  }
  return posed(s, cx, cy, 0.7 + 0.3 * appear, 0, 0, Math.min(1, appear * 1.5));
}
