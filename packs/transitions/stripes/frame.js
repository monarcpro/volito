function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const n = Math.max(3, Math.round(p.stripes)), D = Math.hypot(W, H), band = D / n + 2;
  const ang = -24, sign = p.direction === "left" ? -1 : 1;
  const pal = [col.lead, col.lead2, col.cover];
  let g = "";
  for (let i = 0; i < n; i++) {
    const lag = (i / (n - 1)) * 0.35;
    const ci = $.E.inOut3($.clamp((ph.cover - lag) / (1 - lag))), ui = $.E.inOut3($.clamp((ph.uncover - lag) / (1 - lag)));
    // Each stripe slides in from one side, then out the other.
    const x0 = ph.before ? -D + D * ci : D * ui;
    if (ph.before ? ci <= 0 : ui >= 1) continue;
    g += $.rect(x0 - D / 2, -D / 2 + i * (D / n), D * 1.02, band, { fill: i === n - 1 || i % 3 === 2 ? col.cover : pal[i % 3] });
  }
  if (ph.before && ph.cover > 0.98) g += $.rect(-D, -D, D * 2, D * 2, { fill: col.cover });
  s += '<g transform="translate(' + W / 2 + " " + H / 2 + ") scale(" + sign + " 1) rotate(" + ang + ')">' + g + "</g>";
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  return s + cutWord(M, $, t, p.label, col.cover);
}
