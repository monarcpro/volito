// Milestones on a line that draws on: each gets a card (its year on an accent tab, what happened under it)
// joined to its dot; the newest one reached is lit. Cards alternate above and below on wide frames.
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
  const horiz = A.wide;
  const t0 = tin + 0.5, t1 = Math.min(t0 + 0.6 * n + 0.8, $.beat("out", $.dur - 0.45) - 0.5);
  const run = $.E.inOut2($.seg(t, t0, t1));
  const yf = Object.assign({}, $.font("display"), { size: (horiz ? 34 : 40) * k });
  const tf = Object.assign({}, $.font("text"), { size: (horiz ? 27 : 32) * k, lh: 1.25, weight: 600 });
  const at = function (i) { return t0 + (n > 1 ? i / (n - 1) : 0) * (t1 - t0) * (horiz ? 1 : (n - 1) / n); };
  // The newest milestone the line has reached is lit; the rest settle back.
  let cur = -1;
  rows.forEach(function (r, i) { if (t >= at(i)) cur = i; });
  let line = "", dots = "", cards = "";
  const card = function (r, i, x, y, w, align) {
    const lines = $.wrap(String(r.what), w - 44 * k, tf).slice(0, 3);
    const tabW = $.measure(String(r.when), yf) + 32 * k, tabH = yf.size * 1.35;
    const h = tabH + 22 * k + lines.length * tf.size * 1.25 + 22 * k;
    const lit = i === cur;
    let m = $.rect(x, y, w, h, { r: 16 * k, fill: lit ? c.surface : $.rgba(c.surface, 0.85), stroke: lit ? c.accent : c.line, sw: (lit ? 3 : 1.5) * k, shadow: lit ? "md" : "sm" });
    const tx = align === "middle" ? x + w / 2 - tabW / 2 : x + 22 * k;
    m += $.rect(tx, y + 18 * k, tabW, tabH, { r: tabH / 2, fill: lit ? c.accent : $.rgba(c.accent, 0.14) });
    m += $.text(String(r.when), Object.assign({}, yf, { x: tx + tabW / 2, y: y + 18 * k + (tabH - yf.size) / 2 - 1 * k, anchor: "middle", fill: lit ? $.on(c.accent) : c.accent }));
    lines.forEach(function (l, j) { m += $.text(l, Object.assign({}, tf, { x: align === "middle" ? x + w / 2 : x + 22 * k, y: y + 18 * k + tabH + 18 * k + j * tf.size * 1.25, anchor: align === "middle" ? "middle" : "start", fill: c.fg })); });
    return { m: m, h: h };
  };
  if (horiz) {
    const ly = head.y + (A.y + A.h - head.y) / 2;
    const x0 = A.x + 40 * k, x1 = A.x + A.w - 40 * k;
    line = $.line(x0, ly, x1, ly, { stroke: $.rgba(c.fg, 0.12), sw: 8 * k }) + $.line(x0, ly, x0 + (x1 - x0) * run, ly, { stroke: c.accent, sw: 8 * k });
    const colW = (x1 - x0) / Math.max(1, n - 1);
    const cw = Math.min(colW * 1.75, 380 * k);
    rows.forEach(function (r, i) {
      const x = n > 1 ? x0 + i * colW : (x0 + x1) / 2;
      const up = i % 2 === 0;
      const reached = t >= at(i);
      dots += $.circle(x, ly, 18 * k * Math.max(0, $.pop(t, at(i))), { fill: i === cur ? c.accent : c.bg, stroke: c.accent, sw: 6 * k });
      if (i === cur) dots += $.circle(x, ly, 30 * k * (1 + 0.15 * $.wave(t, 1.4)), { stroke: c.accent, sw: 2.5 * k, op: 0.45 });
      const cd = card(r, i, 0, 0, cw, "middle");
      const cx = Math.max(A.x, Math.min(A.x + A.w - cw, x - cw / 2));
      const cy = up ? ly - 46 * k - cd.h : ly + 46 * k;
      const stem = $.line(x, up ? ly - 20 * k : ly + 20 * k, x, up ? cy + cd.h : cy, { stroke: c.accent, sw: 3 * k, p: $.E.out3($.seg(t, at(i), at(i) + 0.25)) });
      if (reached) cards += stem;
      cards += M.part("labels", { at: at(i) + 0.05, in: "rise", distance: up ? -24 : 24, out: "fade", box: { x: cx, y: cy, w: cw, h: cd.h } }, card(r, i, cx, cy, cw, "middle").m);
    });
  } else {
    const lx = A.x + 34 * k;
    const y0 = head.y + 10 * k, y1 = A.y + A.h - 10 * k;
    const rowH = (y1 - y0) / Math.max(1, n);
    line = $.line(lx, y0, lx, y1, { stroke: $.rgba(c.fg, 0.12), sw: 8 * k }) + $.line(lx, y0, lx, y0 + (y1 - y0) * run, { stroke: c.accent, sw: 8 * k });
    const cw = A.w - 90 * k;
    rows.forEach(function (r, i) {
      const cd = card(r, i, 0, 0, cw, "start");
      const y = y0 + i * rowH + Math.max(0, (rowH - cd.h) / 2 - 10 * k);
      dots += $.circle(lx, y + 18 * k + yf.size * 0.67, 18 * k * Math.max(0, $.pop(t, at(i))), { fill: i === cur ? c.accent : c.bg, stroke: c.accent, sw: 6 * k });
      cards += M.part("labels", { at: at(i) + 0.05, in: "slide", from: "left", distance: 24, out: "fade", box: { x: lx + 56 * k, y: y, w: cw, h: cd.h } }, card(r, i, lx + 56 * k, y, cw, "start").m);
    });
  }
  s += M.part("line", { at: t0, in: "none", out: "fade", vary: false }, line);
  s += M.part("dots", { at: t0, in: "none", out: "fade" }, dots);
  return s + cards;
}
