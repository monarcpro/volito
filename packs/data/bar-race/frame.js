function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  const periods = p.periods || [];
  const np = periods.length;
  const rows = (p.rows || []).map(function (r, i) { return { label: String(r.label), i: i, v: String(r.values).split(/[,\s]+/).filter(Boolean).map(Number).concat(new Array(np).fill(0)).slice(0, np) }; });
  // The race runs from 0.6 s to 0.8 s before the end; each period gets an equal share.
  const t0 = tin + 0.6, t1 = Math.max(t0 + 1, $.beat("out", $.dur - 0.45) - 0.4);
  const pos = Math.max(0, Math.min(np - 1, ((t - t0) / (t1 - t0)) * (np - 1)));
  const i0 = Math.min(np - 2, Math.floor(pos)), f = pos - i0, fe = $.E.inOut2(f);
  const valAt = function (r) { return r.v[i0] + (r.v[i0 + 1] - r.v[i0]) * f; };
  const rankAt = function (j) { const sorted = rows.slice().sort(function (a, b) { return b.v[j] - a.v[j] || a.i - b.i; }); const m = {}; sorted.forEach(function (r, ix) { m[r.i] = ix; }); return m; };
  const ra = rankAt(i0), rb = rankAt(i0 + 1);
  const show = Math.min(rows.length, Math.round(p.show));
  const room = { y: head.y, h: A.y + A.h - head.y - 20 * k };
  // On wide frames the names sit left of the bars; elsewhere each bar gets a name row above it.
  const slot = room.h / show, bh = slot * (A.wide ? 0.72 : 0.44);
  const maxNow = Math.max.apply(null, rows.map(valAt).concat([1e-9]));
  const lf = { ...$.font("display"), size: Math.min(34 * k, A.wide ? bh * 0.5 : slot * 0.3) };
  const vf = { ...$.font("mono"), size: Math.min(28 * k, bh * 0.42), weight: 700 };
  const labelW = A.wide ? Math.min(A.w * 0.22, Math.max.apply(null, rows.map(function (r) { return $.measure(r.label, lf); })) + 24 * k) : 0;
  const bx = A.x + labelW, bw = A.w - labelW - $.measure(fmtNum(maxNow, p.decimals, p.prefix, p.suffix), vf) - 30 * k;
  let bars = "";
  rows.forEach(function (r) {
    const rank = ra[r.i] + (rb[r.i] - ra[r.i]) * fe;
    if (rank > show - 0.05) return;
    const y = A.wide ? room.y + rank * slot + (slot - bh) / 2 : room.y + rank * slot + slot * 0.42;
    const v = valAt(r), w = Math.max(bh * 0.3, (v / maxNow) * bw);
    const col = seriesColor($, r.i);
    bars += $.rect(bx, y, w, bh, { r: bh * 0.18, fill: col });
    if (A.wide) bars += $.text(r.label, { ...lf, x: bx - 18 * k, y: y + (bh - lf.size) / 2 - lf.size * 0.04, anchor: "end", fill: c.fg });
    else bars += $.text(r.label, { ...lf, x: bx, y: y - lf.size * 1.25, fill: c.fg });
    bars += $.text(fmtNum(v, p.decimals, p.prefix, p.suffix), { ...vf, x: bx + w + 14 * k, y: y + (bh - vf.size) / 2 - vf.size * 0.05, fill: c.fg });
  });
  s += M.part("bars", { at: tin + 0.3, in: "fade", dur: 0.4, out: "fade" }, bars);
  const pf = { ...$.font("display"), size: Math.min(A.h * 0.18, 200 * k) };
  const label = String(periods[Math.round(pos)] || "");
  s += M.part("period", { at: tin + 0.4, in: "fade", dur: 0.4, out: "fade", vary: false }, $.text(label, { ...pf, x: A.x + A.w, y: A.y + A.h - pf.size * 1.05, anchor: "end", fill: $.rgba(c.fg, 0.16) }));
  return s;
}
