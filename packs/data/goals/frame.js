function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  const rows = p.rows || [];
  const room = A.y + A.h - head.y;
  const rowH = Math.min((A.tall ? 190 : 150) * k, room / Math.max(1, rows.length));
  const total = rows.length * rowH;
  const w = A.wide ? Math.min(A.w, 1500 * k) : A.w;
  const x = A.wide ? (W - w) / 2 : A.x;
  let y = head.y + Math.max(0, (room - total) / 2);
  const lf = { ...$.font("text"), size: Math.min(36 * k, rowH * 0.26) };
  const vf = { ...$.font("display"), size: Math.min(40 * k, rowH * 0.28) };
  rows.forEach(function (r, i) {
    const at = tin + 0.35 + i * 0.18;
    const pct = Math.max(0, Math.min(100, r.value));
    const g = $.E.out3($.seg(t, at, at + 1));
    const th = rowH * 0.3, ty = y + rowH * 0.42;
    const done = pct >= 100 && g >= 1;
    let row = $.text(String(r.label), { ...lf, x: x, y: y + rowH * 0.06, fill: c.fg });
    row += $.text(Math.round(pct * g) + "%", { ...vf, x: x + w, y: y + rowH * 0.04, anchor: "end", fill: done ? c.green : c.fg });
    row += $.rect(x, ty, w, th, { r: th / 2, fill: $.rgba(c.fg, 0.1) });
    row += $.rect(x, ty, Math.max(th, w * (pct / 100) * g), th, { r: th / 2, fill: done ? c.green : seriesColor($, 0) });
    if (done) row += $.icon("check", x + w - th * 1.05, ty + th * 0.12, th * 0.76, { color: $.on(c.green), sw: 3 });
    s += M.part("rows", { at: at - 0.1, in: "rise", distance: 20, out: "fade", box: { x: x, y: y, w: w, h: rowH } }, row);
    y += rowH;
  });
  return s;
}
