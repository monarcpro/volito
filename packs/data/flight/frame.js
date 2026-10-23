/** "38.7, -9.1" → [lon, lat]; a country name → its label point. */
function placeAt(s) {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(String(s || ""));
  if (m) return [Number(m[2]), Number(m[1])];
  const cn = worldFind(s);
  return cn ? cn.c : [0, 0];
}

function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const a = placeAt(p.fromAt), b = placeAt(p.toAt);
  // The great circle between them, as points (slerp on the unit sphere).
  const v = function (q) { const l = q[0] * Math.PI / 180, f = q[1] * Math.PI / 180; return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)]; };
  const va = v(a), vb = v(b);
  const om = Math.acos(Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))) || 1e-6;
  const gc = [];
  for (let i = 0; i <= 64; i++) {
    const f = i / 64, s1 = Math.sin((1 - f) * om) / Math.sin(om), s2 = Math.sin(f * om) / Math.sin(om);
    const x = s1 * va[0] + s2 * vb[0], y = s1 * va[1] + s2 * vb[1], z = s1 * va[2] + s2 * vb[2];
    gc.push([Math.atan2(y, x) * 180 / Math.PI, Math.asin(Math.max(-1, Math.min(1, z))) * 180 / Math.PI]);
  }
  // Frame both ends: centre between them (longitudes unwrapped), zoom to their spread.
  let lb = b[0];
  while (lb - a[0] > 180) lb -= 360;
  while (a[0] - lb > 180) lb += 360;
  const cen = [(a[0] + lb) / 2, (a[1] + b[1]) / 2 + 6];
  const box = { x: 0, y: 0, w: W, h: H };
  // Fit: project both ends at zoom 1, then zoom until they span 56% of the width or 45% of the height.
  const m1 = worldMap($, { x: 0, y: 0, w: W, h: H, center: cen, zoom: 1 });
  const pa = m1.project(a[0], a[1]), pb = m1.project(b[0], b[1]);
  const fit = Math.min((W * 0.56) / Math.max(1, Math.abs(pa[0] - pb[0])), (H * 0.45) / Math.max(1, Math.abs(pa[1] - pb[1])));
  const zoom = Math.min(8, Math.max(1, fit)) * (1 + 0.04 * $.E.inOut2($.seg(t, tin, $.dur)));
  const m = worldMap($, { x: box.x, y: box.y, w: box.w, h: box.h, center: cen, zoom: zoom });
  let land = "";
  m.countries.forEach(function (cn) { land += $.path(m.path(cn), { fill: $.rgba(c.fg, 0.14), stroke: c.bg, sw: 0.8 * k }); });
  s += M.part("map", { at: tin, in: "fade", dur: 0.6, out: "fade", vary: false }, '<g clip-path="url(#' + m.clipId() + ')">' + land + "</g>");
  // The route: projected points, lifted into an arc, drawn on as the plane flies.
  const pts = m.ring(gc);
  const P = pts.map(function (q, i) { const f = i / (pts.length - 1); return [q[0], q[1] - Math.sin(f * Math.PI) * Math.min(220 * k, Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]) * 0.22)]; });
  const t0 = tin + 0.9, t1 = $.beat("out", $.dur - 0.45) - 0.9;
  const run = $.E.inOut2($.seg(t, t0, t1));
  const upto = run * (P.length - 1), iu = Math.floor(upto), fu = upto - iu;
  const drawn = P.slice(0, iu + 1);
  if (iu < P.length - 1) drawn.push([P[iu][0] + (P[iu + 1][0] - P[iu][0]) * fu, P[iu][1] + (P[iu + 1][1] - P[iu][1]) * fu]);
  const dd = drawn.map(function (q, i) { return (i ? "L" : "M") + $.fx(q[0]) + " " + $.fx(q[1]); }).join("");
  const full = P.map(function (q, i) { return (i ? "L" : "M") + $.fx(q[0]) + " " + $.fx(q[1]); }).join("");
  s += M.part("route", { at: t0, in: "none", out: "fade" }, $.path(full, { stroke: $.rgba(c.fg, 0.2), sw: 3 * k, dash: 10 * k + " " + 10 * k, fill: "none" }), drawn.length > 1 ? $.path(dd, { stroke: c.accent, sw: 6 * k, fill: "none" }) : "");
  // The plane at the tip, pointing along the route.
  if (run > 0 && run < 1) {
    const tip = drawn[drawn.length - 1], prev = drawn[Math.max(0, drawn.length - 2)];
    const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]) * 180 / Math.PI;
    const sz = 30 * k;
    const plane = "M" + sz + " 0L" + -sz * 0.6 + " " + -sz * 0.75 + "L" + -sz * 0.35 + " 0L" + -sz * 0.6 + " " + sz * 0.75 + "Z";
    s += M.part("plane", { at: t0, in: "none", out: "fade" }, $.g({ transform: "translate(" + $.fx(tip[0]) + " " + $.fx(tip[1]) + ") rotate(" + $.fx(ang) + ")" }, $.path(plane, { fill: c.fg, stroke: c.bg, sw: 2 * k })));
  }
  // Pins and names at both ends.
  const nf = { ...$.font("display"), size: 40 * k };
  const pin = function (q, name, at, right) {
    const pr = 13 * k;
    return M.part("pins", { at: at, in: "pop", out: "fade", box: { x: q[0] - pr, y: q[1] - pr, w: 2 * pr, h: 2 * pr } },
      $.circle(q[0], q[1], pr, { fill: c.accent, stroke: c.bg, sw: 4 * k }),
      $.text($.case(String(name)), { ...nf, x: q[0] + (right ? 1 : -1) * 26 * k, y: q[1] - nf.size * 0.55, anchor: right ? "start" : "end", fill: c.fg, shadow: "sm" }));
  };
  const ra = P[0], rb = P[P.length - 1];
  // Names face inward, toward the middle of the frame.
  s += pin(ra, p.from, tin + 0.5, ra[0] < W / 2);
  s += pin(rb, p.to, t1 - 0.1, rb[0] < W / 2);
  if (p.note) s += M.text("note", { at: t1, in: "rise", distance: 16, out: "fade", ...$.font("mono"), size: 30 * k, ls: 0.06, x: W / 2, y: A.y + A.h - 40 * k, anchor: "middle", fill: c.mute }, String(p.note));
  return s;
}
