// A dimension line between two points, like a technical drawing: end ticks, arrowheads, the line drawing out
// from the middle and the measurement on a pill at its centre.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  const a = spot($, p.x1, p.y1), b = spot($, p.x2, p.y2);
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // The line grows out from the middle to both ends.
  const g = $.E.inOut2($.seg(t, tin, tin + 0.6));
  const ea = [mid[0] - ux * len / 2 * g, mid[1] - uy * len / 2 * g], eb = [mid[0] + ux * len / 2 * g, mid[1] + uy * len / 2 * g];
  const sw = 7 * k, tick = 30 * k, head = 28 * k;
  let s = $.line(ea[0], ea[1], eb[0], eb[1], { stroke: col, sw: sw, dash: p.dashed ? 14 * k + " " + 10 * k : null });
  const end = function (pt, dir, show) {
    if (!show) return "";
    const hx = pt[0], hy = pt[1];
    return $.line(hx + nx * tick, hy + ny * tick, hx - nx * tick, hy - ny * tick, { stroke: col, sw: sw }) +
      $.path("M" + $.fx(hx) + " " + $.fx(hy) + "L" + $.fx(hx - dir * ux * head + nx * head * 0.5) + " " + $.fx(hy - dir * uy * head + ny * head * 0.5) + "L" + $.fx(hx - dir * ux * head - nx * head * 0.5) + " " + $.fx(hy - dir * uy * head - ny * head * 0.5) + "Z", { fill: col });
  };
  s += end(ea, -1, g > 0.02) + end(eb, 1, g > 0.02);
  let out = M.part("line", { at: tin, in: "none", out: "fade" }, s);
  if (p.label) {
    const lf = Object.assign({}, $.font("mono"), { size: 40 * k, weight: 700 });
    const txt = String(p.label), tw = $.measure(txt, lf) + 36 * k, th = lf.size * 1.6;
    const pill = $.rect(mid[0] - tw / 2, mid[1] - th / 2, tw, th, { r: th / 2, fill: col }) + $.text(txt, Object.assign({}, lf, { x: mid[0], y: mid[1] - lf.size * 0.56, anchor: "middle", fill: $.on(col) }));
    out += M.part("label", { at: tin + 0.4, in: "pop", out: "fade", box: { x: mid[0] - tw / 2, y: mid[1] - th / 2, w: tw, h: th } }, pill);
  }
  return out;
}
