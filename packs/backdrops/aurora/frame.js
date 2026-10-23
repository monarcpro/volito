function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  let l = $.pattern(t, "mesh", { a: p.intensity, speed: p.speed * 1.4, scale: 1 });
  // A second, smaller bloom in the second accent crossing the frame.
  const x = W * (0.5 + 0.35 * Math.sin(t * 0.21 * p.speed)), y = H * (0.5 + 0.3 * Math.cos(t * 0.17 * p.speed));
  l += $.circle(x, y, Math.max(W, H) * 0.35, { fill: $.gradient([[0, c.accent2, 0.35 * p.intensity], [1, c.accent2, 0]], { radial: true }) });
  s += M.part("light", { in: "fade", out: "none", dur: 0.8, vary: false }, l) + $.grain(t, { op: 0.06 });
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
