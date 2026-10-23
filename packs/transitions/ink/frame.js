function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const cx = W * p.x / 100, cy = H * p.y / 100;
  const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.25;
  if (ph.before) {
    const lags = [0, 0.12, 0.24], fills = [col.lead, col.lead2, col.cover];
    lags.forEach(function (lag, i) {
      const e = $.E.inOut3($.clamp((ph.cover - lag) / (1 - lag)));
      if (e > 0) s += $.path(blobPath(cx, cy, far * e, 1.7 + i * 2.1, t), { fill: fills[i] });
    });
  } else {
    // The hole opens from the frame's centre, the cover first, the accents trailing as rims.
    const lags = [0.2, 0.1, 0], fills = [col.lead, col.lead2, col.cover];
    const hx = W / 2, hy = H / 2, far2 = Math.hypot(W, H) * 0.7;
    lags.forEach(function (lag, i) {
      const e = $.E.inOut3($.clamp((ph.uncover - lag) / (1 - lag)));
      if (e < 1) s += frameWithHole($, e > 0 ? blobPath(hx, hy, far2 * e, 4.2 + i, t) : "", fills[i]);
    });
  }
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  return s + cutWord(M, $, t, p.label, col.cover);
}
