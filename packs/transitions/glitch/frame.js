function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const fr = Math.floor(t * 24);
  // Strength rises to full at the cut and falls after it.
  const g = Math.min(1, (ph.before ? $.E.in2(ph.cover) : 1 - $.E.out2(ph.uncover)) * p.intensity * 1.15);
  const near = Math.abs(t - ph.mid) < Math.max(0.05, $.dur * 0.07);
  const pal = [col.lead, col.lead2, col.cover, c.fg, "#00F0FF", "#FF2E88"];
  if (near) s += $.rect(0, 0, W, H, { fill: col.cover });
  const n = 22;
  for (let i = 0; i < n; i++) {
    const h1 = $.hash(i * 7.3 + fr * 1.91), h2 = $.hash(i * 3.1 + fr * 0.77), h3 = $.hash(i * 11.7 + fr * 2.3);
    if (h1 > g) continue;
    const y = h2 * H, hh = (0.015 + 0.12 * h3 * h3) * H;
    const x = (h3 - 0.5) * W * 0.5 * g, w = W * (0.35 + 0.65 * $.hash(i + fr * 5.1));
    s += $.rect(x + (h1 > 0.5 ? W - w : 0) * (1 - g), y, w, hh, { fill: pal[Math.floor(h2 * 997) % pal.length] });
  }
  // Pixel blocks.
  for (let j = 0; j < 14; j++) {
    const b1 = $.hash(j * 5.7 + fr * 3.3);
    if (b1 > g * 0.8) continue;
    const sz = (20 + 60 * $.hash(j + fr)) * k;
    s += $.rect($.hash(j * 2.2 + fr) * W, $.hash(j * 9.9 + fr) * H, sz * 2.2, sz, { fill: pal[(j + fr) % pal.length] });
  }
  // Scanlines over it all while it is breaking.
  if (g > 0.2) {
    const id = $.uid("sl");
    $.def('<pattern id="' + id + '" width="8" height="' + 6 * k + '" patternUnits="userSpaceOnUse"><rect width="8" height="' + 2 * k + '" fill="rgba(0,0,0,0.22)"/></pattern>');
    s += $.rect(0, 0, W, H, { fill: "url(#" + id + ")", op: g });
  }
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  if (p.label) {
    // The word with an RGB split that jitters.
    const word = cutWord(M, $, t, p.label, col.cover);
    const j = (($.hash(fr * 1.3) - 0.5) * 18) * k;
    s += word ? '<g opacity="0.75" transform="translate(' + j + ' 0)" style="mix-blend-mode:screen">' + word.replace(/fill="[^"]*"/g, 'fill="#00F0FF"') + "</g>" + '<g opacity="0.75" transform="translate(' + -j + ' 0)">' + word.replace(/fill="[^"]*"/g, 'fill="#FF2E88"') + "</g>" + word : "";
  }
  return s;
}
