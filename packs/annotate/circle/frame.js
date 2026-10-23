function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  let s = "";
  const b = boxOf($, p.x, p.y, p.w, p.h);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, rx = b.w * 0.62 + 14 * k, ry = b.h * 0.62 + 14 * k;
  let loop;
  if (p.look === "clean") {
    const d = "M" + (cx + rx) + " " + cy + "A" + rx + " " + ry + " 0 1 1 " + (cx - rx) + " " + cy + "A" + rx + " " + ry + " 0 1 1 " + (cx + rx) + " " + cy;
    loop = $.path(d, { stroke: col, sw: 7 * k, draw: $.E.inOut2($.seg(t, tin, tin + 0.6)), transform: "rotate(-90 " + cx + " " + cy + ")" });
  } else {
    loop = $.ink(t, tin, $.hand.circle(cx, cy, rx, ry, { turns: 1.12, seed: 2, rough: 4 * k }), { color: col, sw: 9 * k, dur: 0.6 });
    if (p.look === "double") loop += $.ink(t, tin + 0.35, $.hand.circle(cx, cy, rx * 1.06, ry * 0.96, { turns: 1.05, seed: 9, rough: 5 * k }), { color: col, sw: 6 * k, dur: 0.5 });
  }
  s += M.part("loop", { at: tin, in: "none" }, loop);
  if (p.label) {
    const tg = tagAt($, p.label, cx + rx * 0.75, cy - ry - 34 * k, col, 36);
    s += M.part("label", { at: tin + 0.5, in: "pop", box: tg.box }, tg.markup);
  }
  return s;
}
