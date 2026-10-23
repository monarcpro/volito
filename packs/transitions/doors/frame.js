function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const tall = H > W * 1.2;
  const L = tall ? H : W, half = L / 2;
  const e = ph.before ? $.E.out3(ph.cover) : 1 - $.E.in3(ph.uncover);
  const off = half * (1 - e);
  const R = Math.min(W, H) * 0.17;
  const doorA = tall ? $.rect(0, -off, W, half + 1, { fill: col.cover }) + $.rect(0, half - off - 10 * k, W, 10 * k, { fill: col.lead }) : $.rect(-off, 0, half + 1, H, { fill: col.cover }) + $.rect(half - off - 10 * k, 0, 10 * k, H, { fill: col.lead });
  const doorB = tall ? $.rect(0, half + off, W, half, { fill: col.cover }) + $.rect(0, half + off, W, 10 * k, { fill: col.lead2 }) : $.rect(half + off, 0, half, H, { fill: col.cover }) + $.rect(half + off, 0, 10 * k, H, { fill: col.lead2 });
  s += doorA + doorB;
  if (p.disc && !p.label) {
    // Each door carries half a disc; shut, they make one.
    const cx = W / 2, cy = H / 2;
    const spin = ph.before ? (1 - e) * -90 : (1 - e) * 90;
    if (tall) {
      s += $.path("M" + (cx - R) + " " + (cy - off) + "A" + R + " " + R + " 0 0 1 " + (cx + R) + " " + (cy - off) + "Z", { fill: col.lead, transform: "rotate(" + spin + " " + cx + " " + (cy - off) + ")" });
      s += $.path("M" + (cx - R) + " " + (cy + off) + "A" + R + " " + R + " 0 0 0 " + (cx + R) + " " + (cy + off) + "Z", { fill: col.lead2, transform: "rotate(" + spin + " " + cx + " " + (cy + off) + ")" });
    } else {
      s += $.path("M" + (cx - off) + " " + (cy - R) + "A" + R + " " + R + " 0 0 0 " + (cx - off) + " " + (cy + R) + "Z", { fill: col.lead, transform: "rotate(" + spin + " " + (cx - off) + " " + cy + ")" });
      s += $.path("M" + (cx + off) + " " + (cy - R) + "A" + R + " " + R + " 0 0 1 " + (cx + off) + " " + (cy + R) + "Z", { fill: col.lead2, transform: "rotate(" + spin + " " + (cx + off) + " " + cy + ")" });
    }
  }
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  return s + cutWord(M, $, t, p.label, col.cover);
}
