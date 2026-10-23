function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.25 : 1.1);
  const tin = $.beat("in", 0.2);
  const rows = p.items || [];
  const w = Math.min(A.w, A.wide ? 720 * k : A.w);
  const x = A.wide ? W - A.x - w : (W - w) / 2;
  const pad = 22 * k, ic = 52 * k, h = 112 * k, gap = 16 * k;
  const af = { ...$.font("text"), size: 21 * k, ls: 0.06 };
  let s = "";
  rows.forEach(function (r, i) {
    const at = tin + i * p.gap;
    // Later arrivals push this one down by a row each, on a spring.
    let push = 0;
    for (let j = i + 1; j < rows.length; j++) push += $.spring(Math.max(0, t - (tin + j * p.gap)), 2.4, 8);
    const y = A.y + push * (h + gap);
    const tf = fitFont($, String(r.text), "display", 30 * k, w - pad * 2 - ic - 20 * k);
    let b = $.rect(x, y, w, h, { r: 26 * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: "md" });
    b += appIcon($, p.icon, x + pad, y + (h - ic) / 2, ic, { fill: nameColor($, r.app) });
    b += $.text(String(r.app).toUpperCase(), { ...af, x: x + pad + ic + 18 * k, y: y + pad - 2 * k, fill: c.mute });
    b += $.text("now", { ...af, x: x + w - pad, y: y + pad - 2 * k, anchor: "end", fill: c.mute });
    b += $.text(String(r.text), { ...tf, x: x + pad + ic + 18 * k, y: y + pad + af.size * 1.45, fill: c.fg });
    s = M.part("items", { at: at, in: "drop", distance: 70, ease: "bouncy", out: "fade", box: { x: x, y: y, w: w, h: h } }, b) + s;
  });
  return s;
}
