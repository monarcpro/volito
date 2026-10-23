function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const px = Math.max(12, p.size * k), cols = Math.ceil(W / px), rows = Math.ceil(H / px);
  const cover = ph.before ? $.E.inOut2(ph.cover) : 1 - $.E.inOut2(ph.uncover);
  let d = "", dl = "", dl2 = "";
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const h = $.hash(r * 31.7 + q * 7.9 + (ph.before ? 0 : 3.3));
    if (h >= cover) continue;
    const cell = "M" + q * px + " " + r * px + "h" + (px + 0.5) + "v" + (px + 0.5) + "h" + -(px + 0.5) + "z";
    // The last pixels to land are the accents.
    if (cover < 0.98 && h > cover - 0.08) { if ((q + r) % 2) dl += cell; else dl2 += cell; } else d += cell;
  }
  s += (d ? $.path(d, { fill: col.cover }) : "") + (dl ? $.path(dl, { fill: col.lead }) : "") + (dl2 ? $.path(dl2, { fill: col.lead2 }) : "");
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  return s + cutWord(M, $, t, p.label, col.cover);
}
