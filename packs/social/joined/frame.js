// Who joined: overlapping avatar badges pop in one after another, a "+12" badge closes the row, and the line
// ("Ana, Kenji and 12 others joined") types in beside or under it.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.3 : 1.15);
  const tin = $.beat("in", 0.15);
  const names = (p.names || []).map(String).filter(Boolean).slice(0, 6);
  const more = Math.max(0, Math.round(Number(p.more) || 0));
  const r = 46 * k, step = r * 1.7;
  const count = names.length + (more ? 1 : 0);
  const rowW = (count - 1) * step + 2 * r;
  const first = names.slice(0, 2).join(", ");
  const line = (first ? first + (more ? " and " + more + " others " : " ") : "") + String(p.line || "");
  // The line shrinks to fit the frame when it is set under the badges.
  const lf = fitFont($, line, "text", 34 * k, A.w - 60 * k, { weight: 600 });
  const lineW = $.measure(line, lf);
  const beside = A.wide && rowW + 30 * k + lineW < A.w * 0.9;
  const pillW = beside ? rowW + 30 * k + lineW + 50 * k : Math.max(rowW, lineW) + 60 * k, pillH = beside ? 2 * r + 30 * k : 2 * r + lf.size * 1.6 + 50 * k;
  const x = W / 2 - pillW / 2, y = A.y + A.h - pillH;
  let s = M.part("pill", { at: tin, in: "rise", distance: 40, out: "fade", box: { x: x, y: y, w: pillW, h: pillH } }, $.rect(x, y, pillW, pillH, { r: beside ? pillH / 2 : 34 * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: "lg" }));
  const ax0 = beside ? x + 25 * k + r : W / 2 - rowW / 2 + r, ay = y + 15 * k + r + (beside ? 0 : 10 * k);
  let row = "";
  names.forEach(function (nm, i) {
    const at = tin + 0.3 + i * 0.12, sc = Math.max(0, $.pop(t, at, 2.6, 7));
    if (sc <= 0) return;
    const ax = ax0 + i * step, col = nameColor($, nm);
    row += $.g({ transform: $.tf({ s: sc, ox: ax, oy: ay }) }, $.circle(ax, ay, r + 4 * k, { fill: c.surface }) + $.circle(ax, ay, r, { fill: col }) +
      $.text(initials(nm), Object.assign({}, $.font("text"), { size: r * 0.72, weight: 700, x: ax, y: ay - r * 0.42, anchor: "middle", fill: $.on(col) })));
  });
  if (more) {
    const at = tin + 0.3 + names.length * 0.12, sc = Math.max(0, $.pop(t, at, 2.6, 7));
    const ax = ax0 + names.length * step;
    if (sc > 0) row += $.g({ transform: $.tf({ s: sc, ox: ax, oy: ay }) }, $.circle(ax, ay, r + 4 * k, { fill: c.surface }) + $.circle(ax, ay, r, { fill: c.accent }) +
      $.text("+" + more, Object.assign({}, $.font("text"), { size: r * 0.62, weight: 800, x: ax, y: ay - r * 0.36, anchor: "middle", fill: $.on(c.accent) })));
  }
  s += M.part("avatars", { at: tin + 0.3, in: "none", out: "fade" }, row);
  const lx = beside ? ax0 + rowW - r + 30 * k : W / 2, ly = beside ? ay - lf.size * 0.55 : ay + r + 24 * k;
  s += M.text("line", Object.assign({ at: tin + 0.4 + count * 0.12, in: "fade", dur: 0.4, out: "fade" }, lf, { x: lx, y: ly, anchor: beside ? "start" : "middle", fill: c.fg }), $.typed(t, tin + 0.4 + count * 0.12, line, 40));
  return s;
}
