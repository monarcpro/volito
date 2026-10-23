function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  let s = "";
  const pts = (p.points || []).map(function (row) {
    const m = /^\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*(.*)$/.exec(String(row));
    return m ? { x: W * $.clamp(Number(m[1]) / 100), y: H * $.clamp(Number(m[2]) / 100), label: m[3] } : null;
  }).filter(Boolean);
  const r = 34 * k, nf = Object.assign({}, $.font("display"), { size: 36 * k });
  let dots = "", labels = "";
  pts.forEach(function (q, i) {
    const a = tin + i * p.gap;
    dots += M.part("markers", { at: a, in: "pop", box: { x: q.x - r, y: q.y - r, w: 2 * r, h: 2 * r } },
      $.circle(q.x, q.y, r, { fill: col, stroke: "#FFFFFF", sw: 4 * k, shadow: "md" }) + $.text(String(i + 1), Object.assign({}, nf, { x: q.x, y: q.y - nf.size * 0.56, anchor: "middle", fill: $.on(col) })) + pulse($, t, a + 0.2, q.x, q.y, r, col));
    if (q.label) {
      const tg = tagAt($, q.label, q.x + (q.x < W * 0.7 ? 1 : -1) * (r + 20 * k + $.chip.size($.case(q.label), { size: 32 * k }).w / 2), q.y, c.surface, 32);
      labels += M.part("labels", { at: a + 0.15, in: "rise", distance: 12, box: tg.box }, tg.markup);
    }
  });
  return s + dots + labels;
}
