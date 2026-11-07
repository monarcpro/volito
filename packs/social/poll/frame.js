// A poll card: the question, then each option's bar filling to its share with the percentage counting up; the
// winning option is ticked and lit, the vote count under it all.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.25 : 1.1);
  const tin = $.beat("in", 0.15);
  const opts = (p.options || []).slice(0, 5);
  const sum = opts.reduce(function (a, o) { return a + Math.max(0, Number(o.votes) || 0); }, 0) || 1;
  const win = opts.reduce(function (b, o, i) { return (Number(o.votes) || 0) > (Number(opts[b].votes) || 0) ? i : b; }, 0);
  const w = Math.min(A.w, (A.wide ? 760 : 900) * $.k);
  const pad = 30 * k;
  const qf = Object.assign({}, $.font("display"), { size: 36 * k, lh: 1.2 });
  const q = $.wrap(String(p.question || ""), w - pad * 2, qf).slice(0, 3);
  const of = Object.assign({}, $.font("text"), { size: 28 * k, weight: 600 }), pf = Object.assign({}, $.font("mono"), { size: 26 * k, weight: 700 });
  const oh = 64 * k, og = 14 * k;
  const h = pad * 2 + q.length * qf.size * 1.2 + 24 * k + opts.length * (oh + og) + 34 * k;
  const x = W / 2 - w / 2, y = A.wide ? A.y + (A.h - h) / 2 : A.y + A.h * 0.12;
  let m = $.rect(x, y, w, h, { r: 30 * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: "lg" });
  q.forEach(function (l, i) { m += $.text(l, Object.assign({}, qf, { x: x + pad, y: y + pad + i * qf.size * 1.2, fill: c.fg })); });
  const reveal = tin + 0.9;
  opts.forEach(function (o, i) {
    const oy = y + pad + q.length * qf.size * 1.2 + 24 * k + i * (oh + og);
    const share = Math.max(0, Number(o.votes) || 0) / sum, f = share * $.E.out3($.seg(t, reveal + i * 0.08, reveal + 1.1 + i * 0.08));
    const won = i === win && t > reveal + 1.2;
    m += $.rect(x + pad, oy, w - pad * 2, oh, { r: oh * 0.3, fill: $.rgba(c.fg, 0.05), stroke: won ? c.accent : c.line, sw: (won ? 3 : 1.5) * k });
    if (f > 0) m += $.rect(x + pad, oy, Math.max(oh * 0.6, (w - pad * 2) * f), oh, { r: oh * 0.3, fill: won ? $.rgba(c.accent, 0.3) : $.rgba(c.fg, 0.1) });
    m += $.text(String(o.label || ""), Object.assign({}, of, { x: x + pad + 22 * k, y: oy + (oh - of.size) / 2 - 2 * k, fill: c.fg, maxW: w - pad * 2 - 160 * k }));
    m += $.text(Math.round(f * 100) + "%", Object.assign({}, pf, { x: x + w - pad - 22 * k, y: oy + (oh - pf.size) / 2, anchor: "end", fill: won ? c.accent : c.mute }));
    if (won) m += verified($, x + w - pad - 22 * k - $.measure("100%", pf) - 24 * k, oy + oh / 2, 13 * k);
  });
  const vf = Object.assign({}, $.font("text"), { size: 24 * k, weight: 500 });
  m += $.text(String(p.total || ""), Object.assign({}, vf, { x: x + pad, y: y + h - pad - vf.size * 0.4, fill: c.mute }));
  return M.part("card", { at: tin, in: "pop", ease: "bouncy", out: "fade", box: { x: x, y: y, w: w, h: h } }, m);
}
