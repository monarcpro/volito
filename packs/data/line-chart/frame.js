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
  const n = rows.length;
  const lf = { ...$.font("text"), size: Math.min(28 * k, (A.w / n) * 0.3) };
  const vf = { ...$.font("mono"), size: 22 * k };
  const maxV = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([p.target || 0, 1e-9]));
  const step = niceStep(maxV * 1.1, 4);
  const top = step * Math.ceil((maxV * 1.08) / step);
  const axisW = $.measure(fmtNum(top, 0, p.prefix, p.suffix), vf) + 18 * k;
  const box = { x: A.x + axisW, y: head.y + 30 * k, w: A.w - axisW - 70 * k, h: A.y + A.h - head.y - 30 * k - lf.size * 2.2 };
  const X = function (i) { return box.x + (n > 1 ? (i / (n - 1)) * box.w : box.w / 2); };
  const Y = function (v) { return box.y + box.h - (v / top) * box.h; };
  let grid = "";
  for (let v = 0; v <= top + 1e-9; v += step) {
    grid += $.line(box.x, Y(v), box.x + box.w, Y(v), { stroke: $.rgba(c.fg, v === 0 ? 0.3 : 0.1), sw: 2 * k });
    grid += $.text(fmtNum(v, 0, p.prefix, p.suffix), { ...vf, x: box.x - 16 * k, y: Y(v) - vf.size * 0.55, anchor: "end", fill: c.mute });
  }
  rows.forEach(function (r, i) { if (n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1) grid += $.text(String(r.label), { ...lf, x: X(i), y: box.y + box.h + lf.size * 0.6, anchor: "middle", fill: c.mute }); });
  s += M.part("grid", { at: tin + 0.1, in: "fade", dur: 0.4, out: "fade", vary: false }, grid);
  // The line draws on from the left; each point pops when the line reaches it.
  const t0 = tin + 0.5, t1 = t0 + 1.8;
  const run = $.E.inOut2($.seg(t, t0, t1));
  const pts = rows.map(function (r, i) { return [X(i), Y(r.value)]; });
  const d = pts.map(function (q, i) { return (i ? "L" : "M") + $.fx(q[0]) + " " + $.fx(q[1]); }).join("");
  const reach = box.x + box.w * run;
  if (p.target > 0) {
    const ty = Y(p.target);
    s += M.part("target", { at: tin + 0.3, in: "grow-x", origin: "left", dur: 0.6, out: "fade", box: { x: box.x, y: ty - 4 * k, w: box.w, h: 8 * k } },
      $.line(box.x, ty, box.x + box.w, ty, { stroke: c.accent2, sw: 3 * k, dash: 12 * k + " " + 10 * k }),
      $.text(String(p.targetLabel || "") + " " + fmtNum(p.target, p.decimals, p.prefix, p.suffix), { ...vf, x: box.x + box.w + 12 * k, y: ty - vf.size * 0.55, fill: c.accent2 }));
  }
  const gid = $.uid("lg");
  $.def('<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c.accent + '" stop-opacity="0.32"/><stop offset="1" stop-color="' + c.accent + '" stop-opacity="0"/></linearGradient>');
  s += $.clip(box.x - 10 * k, box.y - 40 * k, reach - box.x + 10 * k, box.h + 50 * k, 0,
    M.part("area", { at: t0, in: "fade", dur: 0.4, out: "fade", vary: false }, $.path(d + "L" + $.fx(pts[n - 1][0]) + " " + $.fx(box.y + box.h) + "L" + $.fx(pts[0][0]) + " " + $.fx(box.y + box.h) + "Z", { fill: "url(#" + gid + ")" })) +
    M.part("line", { at: t0, in: "none", out: "fade" }, $.path(d, { stroke: c.accent, sw: 6 * k, fill: "none" })));
  let dots = "";
  pts.forEach(function (q, i) {
    if (q[0] > reach + 1) return;
    const at = t0 + (q[0] - box.x) / box.w * (t1 - t0);
    const pop = $.pop(t, at);
    dots += $.circle(q[0], q[1], 9 * k * Math.max(0, pop), { fill: c.bg, stroke: c.accent, sw: 4 * k });
  });
  s += M.part("dots", { at: t0, in: "none", out: "fade" }, dots);
  const last = rows[n - 1], lp = pts[n - 1];
  const callout = fmtNum(last.value * $.E.out3($.seg(t, t1 - 0.2, t1 + 0.4)), p.decimals, p.prefix, p.suffix);
  const cfnt = { ...$.font("display"), size: 40 * k };
  const cw2 = $.measure(fmtNum(last.value, p.decimals, p.prefix, p.suffix), cfnt) + 36 * k, chh = cfnt.size * 1.5;
  const cx = Math.min(lp[0] - cw2 / 2, A.x + A.w - cw2), cy = lp[1] - chh - 22 * k;
  s += M.part("label", { at: t1 - 0.1, in: "pop", origin: "bottom", out: "fade", box: { x: cx, y: cy, w: cw2, h: chh } },
    $.rect(cx, cy, cw2, chh, { r: chh / 2, fill: c.accent }), $.text(callout, { ...cfnt, x: cx + cw2 / 2, y: cy + (chh - cfnt.size) / 2 - cfnt.size * 0.04, anchor: "middle", fill: $.on(c.accent) }));
  return s;
}
