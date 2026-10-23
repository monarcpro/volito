function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  s += M.part("pattern", { in: "fade", out: "none", dur: 0.6, vary: false }, $.pattern(t, p.kind, { a: p.strength, scale: p.scale, speed: p.speed, color: p.color || undefined, color2: p.color2 || undefined }));
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
