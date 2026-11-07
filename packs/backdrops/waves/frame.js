// Layered waves: bands of colour from the brand's accents stacked up the frame, each a slow sum of sines
// drifting sideways at its own speed, the front ones deeper.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  const n = Math.max(2, Math.min(9, Math.round(p.layers)));
  const sp = Number(p.speed) || 1, amp = (Number(p.height) || 1) * H * 0.06;
  let g = "";
  for (let i = 0; i < n; i++) {
    const f = i / Math.max(1, n - 1);
    // Back layers sit higher and paler; front layers lower and stronger.
    const base = H * (0.38 + 0.5 * f);
    const col = $.mix($.mix(c.bg, c.accent2, 0.35), c.accent, f);
    const pts = [];
    for (let x = -20; x <= W + 20; x += W / 48) {
      const y = base + amp * (1 + f * 0.6) * (Math.sin(x / W * 6.283 * (1.2 + f * 0.8) + t * 0.5 * sp * (1 + i * 0.3) + i * 1.7) * 0.6 + Math.sin(x / W * 6.283 * (2.7 + i * 0.4) - t * 0.35 * sp + i) * 0.4);
      pts.push([x, y]);
    }
    g += $.path($.smooth(pts) + "L" + (W + 20) + " " + (H + 20) + "L-20 " + (H + 20) + "Z", { fill: col });
  }
  s += M.part("waves", { in: "fade", out: "none", dur: 0.6, vary: false }, g);
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
