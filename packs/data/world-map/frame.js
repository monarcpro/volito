var REGIONS = { world: [10, 12, 1], americas: [-82, 8, 1.75], europe: [14, 53, 4.2], africa: [18, 2, 2.1], asia: [92, 32, 1.9], "middle east": [44, 28, 4.4], oceania: [142, -26, 2.8], india: [80, 22, 5] };

// A choropleth: every country given is shaded on one scale from a pale tint (lowest) to the accent (highest),
// filling in west to east; the top ones are labelled, with a gradient legend and the data's source beneath.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  let top = head.y;
  if (p.subtitle) {
    const sf = Object.assign({}, $.font("text"), { size: (A.tall ? 34 : 30) * k, weight: 500 });
    s += M.text("title", Object.assign({ at: tin + 0.15, in: "fade", dur: 0.4 }, sf, { x: A.x, y: top - 26 * k, fill: c.mute, maxW: A.w }), String(p.subtitle));
    top += sf.size * 1.1;
  }
  // The foot: the source on the left, the legend on the right (stacked on narrow frames).
  const ff = Object.assign({}, $.font("mono"), { size: 20 * k, ls: 0.02 });
  const legendW = Math.min(A.w * (A.tall ? 0.7 : 0.32), 380 * k), legendH = 14 * k;
  const footH = (p.legend !== false ? legendH + ff.size * 1.8 : 0) + (p.source && A.tall ? ff.size * 1.8 : 0);
  const bottom = A.y + A.h - footH - (footH ? 18 * k : 0);
  let rg = REGIONS[p.region] || REGIONS.world;
  // On a tall frame the whole world fits across the width, and a ranked list fills the room below it.
  const ranked = A.tall && (p.region || "world") === "world";
  // On a square frame the whole world is a thin strip: frame the chosen countries instead.
  if (p.region === "world" && !A.wide && !ranked) {
    const pts = (p.countries || []).map(function (r) { return worldFind(r.name); }).filter(Boolean);
    if (pts.length) {
      let sx = 0, sy = 0, lat = 0;
      pts.forEach(function (cn) { sx += Math.cos(cn.c[0] * Math.PI / 180); sy += Math.sin(cn.c[0] * Math.PI / 180); lat += cn.c[1]; });
      rg = [Math.atan2(sy, sx) * 180 / Math.PI, lat / pts.length, A.tall ? 2.3 : 1.35];
    }
  }
  // A slow push in while the countries fill.
  const zoom = rg[2] * (1 + 0.04 * $.E.inOut2($.seg(t, tin, $.dur)));
  const box = { x: A.x, y: top, w: A.w, h: ranked ? Math.min(bottom - top, A.w * 0.62) : Math.max(80 * k, bottom - top) };
  const m = worldMap($, { x: box.x, y: box.y, w: box.w, h: box.h, center: [rg[0], rg[1]], zoom: zoom });
  const picked = (p.countries || []).map(function (r) { return { r: r, c: worldFind(r.name) }; }).filter(function (q) { return q.c; });
  const vals = picked.map(function (q) { return Number(q.r.value) || 0; });
  const lo = vals.length ? Math.min.apply(null, vals) : 0, hi = vals.length ? Math.max.apply(null, vals) : 1;
  const pale = $.mix(c.bg, c.accent, 0.22);
  const shade = function (v) { return $.mix(pale, c.accent, hi > lo ? (v - lo) / (hi - lo) : 1); };
  let land = "";
  m.countries.forEach(function (cn) { land += $.path(m.path(cn), { fill: $.rgba(c.fg, 0.08), stroke: c.bg, sw: 0.8 * k }); });
  const clipId = m.clipId();
  const boxId = $.uid();
  $.def('<clipPath id="' + boxId + '"><rect x="' + box.x + '" y="' + box.y + '" width="' + box.w + '" height="' + box.h + '"/></clipPath>');
  s += '<g clip-path="url(#' + boxId + ')">' + M.part("map", { at: tin + 0.1, in: "fade", dur: 0.6, out: "fade", vary: false }, '<g clip-path="url(#' + clipId + ')">' + land + "</g>");
  // Countries fill west to east, each easing from the empty land colour to its shade.
  const sweep = picked.slice().sort(function (a, b) { return a.c.c[0] - b.c.c[0]; });
  let fills = "";
  sweep.forEach(function (q, i) {
    const at = tin + 0.6 + i * Math.min(0.12, 1.5 / Math.max(1, sweep.length));
    const f = $.E.out3($.seg(t, at, at + 0.45));
    if (f <= 0) return;
    fills += $.path(m.path(q.c), { fill: shade(Number(q.r.value) || 0), op: f, stroke: c.bg, sw: 0.8 * k });
  });
  s += M.part("highlights", { at: tin + 0.5, in: "none", out: "fade" }, '<g clip-path="url(#' + clipId + ')">' + fills + "</g>");
  // Labels for the top countries: a dot at the country, a card beside it, kept inside the map.
  const order = picked.slice().sort(function (a, b) { return b.r.value - a.r.value; });
  let labs = "";
  const lf = Object.assign({}, $.font("display"), { size: 24 * k }), vf = Object.assign({}, $.font("mono"), { size: 21 * k, weight: 700 });
  const placed = [];
  order.slice(0, ranked ? 0 : Math.round(p.labels)).forEach(function (q, i) {
    const at = tin + 1.4 + i * 0.18;
    const pt = m.project(q.c.c[0], q.c.c[1]);
    if (pt[0] < box.x || pt[0] > box.x + box.w || pt[1] < box.y || pt[1] > box.y + box.h) return;
    const name = String(q.r.name), val = fmtNum(q.r.value, p.decimals, p.prefix, p.suffix);
    const w = $.measure(name, lf) + $.measure(val, vf) + 46 * k, h = lf.size * 1.7;
    let lx = Math.max(box.x, Math.min(box.x + box.w - w, pt[0] + 18 * k)), ly = Math.max(box.y, Math.min(box.y + box.h - h, pt[1] - h - 16 * k));
    // A card that would cover one already placed moves below its dot instead.
    if (placed.some(function (b) { return lx < b.x + b.w && lx + w > b.x && ly < b.y + b.h && ly + h > b.y; })) ly = Math.min(box.y + box.h - h, pt[1] + 16 * k);
    if (placed.some(function (b) { return lx < b.x + b.w && lx + w > b.x && ly < b.y + b.h && ly + h > b.y; })) return;
    placed.push({ x: lx, y: ly, w: w, h: h });
    labs += M.part("labels", { at: at, in: "pop", origin: "bottom-left", out: "fade", box: { x: lx, y: ly, w: w, h: h } },
      $.circle(pt[0], pt[1], 7 * k, { fill: c.fg, stroke: c.bg, sw: 3 * k }),
      $.rect(lx, ly, w, h, { r: h / 2, fill: c.surface, stroke: c.line, sw: 1.5 * k }),
      $.text(name, Object.assign({}, lf, { x: lx + 18 * k, y: ly + (h - lf.size) / 2 - 1 * k, fill: c.fg })),
      $.text(val, Object.assign({}, vf, { x: lx + w - 18 * k, y: ly + (h - vf.size) / 2, anchor: "end", fill: c.accent })));
  });
  s += labs + "</g>";
  if (ranked) {
    // The ranking: the top countries as bars on the same scale, under the map.
    const rows = order.slice(0, Math.max(3, Math.min(8, Math.round(p.labels) + 2)));
    const y0 = box.y + box.h + 50 * k, avail = bottom - y0;
    const rh = Math.min(96 * k, avail / Math.max(1, rows.length));
    const nf = Object.assign({}, $.font("display"), { size: Math.min(40 * k, rh * 0.42) }), rf = Object.assign({}, $.font("mono"), { size: Math.min(30 * k, rh * 0.34), weight: 700 });
    const nameW = Math.max.apply(null, rows.map(function (q) { return $.measure(String(q.r.name), nf); })) + 24 * k;
    const valW = Math.max.apply(null, rows.map(function (q) { return $.measure(fmtNum(q.r.value, p.decimals, p.prefix, p.suffix), rf); })) + 20 * k;
    const barX = A.x + Math.min(nameW, A.w * 0.42), barW = A.x + A.w - valW - barX;
    let list = "";
    rows.forEach(function (q, i) {
      const at = tin + 1.2 + i * 0.12, y = y0 + i * rh;
      const f = $.E.out3($.seg(t, at, at + 0.6)), v = Number(q.r.value) || 0;
      list += $.text(String(q.r.name), Object.assign({}, nf, { x: A.x, y: y + (rh * 0.62 - nf.size) / 2, fill: c.fg, op: $.fadeIn(t, at, 0.3) }));
      list += $.rect(barX, y + rh * 0.62 / 2 - rh * 0.14, Math.max(2 * k, barW * (v / hi) * f), rh * 0.28, { r: rh * 0.14, fill: shade(v) });
      list += $.text(fmtNum(v, p.decimals, p.prefix, p.suffix), Object.assign({}, rf, { x: A.x + A.w, y: y + (rh * 0.62 - rf.size) / 2, anchor: "end", fill: c.accent, op: $.fadeIn(t, at + 0.3, 0.3) }));
    });
    s += M.part("labels", { at: tin + 1.1, in: "none", out: "fade" }, list);
  }
  // The foot: where the numbers come from, and the scale they are shaded on.
  let foot = "";
  const fy = A.y + A.h - (p.legend !== false ? legendH + ff.size * 1.8 : 0);
  if (p.legend !== false) {
    const lx = A.tall ? A.x : A.x + A.w - legendW;
    foot += $.rect(lx, fy, legendW, legendH, { r: legendH / 2, fill: $.gradient([pale, c.accent], { angle: 90 }) });
    foot += $.text(fmtNum(lo, p.decimals, p.prefix, p.suffix), Object.assign({}, ff, { x: lx, y: fy + legendH + 8 * k, fill: c.mute }));
    foot += $.text(fmtNum(hi, p.decimals, p.prefix, p.suffix), Object.assign({}, ff, { x: lx + legendW, y: fy + legendH + 8 * k, anchor: "end", fill: c.mute }));
  }
  if (p.source) {
    const sy = A.tall ? fy - ff.size * 1.8 : A.y + A.h - ff.size * 1.2;
    foot += $.text(String(p.source), Object.assign({}, ff, { x: A.x, y: sy, fill: c.mute, maxW: A.tall ? A.w : A.w - legendW - 40 * k }));
  }
  return s + M.part("legend", { at: tin + 0.9, in: "fade", dur: 0.5, out: "fade" }, foot);
}
