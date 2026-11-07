// A right-click: the cursor arrives, clicks, a menu opens beside it (items, shortcuts, a divider), the cursor moves
// down to one item — it lights up — and clicks it; the menu closes.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const pt = at$($, p.x, p.y);
  const items = (p.items || []).slice(0, 8).map(function (r) { return typeof r === "string" ? { label: r, keys: "" } : { label: String(r.label || ""), keys: String(r.keys || "") }; });
  const pick = Math.max(0, Math.min(items.length - 1, Math.round(p.pick) - 1));
  const rc = tin + 0.9, choose = rc + 1.1, close = choose + 0.35;
  const ps = 48 * k, f = { size: 28 * k, weight: 500 }, kf = Object.assign({}, $.font("mono"), { size: 22 * k });
  const rowH = 58 * k, padY = 10 * k;
  const mw = Math.max.apply(null, items.map(function (r) { return $.measure(r.label, f) + (r.keys ? $.measure(r.keys, kf) + 60 * k : 0); }).concat([200 * k])) + 70 * k;
  const mh = padY * 2 + items.length * rowH;
  // The menu opens below-right of the click, flipping to stay on the frame.
  const mx = pt[0] + mw + 20 * k > W ? pt[0] - mw : pt[0] + 6 * k, my = pt[1] + mh + 20 * k > H ? pt[1] - mh : pt[1] + 6 * k;
  let s = "";
  const open = t > rc && t < close + 0.2;
  if (open) {
    const pop = $.E.outBack($.seg(t, rc, rc + 0.22)), fade = 1 - $.seg(t, close, close + 0.2);
    let m = $.rect(mx, my, mw, mh, { r: 16 * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: "lg" });
    const hover = t > choose - 0.45;
    items.forEach(function (r, i) {
      const y = my + padY + i * rowH;
      const lit = hover && i === pick;
      if (lit) m += $.rect(mx + 8 * k, y + 4 * k, mw - 16 * k, rowH - 8 * k, { r: 10 * k, fill: t > choose ? c.accent : $.rgba(c.accent, 0.16) });
      m += $.text(r.label, Object.assign({}, f, { x: mx + 28 * k, y: y + (rowH - f.size) / 2 - 1 * k, fill: lit && t > choose ? $.on(c.accent) : /delete|remove/i.test(r.label) ? c.red : c.fg }));
      if (r.keys) m += $.text(r.keys, Object.assign({}, kf, { x: mx + mw - 28 * k, y: y + (rowH - kf.size) / 2, anchor: "end", fill: lit && t > choose ? $.on(c.accent) : c.mute }));
      if (i < items.length - 1 && /copy|paste/i.test(r.label) && !/copy|paste/i.test(items[i + 1].label)) m += $.line(mx + 16 * k, y + rowH, mx + mw - 16 * k, y + rowH, { stroke: c.line, sw: 1.5 * k });
    });
    s += $.g({ op: Math.max(0, fade), transform: $.tf({ s: 0.85 + 0.15 * pop, ox: pt[0], oy: pt[1] }) }, m);
  }
  // The cursor: in to the spot, right-clicks, moves down to the item, clicks it.
  const itemPt = [mx + Math.min(mw * 0.45, 160 * k), my + padY + pick * rowH + rowH / 2];
  let pos;
  if (t < rc) pos = glide($, t, tin + 0.1, rc - 0.05, at$($, Number(p.x) + 22, 96), pt, 0.15);
  else if (t < choose - 0.45) pos = pt;
  else pos = glide($, t, choose - 0.45, choose - 0.05, pt, itemPt, 0.05);
  s += clickRings($, t, rc, pt[0], pt[1], c.accent, 34 * k) + clickRings($, t, choose, itemPt[0], itemPt[1], c.accent, 30 * k);
  s += pointer($, pos[0], pos[1], ps, { press: $.bump(t, rc, 0.05, 0.14) + $.bump(t, choose, 0.05, 0.14) });
  return M.part("menu", { at: tin, in: "fade", dur: 0.25, out: "fade" }, s);
}
