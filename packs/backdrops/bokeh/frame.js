function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  let l = "";
  const pal = [c.accent, c.accent2, c.fg];
  for (let i = 0; i < Math.round(p.count); i++) {
    const r = Math.min(W, H) * (0.03 + 0.12 * Math.pow($.hash(i * 2.3), 2));
    const x = ($.hash(i * 5.1) * 1.2 - 0.1) * W + Math.sin(t * 0.3 * p.speed + i) * 40 * k, y = ($.hash(i * 8.7) * 1.2 - 0.1) * H - ((t * 14 * k * p.speed * (0.5 + $.hash(i))) % (H * 1.4)) + H * 0.2;
    const yy = ((y % (H * 1.4)) + H * 1.4) % (H * 1.4) - H * 0.2;
    const a = (0.18 + 0.35 * $.hash(i * 3.9)) * (0.75 + 0.25 * Math.sin(t * 1.3 + i * 2));
    const col = pal[i % 3];
    l += $.circle(x, yy, r, { fill: $.gradient([[0, col, a], [0.75, col, a * 0.8], [1, col, 0]], { radial: true }) });
  }
  s += M.part("lights", { in: "fade", out: "none", dur: 0.6, vary: false }, l);
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
