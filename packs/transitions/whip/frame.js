function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const horiz = p.direction === "left" || p.direction === "right";
  const L = horiz ? W : H, A2 = horiz ? H : W;
  const g = ph.before ? $.E.in3(ph.cover) : 1 - $.E.out3(ph.uncover);
  const n = 46;
  let lines = "";
  for (let i = 0; i < n; i++) {
    const h1 = $.hash(i * 3.7), h2 = $.hash(i * 9.1 + 2), h3 = $.hash(i * 5.3 + 7);
    if (h3 > g * 1.3) continue;
    const pos = h1 * A2, th = (4 + 40 * h2 * h2) * k * (0.4 + g);
    const len = L * (0.3 + 0.9 * h2) * (0.4 + g), travel = (t * (2.2 + h3 * 2) + h1) % 1;
    const a = -len + (L + len) * travel;
    const fill = i % 5 === 0 ? col.lead : i % 5 === 1 ? col.lead2 : col.cover;
    lines += horiz ? $.rect(a, pos, len, th, { fill: fill, r: th / 2 }) : $.rect(pos, a, th, len, { fill: fill, r: th / 2 });
  }
  // The smear: the cover colour washing in at the cut.
  const wash = $.clamp((g - 0.55) / 0.35);
  if (wash > 0) lines = $.rect(0, 0, W, H, { fill: col.cover, op: wash }) + lines;
  const flip = p.direction === "left" ? "translate(" + W + " 0) scale(-1 1)" : p.direction === "up" ? "translate(0 " + H + ") scale(1 -1)" : "";
  s += flip ? '<g transform="' + flip + '">' + lines + "</g>" : lines;
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  return s + cutWord(M, $, t, p.label, col.cover);
}
