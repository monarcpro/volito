function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const n = Math.max(2, Math.round(p.size)), cell = Math.min(W, H) / n;
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  const ox = (W - cols * cell) / 2, oy = (H - rows * cell) / 2;
  const pal = [col.cover, col.lead, col.lead2, col.cover];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const h = $.hash(r * 17.3 + q * 5.1 + 0.4);
    const rank = p.order === "random" ? h : p.order === "center" ? Math.hypot(q - (cols - 1) / 2, r - (rows - 1) / 2) / Math.hypot(cols / 2, rows / 2) : (q + r) / (cols + rows - 2);
    const lag = rank * 0.5;
    const e = ph.before ? $.E.outBack($.clamp((ph.cover - lag) / 0.5)) : 1 - $.E.in3($.clamp((ph.uncover - lag) / 0.5));
    if (e <= 0) continue;
    const x = ox + q * cell, y = oy + r * cell, cx = x + cell / 2, cy = y + cell / 2;
    const fill = pal[Math.floor(h * 4) % 4], kind = Math.floor($.hash(r * 3.3 + q * 9.7) * 3);
    let shape;
    if (kind === 0) shape = $.circle(cx, cy, cell * 0.72 * e, { fill: fill });
    else if (kind === 1) { const rr = cell * 1.42 * e, rot = Math.floor(h * 4) * 90; shape = $.g({ transform: "rotate(" + rot + " " + cx + " " + cy + ")" }, $.path("M" + (cx - cell / 2) + " " + (cy - cell / 2) + "h" + rr + "A" + rr + " " + rr + " 0 0 1 " + (cx - cell / 2) + " " + (cy - cell / 2 + rr) + "Z", { fill: fill })); }
    else shape = $.rect(cx - cell * 0.51 * e, cy - cell * 0.51 * e, cell * 1.02 * e, cell * 1.02 * e, { fill: fill });
    s += $.clip(x - 0.5, y - 0.5, cell + 1, cell + 1, 0, shape);
  }
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  if (p.label) {
    const str = $.case(p.label), f = fitFont($, str, "display", 120 * k, Math.min(W, H * 1.4) * 0.66, { ls: -0.03 });
    const w = $.measure(str, f) + 80 * k, hh = f.size * 1.5;
    const a = Math.max(0, ph.mid - Math.min(0.3, ph.mid * 0.5));
    s += M.part("label", { at: a, in: "pop", outAt: ph.mid + ($.dur - ph.mid) * 0.2, out: "pop", outDur: 0.2, box: { x: W / 2 - w / 2, y: H / 2 - hh / 2, w: w, h: hh } },
      $.rect(W / 2 - w / 2, H / 2 - hh / 2, w, hh, { r: hh / 2, fill: col.cover }) + $.text(str, Object.assign({}, f, { x: W / 2, y: H / 2 - f.size * 0.55, anchor: "middle", fill: $.on(col.cover) })));
  }
  return s;
}
