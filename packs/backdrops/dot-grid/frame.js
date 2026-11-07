// A grid of small dots with ripples running out from a few points: as a ripple passes, the dots swell and take
// the accent, then settle back — a quiet, techy ground for titles.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  const step = Math.max(16, 44 * k * (Number(p.spacing) || 1));
  const sp = Number(p.speed) || 1;
  // Ripple sources wander slowly; each ripple travels out at a fixed speed and repeats.
  const src = [[0.3, 0.4], [0.72, 0.62], [0.5, 0.2]].slice(0, Math.max(1, Math.min(3, Math.round(p.sources))));
  const period = 3.2 / sp, vel = Math.max(W, H) * 0.42 * sp;
  let g = "";
  for (let y = step / 2; y < H; y += step) {
    for (let x = step / 2; x < W; x += step) {
      let e = 0;
      src.forEach(function (q, i) {
        const sx = W * (q[0] + 0.05 * Math.sin(t * 0.3 + i)), sy = H * (q[1] + 0.05 * Math.cos(t * 0.27 + i * 2));
        const d = Math.hypot(x - sx, y - sy);
        const ph = ((t + i * period / src.length) % period) * vel;
        e = Math.max(e, Math.exp(-Math.pow((d - ph) / (step * 1.8), 2)) * Math.max(0, 1 - ph / (Math.max(W, H) * 1.1)));
      });
      const r = step * (0.07 + 0.16 * e);
      // Resting dots are faint text colour; a passing ripple lights them in the accent.
      g += e > 0.12 ? $.circle(x, y, r, { fill: c.accent, op: 0.3 + 0.7 * e }) : $.circle(x, y, r, { fill: c.fg, op: 0.16 + 0.6 * e });
    }
  }
  s += M.part("dots", { in: "fade", out: "none", dur: 0.6, vary: false }, g);
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
