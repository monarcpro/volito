function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  let s = "";
  const b = boxOf($, p.x, p.y, p.w, p.h), m = Math.min(W, H) * 0.08;
  const q = $.clamp($.spring(Math.max(0, t - tin), 2.2, 6.5), 0, 1.15);
  const bx = $.lerp(m, b.x, q), by = $.lerp(m, b.y, q), bw = $.lerp(W - 2 * m, b.w, q), bh = $.lerp(H - 2 * m, b.h, q);
  const lock = tin + 0.7, locked = t >= lock;
  const blink = locked && t < lock + 0.3 && Math.floor((t - lock) * 14) % 2 === 1;
  const stroke = locked ? col : "#FFFFFF", L = Math.min(bw, bh) * 0.22, sw = 6 * k;
  const corner = function (x, y, dx, dy) { return $.path("M" + x + " " + (y + dy * L) + "V" + y + "H" + (x + dx * L), { stroke: stroke, sw: sw, cap: "square", join: "miter" }); };
  const br = corner(bx, by, 1, 1) + corner(bx + bw, by, -1, 1) + corner(bx, by + bh, 1, -1) + corner(bx + bw, by + bh, -1, -1);
  s += M.part("brackets", { at: tin, in: "fade", dur: 0.2 }, blink ? "" : br);
  const cx = bx + bw / 2, cy = by + bh / 2, cr = 18 * k;
  s += M.part("cross", { at: lock, in: "pop", box: { x: cx - cr, y: cy - cr, w: 2 * cr, h: 2 * cr } }, $.path("M" + (cx - cr) + " " + cy + "H" + (cx - 6 * k) + "M" + (cx + 6 * k) + " " + cy + "H" + (cx + cr) + "M" + cx + " " + (cy - cr) + "V" + (cy - 6 * k) + "M" + cx + " " + (cy + 6 * k) + "V" + (cy + cr), { stroke: col, sw: 3 * k }));
  if (p.label) {
    const txt = $.case(p.label), f = Object.assign({}, $.font("mono"), { size: 30 * k });
    const w = $.measure(txt, f) + 28 * k, h = 48 * k;
    const lx = Math.min(W - w - 20 * k, Math.max(20 * k, b.x)), ly = b.y - h - 14 * k > 20 * k ? b.y - h - 14 * k : b.y + b.h + 14 * k;
    s += M.part("label", { at: lock + 0.1, in: "wipe", from: "left", box: { x: lx, y: ly, w: w, h: h } }, $.rect(lx, ly, w, h, { fill: col }) + $.text(txt, Object.assign({}, f, { x: lx + 14 * k, y: ly + (h - f.size) / 2 - 2 * k, fill: $.on(col) })));
  }
  return s;
}
