function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  const n = 220, cx = W / 2, cy = H / 2, D = Math.hypot(W, H) * 0.6;
  let st = "";
  for (let i = 0; i < n; i++) {
    const a = $.hash(i * 1.37) * 6.2832, r0 = 0.02 + $.hash(i * 7.1) * 0.98;
    const z = ((r0 + t * 0.18 * p.speed * (0.6 + $.hash(i * 3.3))) % 1);
    const d = Math.pow(z, 2.2) * D, d0 = Math.pow(Math.max(0, z - 0.04 * p.speed), 2.2) * D;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, col = i % 9 === 0 ? c.accent : i % 13 === 0 ? c.accent2 : c.fg;
    const sw = (0.8 + 3.2 * z) * k, op = Math.min(1, z * 2.4);
    st += p.streaks ? $.line(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0, x, y, { stroke: col, sw: sw, op: op }) : $.circle(x, y, sw, { fill: col, op: op });
  }
  s += M.part("stars", { in: "fade", out: "none", dur: 0.4, vary: false }, st);
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
