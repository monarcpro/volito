var REGIONS = { world: [10, 12, 1], americas: [-82, 8, 1.75], europe: [14, 53, 4.2], africa: [18, 2, 2.1], asia: [92, 32, 1.9], "middle east": [44, 28, 4.4], oceania: [142, -26, 2.8], india: [80, 22, 5] };

function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  let rg = REGIONS[p.region] || REGIONS.world;
  // On narrow frames the whole world is a thin strip: frame the chosen countries instead.
  if (p.region === "world" && !A.wide) {
    const pts = (p.countries || []).map(function (r) { return worldFind(r.name); }).filter(Boolean);
    if (pts.length) {
      let sx = 0, sy = 0, lat = 0;
      pts.forEach(function (cn) { sx += Math.cos(cn.c[0] * Math.PI / 180); sy += Math.sin(cn.c[0] * Math.PI / 180); lat += cn.c[1]; });
      rg = [Math.atan2(sy, sx) * 180 / Math.PI, lat / pts.length, A.tall ? 1.9 : 1.3];
    }
  }
  // A slow push in while the countries fill.
  const zoom = rg[2] * (1 + 0.05 * $.E.inOut2($.seg(t, tin, $.dur)));
  const box = { x: A.x, y: head.y, w: A.w, h: A.y + A.h - head.y };
  const m = worldMap($, { x: box.x, y: box.y, w: box.w, h: box.h, center: [rg[0], rg[1]], zoom: zoom });
  const picked = (p.countries || []).map(function (r) { return { r: r, c: worldFind(r.name) }; }).filter(function (q) { return q.c; });
  const maxV = Math.max.apply(null, picked.map(function (q) { return q.r.value; }).concat([1e-9]));
  const base = $.rgba(c.fg, 0.13);
  let land = "";
  m.countries.forEach(function (cn) { land += $.path(m.path(cn), { fill: base, stroke: c.bg, sw: 0.8 * k }); });
  const clipId = m.clipId();
  const mapBox = '<clipPath id="mmbox"><rect x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h + '"/></clipPath>';
  $.def(mapBox);
  s += '<g clip-path="url(#mmbox)">' + M.part("map", { at: tin + 0.1, in: "fade", dur: 0.6, out: "fade", vary: false }, '<g clip-path="url(#' + clipId + ')">' + land + "</g>");
  // Countries fill in order of value, each shaded by its share of the largest.
  const order = picked.slice().sort(function (a, b) { return b.r.value - a.r.value; });
  let hi = "";
  order.forEach(function (q, i) {
    const at = tin + 0.6 + i * Math.min(0.18, 1.6 / order.length);
    const f = $.E.out3($.seg(t, at, at + 0.4));
    if (f <= 0) return;
    const shade = 0.35 + 0.65 * (q.r.value / maxV);
    hi += $.path(m.path(q.c), { fill: c.accent, op: shade * f, stroke: c.bg, sw: 0.8 * k });
  });
  s += M.part("highlights", { at: tin + 0.5, in: "none", out: "fade" }, '<g clip-path="url(#' + clipId + ')">' + hi + "</g>");
  // Labels for the top countries, at their label points, kept inside the map box.
  let labs = "";
  const lf = { ...$.font("display"), size: 26 * k }, vf = { ...$.font("mono"), size: 22 * k, weight: 700 };
  order.slice(0, Math.round(p.labels)).forEach(function (q, i) {
    const at = tin + 1.2 + i * 0.2;
    const pt = m.project(q.c.c[0], q.c.c[1]);
    if (pt[0] < box.x || pt[0] > box.x + box.w || pt[1] < box.y || pt[1] > box.y + box.h) return;
    const name = String(q.r.name), val = fmtNum(q.r.value, p.decimals, p.prefix, p.suffix);
    const w = Math.max($.measure(name, lf), $.measure(val, vf)) + 28 * k, h = lf.size * 1.25 + vf.size * 1.3 + 16 * k;
    const lx = Math.max(box.x, Math.min(box.x + box.w - w, pt[0] + 14 * k)), ly = Math.max(box.y, Math.min(box.y + box.h - h, pt[1] - h - 14 * k));
    labs += M.part("labels", { at: at, in: "pop", origin: "bottom-left", out: "fade", box: { x: lx, y: ly, w: w, h: h } },
      $.circle(pt[0], pt[1], 7 * k, { fill: c.fg, stroke: c.bg, sw: 3 * k }),
      $.rect(lx, ly, w, h, { r: 10 * k, fill: c.surface, shadow: "md" }),
      $.text(name, { ...lf, x: lx + 14 * k, y: ly + 8 * k, fill: c.fg }),
      $.text(val, { ...vf, x: lx + 14 * k, y: ly + 8 * k + lf.size * 1.25, fill: c.accent }));
  });
  return s + labs + "</g>";
}
