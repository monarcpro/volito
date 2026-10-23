function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  let s = "";
  const b = boxOf($, p.x, p.y, p.w, p.h);
  // A highlighter is yellow unless told otherwise; pens are the accent.
  const hi = p.color || c.accent2;
  let mark;
  if (p.mode === "highlight") {
    // A marker band with ragged ends, swiped on left to right.
    const j = function (i) { return ($.hash(i * 3.7) - 0.5) * 10 * k; };
    const d = "M" + (b.x - 10 * k + j(1)) + " " + (b.y + j(2)) + "L" + (b.x + b.w + 8 * k + j(3)) + " " + (b.y - 4 * k + j(4)) + "L" + (b.x + b.w + 14 * k + j(5)) + " " + (b.y + b.h + j(6)) + "L" + (b.x - 4 * k + j(7)) + " " + (b.y + b.h + 4 * k + j(8)) + "Z";
    mark = M.part("mark", { at: tin, in: "wipe", from: "left", dur: 0.45, box: { x: b.x - 20 * k, y: b.y - 12 * k, w: b.w + 40 * k, h: b.h + 24 * k } }, $.path(d, { fill: $.rgba(hi, 0.5) }));
  } else {
    const shape = p.mode === "box" ? $.hand.rect(b.x - 12 * k, b.y - 10 * k, b.w + 24 * k, b.h + 20 * k, { seed: 4, rough: 4 * k })
      : p.mode === "strike" ? $.hand.line(b.x - 10 * k, b.y + b.h * 0.55, b.x + b.w + 10 * k, b.y + b.h * 0.45, { seed: 5, rough: 3 * k })
      : $.hand.curve(b.x - 6 * k, b.y + b.h + 12 * k, b.x + b.w + 6 * k, b.y + b.h + 6 * k, { bend: 0.04, seed: 6, rough: 3 * k });
    mark = M.part("mark", { at: tin, in: "none" }, $.ink(t, tin, shape, { color: col, sw: (p.mode === "box" ? 7 : 12) * k, dur: 0.5 }));
  }
  return s + mark;
}
