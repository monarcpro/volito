// A progress card for footage: an icon, what is happening, a striped bar filling with the percentage counting
// up beside it, then a check and the done line when it reaches the end.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  const w = Math.min(A.w, (A.wide ? 760 : 900) * k), pad = 30 * k, ic = 64 * k;
  const lf = Object.assign({}, $.font("display"), { size: 36 * k });
  const mf = Object.assign({}, $.font("mono"), { size: 26 * k, weight: 700 });
  const barH = 18 * k;
  const h = pad * 2 + Math.max(ic, lf.size * 1.3) + 30 * k + barH;
  const x = W / 2 - w / 2;
  const y = p.position === "top" ? A.y : p.position === "center" ? H / 2 - h / 2 : A.y + A.h - h;
  // The fill runs from 0 to the target over the time the card holds, easing out near the end.
  const end = $.beat("out", $.dur - 0.45) - 0.6, target = Math.max(0, Math.min(100, Number(p.value) || 0));
  const f = target / 100 * $.E.inOut2($.seg(t, tin + 0.4, end));
  const done = target >= 100 && t >= end;
  let m = $.rect(x, y, w, h, { r: 26 * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: "lg" });
  const icx = x + pad, icy = y + pad;
  m += $.rect(icx, icy, ic, ic, { r: ic * 0.28, fill: done ? c.green : c.accent });
  if (done) m += $.path("M" + $.fx(icx + ic * 0.27) + " " + $.fx(icy + ic * 0.52) + "L" + $.fx(icx + ic * 0.44) + " " + $.fx(icy + ic * 0.68) + "L" + $.fx(icx + ic * 0.74) + " " + $.fx(icy + ic * 0.34), { stroke: $.on(c.green), sw: 6 * k, draw: $.E.out3($.seg(t, end, end + 0.3)) });
  else m += $.icon(p.icon || "download", icx + ic * 0.22, icy + ic * 0.22, ic * 0.56, { color: $.on(c.accent), sw: 2.6 });
  const tx = icx + ic + 24 * k;
  const label = done && p.done ? String(p.done) : String(p.label || "");
  m += $.text(label, Object.assign({}, lf, { x: tx, y: icy + (ic - lf.size) / 2 - 2 * k, fill: c.fg, maxW: w - (tx - x) - pad - 120 * k }));
  m += $.text(Math.round(f * 100) + "%", Object.assign({}, mf, { x: x + w - pad, y: icy + (ic - mf.size) / 2, anchor: "end", fill: done ? c.green : c.accent }));
  const bx = x + pad, by = y + h - pad - barH, bw = w - pad * 2;
  m += $.rect(bx, by, bw, barH, { r: barH / 2, fill: $.rgba(c.fg, 0.1) });
  if (f > 0) {
    // Moving stripes inside the fill while it works.
    const fw = Math.max(barH, bw * f), id = $.uid();
    $.def('<pattern id="' + id + '" width="' + 24 * k + '" height="' + 24 * k + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45) translate(' + $.fx((t * 40 * k) % (24 * k)) + ' 0)"><rect width="' + 12 * k + '" height="' + 24 * k + '" fill="#FFFFFF" fill-opacity="0.22"/></pattern>');
    m += $.rect(bx, by, fw, barH, { r: barH / 2, fill: done ? c.green : c.accent });
    if (!done) m += $.rect(bx, by, fw, barH, { r: barH / 2, fill: "url(#" + id + ")" });
  }
  return M.part("card", { at: tin, in: "rise", distance: 50, ease: "bouncy", out: "fade", box: { x: x, y: y, w: w, h: h } }, m);
}
