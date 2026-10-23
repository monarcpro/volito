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
  const wf = { ...$.font("display"), size: (horiz ? 44 : 46) * k };
  const tf = { ...$.font("text"), size: (horiz ? 28 : 32) * k, lh: 1.25 };
  let line = "", dots = "", labels = "";
  if (horiz) {
    const ly = head.y + (A.y + A.h - head.y) / 2;
    const x0 = A.x + 40 * k, x1 = A.x + A.w - 40 * k;
    line = $.line(x0, ly, x1, ly, { stroke: $.rgba(c.fg, 0.14), sw: 6 * k }) + $.line(x0, ly, x0 + (x1 - x0) * run, ly, { stroke: c.accent, sw: 6 * k });
    const colW = (x1 - x0) / Math.max(1, n - 1);
    rows.forEach(function (r, i) {
      const x = n > 1 ? x0 + i * colW : (x0 + x1) / 2;
      const at = t0 + (n > 1 ? i / (n - 1) : 0) * (t1 - t0);
      const up = i % 2 === 0;
      dots += $.circle(x, ly, 16 * k * Math.max(0, $.pop(t, at)), { fill: c.bg, stroke: c.accent, sw: 6 * k });
      const lines = $.wrap(String(r.what), colW * 1.6, tf).slice(0, 2);
      const blockH = wf.size * 1.15 + lines.length * tf.size * 1.25;
      const by = up ? ly - 50 * k - blockH : ly + 50 * k;
      // Kept inside the safe area: a label near an edge slides in from its dot.
      const bw = Math.max($.measure(String(r.when), wf), Math.max.apply(null, lines.map(function (l) { return $.measure(l, tf); })));
      const lx = Math.max(A.x + bw / 2, Math.min(A.x + A.w - bw / 2, x));
      labels += M.part("labels", { at: at, in: "rise", distance: up ? -20 : 20, out: "fade", box: { x: lx - bw / 2, y: by, w: bw, h: blockH } },
        $.text(String(r.when), { ...wf, x: lx, y: by, anchor: "middle", fill: c.accent }),
        lines.map(function (l, j) { return $.text(l, { ...tf, x: lx, y: by + wf.size * 1.15 + j * tf.size * 1.25, anchor: "middle", fill: c.fg }); }).join(""));
    });
  } else {
    const lx = A.x + 30 * k;
    const y0 = head.y + 20 * k, y1 = A.y + A.h - 20 * k;
    line = $.line(lx, y0, lx, y1, { stroke: $.rgba(c.fg, 0.14), sw: 6 * k }) + $.line(lx, y0, lx, y0 + (y1 - y0) * run, { stroke: c.accent, sw: 6 * k });
    const rowH = (y1 - y0) / Math.max(1, n);
    rows.forEach(function (r, i) {
      const y = y0 + i * rowH + 10 * k;
      const at = t0 + (i / Math.max(1, n)) * (t1 - t0);
      dots += $.circle(lx, y + wf.size * 0.5, 16 * k * Math.max(0, $.pop(t, at)), { fill: c.bg, stroke: c.accent, sw: 6 * k });
      const lines = $.wrap(String(r.what), A.w - 90 * k, tf).slice(0, 2);
      labels += M.part("labels", { at: at, in: "slide", from: "left", distance: 20, out: "fade", box: { x: lx + 50 * k, y: y, w: A.w - 90 * k, h: rowH } },
        $.text(String(r.when), { ...wf, x: lx + 50 * k, y: y, fill: c.accent }),
        lines.map(function (l, j) { return $.text(l, { ...tf, x: lx + 50 * k, y: y + wf.size * 1.12 + j * tf.size * 1.25, fill: c.fg }); }).join(""));
    });
  }
  s += M.part("line", { at: t0, in: "none", out: "fade", vary: false }, line);
  s += M.part("dots", { at: t0, in: "none", out: "fade" }, dots);
  return s + labels;
}
