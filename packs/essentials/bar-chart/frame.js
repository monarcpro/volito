function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const rows = (p.rows || []).slice(0, 7);
  const n = Math.max(1, rows.length);
  const max = Math.max.apply(null, rows.map(function (r) { return Number(r.value) || 0; }).concat([1e-9]));
  let hi = Math.round(p.highlight);
  if (hi === 0) hi = rows.reduce(function (b, r, i) { return (Number(r.value) || 0) > (Number(rows[b].value) || 0) ? i : b; }, 0);
  else hi = hi - 1;
  const title = $.case(p.title);
  const tf = fitLines($, title, Object.assign({}, $.font("display"), { ls: -0.03 }), A.w, Math.min((A.tall ? 120 : 100) * k, A.h * 0.1), 44 * k, 2);
  const headH = tf.lines.length * tf.size * 1.05 + 60 * k;
  const footH = p.source ? 70 * k : 0;
  const gapY = 26 * k;
  const rh = Math.min((A.tall ? 210 : A.wide ? 150 : 185) * k, (A.h - headH - footH - gapY * (n - 1)) / n);
  const top = A.y + (A.h - headH - footH - n * rh - (n - 1) * gapY) / 2;
  const w = A.wide ? Math.min(A.w, 1500 * k) : A.w;
  const x = (W - w) / 2;
  const fmt = function (v) { return (p.prefix || "") + (p.decimals ? v.toFixed(p.decimals) : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")) + (p.suffix || ""); };
  // Labels sit above their bar on tall frames, beside it on wide ones.
  const lf = Object.assign({}, $.font("text"), { size: Math.min((A.tall ? 46 : 40) * k, rh * (A.wide ? 0.4 : 0.3)) });
  const labels = rows.map(function (r) { return $.case(r.label); });
  const labelW = A.wide ? Math.min(w * 0.34, widest($, labels, lf) + 44 * k) : 0;
  const vf = Object.assign({}, $.font("mono"), { size: Math.min(44 * k, rh * 0.36) });
  const valueW = $.measure(fmt(max), vf) + 30 * k;
  const barX = x + labelW;
  const barW = w - labelW - valueW;

  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  tf.lines.forEach(function (line, i) {
    s += M.text("title", Object.assign({ at: tin + i * 0.1, in: "rise", distance: 26 }, tf.font, { x: x, y: top + i * tf.size * 1.05 }), line);
  });
  const start = tin + 0.4;
  rows.forEach(function (r, i) {
    const at = landOn($, r.label, start + i * 0.18, start);
    const ry = top + headH + i * (rh + gapY);
    const v = Number(r.value) || 0;
    // The bar grows (and its value counts) over the row's entrance, at least 0.8 s.
    const rp = M.progress("rows", { at: at - 0.05, in: "fade", dur: 0.25 });
    const grow = $.E.out3($.seg(t, rp.at, rp.at + 0.8));
    const bh = A.wide ? rh * 0.66 : rh * 0.48;
    const by = A.wide ? ry + (rh - bh) / 2 : ry + rh - bh;
    const col = hi === i ? c.accent : $.rgba(c.fg, 0.28);
    let row = "";
    if (A.wide) row += $.text(labels[i], Object.assign({}, lf, { x: x, y: ry + (rh - lf.size) / 2, fill: hi === i ? c.fg : c.mute, maxW: labelW - 20 * k }));
    else row += $.text(labels[i], Object.assign({}, lf, { x: x, y: ry, fill: hi === i ? c.fg : c.mute }));
    row += $.rect(barX, by, barW, bh, { r: bh * 0.22, fill: $.rgba(c.fg, 0.06) });
    row += $.rect(barX, by, Math.max(bh * 0.44, barW * (v / max) * grow), bh, { r: bh * 0.22, fill: col, shadow: hi === i ? "glow" : null });
    row += $.text(fmt(v * grow), Object.assign({}, vf, { x: barX + barW + 24 * k, y: by + (bh - vf.size) / 2 - vf.size * 0.05, fill: hi === i ? c.accent : c.fg }));
    s += M.part("rows", { at: at - 0.05, in: "fade", dur: 0.25, box: { x: x, y: ry, w: w, h: rh } }, row);
  });
  if (p.source) s += M.text("source", Object.assign({ at: start + n * 0.18 + 0.4, in: "fade", dur: 0.4 }, $.font("mono"), { size: 24 * k, x: x, y: top + headH + n * rh + (n - 1) * gapY + 34 * k, fill: c.mute, ls: 0.06 }), p.source);
  return s;
}
