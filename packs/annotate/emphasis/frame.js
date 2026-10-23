function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  let s = "";
  const cx = W * p.x / 100, cy = H * p.y / 100, R = p.size * k * 1.6;
  if (p.kind !== "sparkles") {
    let lines = "";
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9 + ($.hash(i * 2.1) - 0.5) * 0.12;
      const r0 = R * (0.62 + 0.1 * $.hash(i * 5.5)), r1 = R * (0.95 + 0.25 * $.hash(i * 7.7));
      const pr = $.E.out3($.seg(t, tin + i * 0.03, tin + i * 0.03 + 0.25));
      const wob = 1 + 0.06 * Math.sin((t - tin) * 9 + i);
      lines += $.line(cx + Math.cos(a) * r0 * wob, cy + Math.sin(a) * r0 * wob, cx + Math.cos(a) * r1 * wob, cy + Math.sin(a) * r1 * wob, { p: pr, stroke: col, sw: (7 + 5 * $.hash(i)) * k });
    }
    s += M.part("lines", { at: tin, in: "none" }, lines);
  }
  if (p.kind !== "lines") {
    let sp = "";
    const spots = [[-1.05, -0.55, 1], [1.0, -0.75, 0.7], [0.8, 0.45, 0.55], [-0.75, 0.6, 0.45]];
    spots.forEach(function (q, i) {
      const a = tin + 0.15 + i * 0.12, sc = $.E.outBack($.clamp((t - a) / 0.3)) * (1 + 0.18 * Math.sin((t - a) * 7 + i * 2)) * q[2];
      if (sc <= 0) return;
      const x = cx + q[0] * R, y = cy + q[1] * R, r = 34 * k * sc, n = r * 0.22;
      sp += $.path("M" + x + " " + (y - r) + "Q" + (x + n) + " " + (y - n) + " " + (x + r) + " " + y + "Q" + (x + n) + " " + (y + n) + " " + x + " " + (y + r) + "Q" + (x - n) + " " + (y + n) + " " + (x - r) + " " + y + "Q" + (x - n) + " " + (y - n) + " " + x + " " + (y - r) + "Z", { fill: i % 2 ? c.accent2 : col });
    });
    s += M.part("sparkles", { at: tin + 0.15, in: "none" }, sp);
  }
  return s;
}
