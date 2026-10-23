function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  const star = function (cx, cy, r, fill) {
    let d = "";
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      d += (i ? "L" : "M") + $.fx(cx + rr * Math.cos(a)) + " " + $.fx(cy + rr * Math.sin(a));
    }
    return d + "Z";
  };
  const sr = Math.min(A.w / 13, 64 * k);
  const sg = sr * 2.4;
  const sx0 = W / 2 - sg * 2;
  const total = sr * 2 + 40 * k + 150 * k + 60 * k + 200 * k;
  let y = A.y + (A.h - total) / 2 + sr;
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  // Each star fills in turn up to the score; the last one partly.
  let stars = "";
  for (let i = 0; i < 5; i++) {
    const cx = sx0 + i * sg;
    const at = tin + 0.2 + i * 0.16;
    const f = Math.max(0, Math.min(1, p.score - i)) * $.E.out3($.seg(t, at, at + 0.3));
    const pop = 1 + 0.25 * $.bump(t, at + 0.2, 0.06, 0.25);
    const id = $.uid("rs");
    $.def('<clipPath id="' + id + '"><rect x="' + $.fx(cx - sr) + '" y="' + $.fx(y - sr) + '" width="' + $.fx(2 * sr * f) + '" height="' + $.fx(2 * sr) + '"/></clipPath>');
    stars += $.g({ transform: $.tf({ s: pop, ox: cx, oy: y }) }, $.path(star(cx, y, sr), { fill: $.rgba(c.fg, 0.12) }), '<g clip-path="url(#' + id + ')">' + $.path(star(cx, y, sr), { fill: c.accent2 }) + "</g>");
  }
  s += M.part("stars", { at: tin, in: "fade", dur: 0.2, box: { x: sx0 - sr, y: y - sr, w: sg * 4 + 2 * sr, h: 2 * sr } }, stars);
  y += sr + 40 * k;
  const nf = { ...$.font("display"), size: 120 * k };
  const score = $.counter(t, tin + 0.2, tin + 1.1, p.score, { dec: 1 });
  s += M.part("score", { at: tin + 0.2, in: "rise", distance: 20, box: { x: A.x, y: y, w: A.w, h: nf.size * 1.6 } },
    $.text(score, { ...nf, x: W / 2, y: y, anchor: "middle", fill: c.fg }),
    $.text(String(p.count || ""), { ...$.font("text"), size: 30 * k, x: W / 2, y: y + nf.size * 1.05, anchor: "middle", fill: c.mute }));
  y += nf.size * 1.05 + 30 * k + 60 * k;
  const qf = fitLines($, "“" + String(p.quote || "") + "”", { ...$.font("accent"), ls: 0 }, A.w * (A.wide ? 0.7 : 0.92), 64 * k, 30 * k, 4);
  s += M.text("quote", { at: tin + 1.2, in: "rise", distance: 16, split: "lines", stagger: 0.1, ...qf.font, x: W / 2, y: y, anchor: "middle", fill: c.fg, lh: 1.25, maxW: A.w * (A.wide ? 0.7 : 0.92) }, qf.lines.join("\n"));
  y += qf.lines.length * qf.size * 1.25 + 30 * k;
  s += M.text("author", { at: tin + 1.6, in: "fade", dur: 0.4, ...$.font("mono"), size: 24 * k, ls: 0.1, x: W / 2, y: y, anchor: "middle", fill: c.mute }, String(p.author || "").toUpperCase());
  return s;
}
