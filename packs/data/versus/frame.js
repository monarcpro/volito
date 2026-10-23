function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  // Side by side on wide and square frames, one above the other on tall ones.
  const stack = A.tall;
  const room = { x: A.x, y: head.y, w: A.w, h: A.y + A.h - head.y - 110 * k };
  const half = stack ? { w: room.w, h: room.h / 2 } : { w: room.w / 2, h: room.h };
  const vfmt = function (v) { return fmtNum(v, p.decimals, p.prefix, p.suffix); };
  const side = function (name, label, value, col, i) {
    const bx = stack ? room.x : room.x + i * half.w, by = stack ? room.y + i * half.h : room.y;
    const nf = fitFont($, vfmt(value), "display", Math.min(half.h * 0.42, 220 * k), half.w * 0.86, { ls: -0.03 });
    const lf = fitFont($, $.case(label), "text", 40 * k, half.w * 0.86);
    const cx = bx + half.w / 2, cy = by + half.h / 2;
    const num = vfmt(value * $.E.out3($.seg(t, tin + 0.5, tin + 1.6)));
    return M.part(name, { at: tin + 0.25 + i * 0.15, in: "rise", distance: 30, out: "fade", box: { x: bx, y: by, w: half.w, h: half.h } },
      $.text($.case(label), { ...lf, x: cx, y: cy - nf.size * 0.62 - lf.size * 1.4, anchor: "middle", fill: c.mute }),
      $.text(num, { ...nf, x: cx, y: cy - nf.size * 0.55, anchor: "middle", fill: col }));
  };
  s += side("left", p.left, p.leftValue, c.fg, 0);
  s += side("right", p.right, p.rightValue, c.accent, 1);
  const bcx = stack ? W / 2 : room.x + room.w / 2, bcy = stack ? room.y + room.h / 2 : room.y + room.h / 2;
  const br = 54 * k;
  s += M.part("badge", { at: tin + 0.7, in: "slam", intensity: 0.5, out: "fade", box: { x: bcx - br, y: bcy - br, w: 2 * br, h: 2 * br } },
    stack ? "" : $.line(bcx, room.y + 40 * k, bcx, room.y + room.h - 40 * k, { stroke: $.rgba(c.fg, 0.14), sw: 3 * k }),
    $.circle(bcx, bcy, br, { fill: c.accent2 }), $.text("VS", { ...$.font("display"), size: br * 0.78, x: bcx, y: bcy - br * 0.45, anchor: "middle", fill: $.on(c.accent2) }));
  // The split bar: 50/50, then the true ratio.
  const tot = (p.leftValue + p.rightValue) || 1;
  const f = 0.5 + (p.leftValue / tot - 0.5) * $.E.inOut3($.seg(t, tin + 1.1, tin + 2.1));
  const sy = A.y + A.h - 60 * k, sh = 26 * k;
  s += M.part("split", { at: tin + 0.9, in: "grow-x", origin: "center", dur: 0.4, out: "fade", box: { x: A.x, y: sy, w: A.w, h: sh } },
    $.rect(A.x, sy, A.w * f - 4 * k, sh, { r: sh / 2, fill: c.fg, op: 0.85 }), $.rect(A.x + A.w * f + 4 * k, sy, A.w * (1 - f) - 4 * k, sh, { r: sh / 2, fill: c.accent }));
  return s;
}
