// An isometric block chart: a floor grid, then a row of blocks rising to their values one after another, the
// tallest in the accent, each with its value on top and its label on the floor in front.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const rows = (p.rows || []).slice(0, 8);
  const n = Math.max(1, rows.length);
  let top = A.y;
  if (p.title) {
    const tf = fitFont($, $.case(String(p.title)), "display", (A.tall ? 84 : 72) * k, A.w, { ls: -0.03 });
    s += M.text("title", Object.assign({ at: tin, in: "rise", distance: 24 }, tf, { x: A.x, y: A.y, fill: c.fg }), $.case(String(p.title)));
    top += tf.size * 1.5;
  }
  const max = Math.max.apply(null, rows.map(function (r) { return Number(r.value) || 0; }).concat([1]));
  const big = rows.reduce(function (b, r, i) { return (Number(r.value) || 0) > (Number(rows[b].value) || 0) ? i : b; }, 0);
  // The blocks stand along the floor's u axis; each is B wide and deep, rising up to Hmax.
  const roomH = A.y + A.h - top;
  const cs = 0.866, sn = 0.5;
  // An isometric row grows down the frame as it grows across it: fit the floor to the width and to half the
  // height, and give the blocks the rest of the height to rise into.
  const span = n * 1.5 + 2.5;
  const B = Math.min(A.w / (span * cs), (roomH * 0.5) / (span * sn), 260 * k);
  const Hmax = Math.max(roomH * 0.3, roomH - span * B * sn - 70 * k);
  const floorW = (n * 1.5 + 0.5) * B, floorD = B * 2;
  // The floor's back-left corner, placed so floor and the tallest block fit.
  const ox = W / 2 - (floorW - floorD) * cs / 2, oy = top + Hmax + 30 * k;
  const P = function (u, v, h) { return [ox + (u - v) * cs, oy + (u + v) * sn - (h || 0)]; };
  const poly = function (pts, o) { return $.path("M" + pts.map(function (q) { return $.fx(q[0]) + " " + $.fx(q[1]); }).join("L") + "Z", o); };
  let floor = poly([P(0, 0), P(floorW, 0), P(floorW, floorD), P(0, floorD)], { fill: $.rgba(c.fg, 0.04), stroke: c.line, sw: 1.5 * k });
  for (let u = B * 0.5; u < floorW; u += B * 0.5) floor += $.line(P(u, 0)[0], P(u, 0)[1], P(u, floorD)[0], P(u, floorD)[1], { stroke: $.rgba(c.fg, 0.06), sw: 1 * k });
  s += M.part("floor", { at: tin + 0.1, in: "fade", dur: 0.5, out: "fade" }, floor);
  const vf = Object.assign({}, $.font("mono"), { size: (A.tall ? 28 : 24) * k, weight: 700 }), lf = Object.assign({}, $.font("text"), { size: (A.tall ? 26 : 22) * k, weight: 600 });
  let blocks = "";
  rows.forEach(function (r, i) {
    const at = tin + 0.5 + i * 0.15, g = $.E.outBack($.seg(t, at, at + 0.7));
    const v = Number(r.value) || 0, h = Math.max(2 * k, Hmax * (v / max) * Math.max(0, g));
    const u0 = B * (0.5 + i * 1.5), v0 = B * 0.5, u1 = u0 + B, v1 = v0 + B;
    const col = i === big ? c.accent : $.mix(c.bg, c.accent2, 0.75);
    const topF = poly([P(u0, v0, h), P(u1, v0, h), P(u1, v1, h), P(u0, v1, h)], { fill: col });
    const right = poly([P(u1, v0, 0), P(u1, v1, 0), P(u1, v1, h), P(u1, v0, h)], { fill: $.mix(col, "#000000", 0.18) });
    const left = poly([P(u0, v1, 0), P(u1, v1, 0), P(u1, v1, h), P(u0, v1, h)], { fill: $.mix(col, "#000000", 0.32) });
    const tipP = P(u0 + B / 2, v0 + B / 2, h);
    let m = right + left + topF;
    m += $.text(fmtValue(v, p.suffix), Object.assign({}, vf, { x: tipP[0], y: tipP[1] - B * 0.5 - vf.size * 1.3, anchor: "middle", fill: i === big ? c.accent : c.fg, op: $.fadeIn(t, at + 0.4, 0.3) }));
    const fp = P(u0 + B / 2, v1 + B * 0.25, 0);
    m += $.text(String(r.label || ""), Object.assign({}, lf, { x: fp[0], y: fp[1] + 10 * k, anchor: "middle", fill: c.mute, op: $.fadeIn(t, at, 0.3) }));
    blocks += m;
  });
  s += M.part("blocks", { at: tin + 0.4, in: "none", out: "fade" }, blocks);
  return s;
}
function fmtValue(v, suffix) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (suffix || ""); }
