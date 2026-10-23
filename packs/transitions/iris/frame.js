function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const cx = W * p.x / 100, cy = H * p.y / 100;
  const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  // How far the shape must open to clear the frame.
  const R = far * (p.shape === "star" ? 2.6 : p.shape === "diamond" ? 1.45 : p.shape === "square" ? 1.02 : 1.02);
  const e = ph.before ? 1 - $.E.inOut3(ph.cover) : $.E.inOut3(ph.uncover);
  if (e < 1) {
    const band = 34 * k * e + (1 - e) * 0;
    s += frameWithHole($, shapePath(p.shape, cx, cy, R * e), col.lead);
    s += frameWithHole($, shapePath(p.shape, cx, cy, R * e + band * 0.5), col.lead2);
    s += frameWithHole($, shapePath(p.shape, cx, cy, R * e + band), col.cover);
  }
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  return s + cutWord(M, $, t, p.label, col.cover);
}
