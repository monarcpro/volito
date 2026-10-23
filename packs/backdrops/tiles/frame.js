function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  s += M.part("tiles", { in: "fade", out: "none", dur: 0.5, vary: false }, $.pattern(t, "tiles", { a: 1, scale: p.size, speed: p.speed }));
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
