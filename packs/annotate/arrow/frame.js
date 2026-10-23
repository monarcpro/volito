function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  let s = "";
  const tx = W * p.x / 100, ty = H * p.y / 100;
  const side = p.side === "auto" ? roomy($, tx, ty) : p.side;
  const v = { left: [-1, 0], right: [1, 0], above: [0, -1], below: [0, 1] }[side] || [1, 0];
  const gap = Math.min(W, H) * 0.34;
  const tg = tagAt($, p.label, tx + v[0] * gap * 1.3, ty + v[1] * gap - (v[0] ? gap * 0.35 : 0), col, 44);
  const b = tg.box, lcx = b.x + b.w / 2, lcy = b.y + b.h / 2;
  // From the label's edge facing the spot, to just short of the spot.
  const sx = v[0] ? (v[0] > 0 ? b.x - 14 * k : b.x + b.w + 14 * k) : lcx, sy = v[1] ? (v[1] > 0 ? b.y - 14 * k : b.y + b.h + 14 * k) : lcy;
  const d = Math.hypot(tx - sx, ty - sy) || 1, ex = tx - ((tx - sx) / d) * 26 * k, ey = ty - ((ty - sy) / d) * 26 * k;
  const ta = tin + 0.25;
  let arrow;
  if (p.look === "clean") {
    const bend = 0.25, mx = (sx + ex) / 2 - (ey - sy) * bend, my = (sy + ey) / 2 + (ex - sx) * bend;
    const pr = $.E.inOut2($.seg(t, ta, ta + 0.55));
    const ang = Math.atan2(ey - my, ex - mx), hl = 26 * k;
    arrow = $.path("M" + sx + " " + sy + "Q" + mx + " " + my + " " + ex + " " + ey, { stroke: col, sw: 7 * k, draw: pr });
    if (pr > 0.95) arrow += $.path("M" + (ex - hl * Math.cos(ang - 0.5)) + " " + (ey - hl * Math.sin(ang - 0.5)) + "L" + ex + " " + ey + "L" + (ex - hl * Math.cos(ang + 0.5)) + " " + (ey - hl * Math.sin(ang + 0.5)), { stroke: col, sw: 7 * k });
  } else arrow = $.ink(t, ta, $.hand.arrow(sx, sy, ex, ey, { bend: 0.22, seed: 3, rough: 3 * k }), { color: col, sw: 9 * k, dur: 0.55 });
  s += M.part("arrow", { at: ta, in: "none" }, arrow);
  s += M.part("spot", { at: ta + 0.55, in: "pop", box: { x: tx - 20 * k, y: ty - 20 * k, w: 40 * k, h: 40 * k } }, $.circle(tx, ty, 9 * k, { fill: col }) + pulse($, t, ta + 0.55, tx, ty, 12 * k, col));
  s += M.part("label", { at: tin, in: "pop", box: b }, tg.markup);
  return s;
}
