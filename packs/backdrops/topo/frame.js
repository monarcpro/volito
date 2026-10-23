function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  const n = Math.round(p.lines), peaks = [[0.3, 0.38, 0], [0.76, 0.66, 2.1]];
  const D = Math.hypot(W, H);
  let l = "";
  peaks.forEach(function (pk, pi) {
    const cx = W * pk[0], cy = H * pk[1];
    for (let j = 1; j <= n; j++) {
      const r = (j / n) * D * 0.55, pts = [];
      for (let q = 0; q < 40; q++) {
        const a = (q / 40) * 6.2832;
        const w = 1 + 0.16 * Math.sin(3 * a + pk[2] + t * 0.25 * p.speed) + 0.08 * Math.sin(5 * a - j * 0.3 + t * 0.4 * p.speed) + 0.05 * Math.sin(9 * a + j * 0.5);
        pts.push([cx + Math.cos(a) * r * w, cy + Math.sin(a) * r * w * 0.8]);
      }
      let d = "M" + (pts[0][0] + pts[39][0]) / 2 + " " + (pts[0][1] + pts[39][1]) / 2;
      for (let q = 0; q < 40; q++) { const a1 = pts[q], b1 = pts[(q + 1) % 40]; d += "Q" + a1[0] + " " + a1[1] + " " + (a1[0] + b1[0]) / 2 + " " + (a1[1] + b1[1]) / 2; }
      l += $.path(d + "Z", { stroke: j % 5 === 0 ? c.accent : $.rgba(c.fg, 0.18), sw: (j % 5 === 0 ? 3 : 1.8) * k, op: pi === 0 ? 1 : 0.65 });
    }
  });
  s += M.part("lines", { in: "fade", out: "none", dur: 0.6, vary: false }, l);
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
