// A handwritten note on a ruled pale-blue notebook card: the words before the key word small on top, the key line big below, a pink brush stroke swept under it.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 6);
  if (!L) return "";
  const ink = "#1E2A5A", paper = "#EEF4FF", brush = p.palette === "brand" ? c.accent : "#FF5C8A";
  const big = [L.key].concat(L.after);
  const line = big.map(function (w) { return w.w; }).join(" ");
  const bf = fitFont($, line, "display", (A.tall ? 120 : A.wide ? 100 : 110) * k * sizeOf(p.size), A.w * 0.74, { family: "Caveat", weight: 700, ls: 0 });
  const sf = { family: "Caveat", weight: 700, ls: 0.01, size: bf.size * 0.52 };
  const top = L.before.map(function (w) { return w.w; }).join(" ");
  const bw = $.measure(line, bf), tw = top ? $.measure(top, sf) : 0;
  const pad = bf.size * 0.45, cw = Math.max(bw, tw) + pad * 2, ch = bf.size * 1.05 + (top ? sf.size * 1.15 : 0) + pad * 1.4;
  const cx = W / 2, cy = captionY($, A, p.position);
  const x0 = cx - cw / 2, y0 = cy - ch / 2;
  let s = $.rect(x0, y0, cw, ch, { r: bf.size * 0.12, fill: paper });
  // Ruled lines and a margin, like a page torn from a notebook.
  const rule = bf.size * 0.42, inset = bf.size * 0.12;
  for (let ry = y0 + rule * 1.4; ry < y0 + ch - inset; ry += rule) s += $.line(x0 + inset, ry, x0 + cw - inset, ry, { stroke: "#C7D7F3", sw: Math.max(1.5, bf.size * 0.016) });
  s += $.line(x0 + pad * 0.55, y0 + inset, x0 + pad * 0.55, y0 + ch - inset, { stroke: "#FF9DB8", sw: Math.max(1.5, bf.size * 0.02) });
  const tx = x0 + pad;
  let y = y0 + pad * 0.7;
  if (top) { s += lockRun($, t, L.before, sf, tx, y, "start", ink).s; y += sf.size * 1.15; }
  s += lockRun($, t, big, bf, tx, y, "start", ink).s;
  // The brush stroke sweeps in under the key line once the key word is said.
  const since = t - (L.key.s + 0.1);
  if (since > 0) {
    const by = y + bf.size * 1.0, x1 = tx + bw * 0.98;
    const d = "M" + (tx + bf.size * 0.05) + " " + by + " C" + (tx + bw * 0.3) + " " + (by + bf.size * 0.1) + " " + (tx + bw * 0.6) + " " + (by - bf.size * 0.06) + " " + x1 + " " + (by + bf.size * 0.02);
    const e = $.E.out3($.clamp(since / 0.35));
    s += $.path(d, { stroke: brush, sw: bf.size * 0.1, draw: e }) + $.path(d, { stroke: brush, sw: bf.size * 0.05, draw: e, transform: "translate(" + bf.size * 0.06 + " " + bf.size * 0.09 + ")" });
  }
  // The card pops up from its bottom edge with a slight tilt.
  const pop = settle((t - L.g.start) / 0.3);
  s = $.g({ op: $.clamp((t - L.g.start) / 0.08), transform: $.tf({ s: Math.max(0.01, pop), r: -1.5, ox: cx, oy: y0 + ch }) }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, $.g({ extra: 'filter="url(#mg-md)"' }, s));
}
