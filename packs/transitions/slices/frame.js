function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const n = Math.max(2, Math.round(p.slices)), band = H / n, edge = 12 * k;
  for (let i = 0; i < n; i++) {
    const lag = $.hash(i * 4.4 + 1) * 0.3, dir = i % 2 ? -1 : 1;
    const ci = $.E.out3($.clamp((ph.cover - lag) / (1 - lag))), ui = $.E.in3($.clamp((ph.uncover - lag) / (1 - lag)));
    const x = ph.before ? -dir * W * (1 - ci) : dir * W * ui;
    if (ph.before ? ci <= 0 : ui >= 1) continue;
    s += $.rect(x, i * band - 0.5, W, band + 1, { fill: col.cover });
    // The leading edge in an accent.
    const ex = dir > 0 ? (ph.before ? x + W - edge : x) : (ph.before ? x : x + W - edge);
    s += $.rect(ex, i * band - 0.5, edge, band + 1, { fill: i % 2 ? col.lead2 : col.lead });
  }
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  return s + cutWord(M, $, t, p.label, col.cover);
}
