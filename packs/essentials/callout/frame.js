function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const sx = W * p.x, sy = H * p.y;
  const label = $.case(p.label);
  const lf = fitFont($, label, "display", 46 * k, A.w * 0.5);
  const df = Object.assign({}, $.font("text"), { size: 30 * k });
  const hasIcon = !!p.icon && $.icons.indexOf(p.icon) >= 0;
  const iw = hasIcon ? 64 * k : 0;
  const cw = Math.max($.measure(label, lf), p.detail ? $.measure(p.detail, df) : 0) + iw + 72 * k;
  const ch = lf.size * 1.15 + (p.detail ? df.size * 1.35 : 0) + 56 * k;
  // The label sits where there is room: away from the nearer edge.
  let side = p.side;
  if (side === "auto") side = A.wide ? (p.x > 0.5 ? "left" : "right") : p.y > 0.5 ? "above" : "below";
  const gap = 150 * k;
  let cx = side === "left" ? sx - gap - cw : side === "right" ? sx + gap : sx - cw / 2;
  let cy = side === "above" ? sy - gap - ch : side === "below" ? sy + gap : sy - ch / 2;
  cx = Math.max(A.x, Math.min(W - A.x - cw, cx));
  cy = Math.max(A.y, Math.min(A.y + A.h - ch, cy));
  // The line runs from the spot to the card's nearest edge.
  const ex = side === "left" ? cx + cw : side === "right" ? cx : Math.max(cx + 30 * k, Math.min(cx + cw - 30 * k, sx));
  const ey = side === "above" ? cy + ch : side === "below" ? cy : Math.max(cy + 20 * k, Math.min(cy + ch - 20 * k, sy));
  const dl = Math.hypot(ex - sx, ey - sy) || 1;
  const r0 = 26 * k;
  const lx = sx + ((ex - sx) / dl) * r0, ly = sy + ((ey - sy) / dl) * r0;
  // The line draws out from the spot: a wipe from the spot's side.
  const lineFrom = Math.abs(ex - sx) > Math.abs(ey - sy) ? (ex > sx ? "left" : "right") : ey > sy ? "up" : "down";

  const pulse = ((t - tin) % 1.4) / 1.4;
  let s = M.part("pulse", { at: tin, in: "fade", dur: 0.2, box: { x: sx - 70 * k, y: sy - 70 * k, w: 140 * k, h: 140 * k } },
    t > tin ? $.circle(sx, sy, (18 + 50 * $.E.out3(pulse)) * k, { stroke: c.accent, sw: 4 * k * (1 - pulse), op: 1 - pulse }) : "");
  s += M.part("dot", { at: tin, in: "pop", box: { x: sx - 21 * k, y: sy - 21 * k, w: 42 * k, h: 42 * k } }, $.circle(sx, sy, 16 * k, { fill: c.accent, stroke: "#FFFFFF", sw: 5 * k, shadow: "sm" }));
  s += M.part("line", { at: tin + 0.25, in: "wipe", from: lineFrom, ease: "inOut", dur: 0.35, box: { x: Math.min(lx, ex) - 4 * k, y: Math.min(ly, ey) - 4 * k, w: Math.abs(ex - lx) + 8 * k, h: Math.abs(ey - ly) + 8 * k } },
    $.line(lx, ly, ex, ey, { stroke: "#FFFFFF", sw: 4 * k }));
  let card = $.card(cx, cy, cw, ch, { shadow: "lg" });
  if (hasIcon) card += $.rect(cx + 28 * k, cy + 28 * k, 48 * k, 48 * k, { r: 14 * k, fill: c.tint }) + $.icon(p.icon, cx + 36 * k, cy + 36 * k, 32 * k, { color: c.accent });
  card += $.text(label, Object.assign({}, lf, { x: cx + 36 * k + iw, y: cy + 28 * k }));
  if (p.detail) card += $.text(p.detail, Object.assign({}, df, { x: cx + 36 * k + iw, y: cy + 28 * k + lf.size * 1.2, fill: c.mute }));
  s += M.part("card", { at: tin + 0.55, in: "pop", box: { x: cx, y: cy, w: cw, h: ch }, ox: ex, oy: ey }, card);
  return s;
}
