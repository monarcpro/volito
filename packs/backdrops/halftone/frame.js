// A halftone field: a grid of dots whose size follows a slow wave of light rolling across the frame, like
// newsprint breathing; a second, offset screen in the other accent prints over it like riso.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  const step = Math.max(14, 34 * k * (Number(p.scale) || 1));
  const sp = Number(p.speed) || 1;
  const screen = function (col, off, ang) {
    let g = "";
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let y = -step; y < H + step; y += step) {
      for (let x = -step; x < W + step; x += step) {
        // Two slow waves crossing, plus a soft pool of light that drifts round the frame.
        const u = (x * ca + y * sa) / Math.max(W, H), v = (y * ca - x * sa) / Math.max(W, H);
        const lx = W * (0.5 + 0.3 * Math.sin(t * 0.25 * sp + off)), ly = H * (0.5 + 0.3 * Math.cos(t * 0.2 * sp + off));
        const pool = Math.exp(-((x - lx) * (x - lx) + (y - ly) * (y - ly)) / (2 * Math.pow(Math.max(W, H) * 0.32, 2)));
        const f = 0.5 + 0.25 * Math.sin((u * 6 + t * 0.6 * sp) * 2 + off) + 0.25 * Math.sin((v * 5 - t * 0.45 * sp) * 2) ;
        const r = step * 0.48 * Math.max(0, Math.min(1, f * 0.55 + pool * 0.6));
        if (r > step * 0.04) g += $.circle(x + off * step * 0.5, y + off * step * 0.5, r, { fill: col });
      }
    }
    return g;
  };
  let field = screen(c.accent, 0, 0.26);
  // The second screen overprints like ink on paper: multiply on a light ground, screen (light adding) on a dark one.
  const blend = $.style.mode === "light" ? "multiply" : "screen";
  if (p.layers !== "one") field = field + '<g style="mix-blend-mode:' + blend + '" opacity="0.85">' + screen(c.accent2, 1, -0.2) + "</g>";
  s += M.part("dots", { in: "fade", out: "none", dur: 0.6, vary: false }, field);
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
