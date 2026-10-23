function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const M = motion($, t);
  const a = 120 + t * 9 * p.speed, sh = 0.08 * Math.sin(t * 0.4 * p.speed);
  let g = $.rect(0, 0, W, H, { fill: $.gradient([[0, c.bg], [0.3 + sh, c.accent], [0.62 - sh, c.accent2], [1, c.bg]], { angle: a }) });
  g += $.rect(0, 0, W, H, { fill: $.gradient([[0, c.bg, 0.55], [0.5, c.bg, 0], [1, c.bg, 0.5]], { angle: a + 90 }) });
  let s = M.part("ground", { in: "none", out: "none", vary: false }, g) + $.grain(t, { op: 0.07 });
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
