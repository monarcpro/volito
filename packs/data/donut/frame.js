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
  const total = rows.reduce(function (a, r) { return a + Math.max(0, r.value); }, 0) || 1;
  const room = { x: A.x, y: head.y, w: A.w, h: A.y + A.h - head.y };
  const side = A.wide;
  const R = side ? Math.min(room.h * 0.46, room.w * 0.24) : Math.min(room.w * 0.36, room.h * 0.26);
  const cx = side ? room.x + R + 20 * k : W / 2, cy = side ? room.y + room.h / 2 : room.y + R + 10 * k;
  const r0 = R * 0.62;
  // Segments sweep in turn, together taking 1.4 s.
  const t0 = tin + 0.4;
  let a = 0, ring = "";
  rows.forEach(function (r, i) {
    const share = Math.max(0, r.value) / total;
    const st = t0 + (a / (Math.PI * 2)) * 1.4;
    const grow = $.E.out3($.seg(t, st, st + share * 1.4 + 0.15));
    if (grow > 0) ring += $.path(arcPath(cx, cy, r0, R, a + 0.012, a + Math.max(0.0001, share * Math.PI * 2 * grow) - 0.012), { fill: seriesColor($, i) });
    a += share * Math.PI * 2;
  });
  s += M.part("ring", { at: t0 - 0.1, in: "fade", dur: 0.2, out: "fade", box: { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R } }, $.circle(cx, cy, (R + r0) / 2, { stroke: $.rgba(c.fg, 0.07), sw: R - r0, fill: "none" }), ring);
  const first = rows[0] || { value: 0 };
  const big = p.center === "total" ? fmtNum(total * $.E.out3($.seg(t, t0, t0 + 1.4)), p.decimals, p.prefix, p.suffix) : Math.round((first.value / total) * 100 * $.E.out3($.seg(t, t0, t0 + 1.4))) + "%";
  const bf = fitFont($, p.center === "total" ? fmtNum(total, p.decimals, p.prefix, p.suffix) : "100%", "display", r0 * 0.62, r0 * 1.5);
  s += M.part("center", { at: t0 + 0.2, in: "pop", out: "fade", box: { x: cx - r0, y: cy - r0, w: 2 * r0, h: 2 * r0 } },
    $.text(big, { ...bf, x: cx, y: cy - bf.size * 0.62, anchor: "middle", fill: c.fg }),
    $.text(String(p.centerLabel || ""), { ...$.font("text"), size: Math.min(28 * k, r0 * 0.2), x: cx, y: cy + bf.size * 0.45, anchor: "middle", fill: c.mute }));
  // The legend beside the ring on wide frames, under it elsewhere.
  const lx = side ? cx + R + 80 * k : A.x, ly0 = side ? cy - (rows.length * 70 * k) / 2 : cy + R + 50 * k;
  const lw = side ? Math.min(A.x + A.w - lx, 680 * k) : A.w;
  const rowH = Math.min(70 * k, (A.y + A.h - ly0) / Math.max(1, rows.length));
  const lf = { ...$.font("text"), size: Math.min(34 * k, rowH * 0.5) };
  rows.forEach(function (r, i) {
    const y = ly0 + i * rowH;
    s += M.part("legend", { at: t0 + 0.3 + i * 0.12, in: "slide", from: "left", distance: 16, out: "fade", box: { x: lx, y: y, w: lw, h: rowH } },
      $.rect(lx, y + rowH * 0.25, rowH * 0.5, rowH * 0.5, { r: rowH * 0.12, fill: seriesColor($, i) }),
      $.text(String(r.label), { ...lf, x: lx + rowH * 0.8, y: y + (rowH - lf.size) / 2 - lf.size * 0.05, fill: c.fg }),
      $.text(fmtNum(r.value, p.decimals, p.prefix, p.suffix) + "  " + Math.round((r.value / total) * 100) + "%", { ...$.font("mono"), size: lf.size * 0.82, x: lx + lw, y: y + (rowH - lf.size * 0.82) / 2 - lf.size * 0.05, anchor: "end", fill: c.mute }));
  });
  return s;
}
