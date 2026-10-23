function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const n = Math.max(3, Math.round(p.slats)), across = p.direction === "across";
  const L = across ? H : W, band = L / n;
  for (let i = 0; i < n; i++) {
    const lag = (i / (n - 1)) * 0.4;
    const ci = $.E.inOut3($.clamp((ph.cover - lag) / (1 - lag)));
    const ui = $.E.inOut3($.clamp((ph.uncover - lag) / (1 - lag)));
    const f = ph.before ? ci : 1 - ui;
    if (f <= 0) continue;
    const h = band * f + 1;
    // Closing they grow down from the slat's top; opening they shrink to its bottom.
    const a = i * band + (ph.before ? 0 : band - h);
    const fill = i % 2 ? col.lead : col.cover;
    s += across ? $.rect(0, a, W, h, { fill: fill }) : $.rect(a, 0, h, H, { fill: fill });
  }
  // Once shut, the cover colour fills the frame for the word.
  if (Math.abs(t - ph.mid) < 0.06 * $.dur && p.label) s += $.rect(0, 0, W, H, { fill: col.cover });
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  return s + cutWord(M, $, t, p.label, col.cover);
}
