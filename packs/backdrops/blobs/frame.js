function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  const n = Math.round(p.count), R = Math.min(W, H) * 0.13, fid = $.uid("goo");
  $.def('<filter id="' + fid + '" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="' + 30 * k + '"/><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11"/></filter>');
  const layer = function (col, off) {
    let g = "";
    for (let i = 0; i < n; i++) {
      const sp = (0.15 + 0.2 * $.hash(i * 2.7 + off)) * p.speed, ph = $.hash(i * 9.1 + off) * 6.28;
      const x = W * (0.5 + 0.42 * Math.sin(t * sp + ph)), y = H * (0.5 + 0.4 * Math.sin(t * sp * 1.3 + ph * 1.7));
      g += $.circle(x, y, R * (0.6 + 0.8 * $.hash(i * 4.4 + off)), { fill: col });
    }
    return '<g filter="url(#' + fid + ')">' + g + "</g>";
  };
  s += M.part("blobs", { in: "fade", out: "none", dur: 0.6, vary: false }, layer(c.accent2, 3) + layer(c.accent, 0));
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
