// A curly bracket drawn along one side of a region, its point reaching out to a note: "these three", "all of
// this". The bracket draws on from its middle, then the note pops beside the point.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  const b = boxOf($, p.x, p.y, p.w, p.h);
  const side = p.side || "right";
  const vert = side === "left" || side === "right";
  // The bracket's spine runs along the chosen side; its point sticks out at the middle, deeper on longer spans.
  const L = vert ? b.h : b.w;
  const gap = 24 * k, depth = Math.max(44 * k, Math.min(96 * k, L * 0.14));
  const sx = side === "right" ? b.x + b.w + gap : side === "left" ? b.x - gap : b.x;
  const sy = side === "below" ? b.y + b.h + gap : side === "above" ? b.y - gap : b.y;
  const dir = side === "right" || side === "below" ? 1 : -1;
  const q = function (u, d) { return vert ? [sx + d * dir, sy + u] : [sx + u, sy + d * dir]; };
  const P = function (pt) { return $.fx(pt[0]) + " " + $.fx(pt[1]); };
  const h = depth / 2;
  // Two halves, each from the middle point out to an end, so it draws from the centre.
  const half = function (s0) {
    const m = L / 2, e = s0 < 0 ? 0 : L;
    return "M" + P(q(m, depth)) + "C" + P(q(m, h)) + " " + P(q(m + s0 * h, h)) + " " + P(q(m + s0 * depth, h)) +
      "L" + P(q(e - s0 * depth, h)) + "C" + P(q(e - s0 * h, h)) + " " + P(q(e, h)) + " " + P(q(e, 0));
  };
  const d = $.E.inOut2($.seg(t, tin, tin + 0.55));
  let s = M.part("bracket", { at: tin, in: "none", out: "fade" }, $.path(half(-1), { stroke: col, sw: 7 * k, draw: d }) + $.path(half(1), { stroke: col, sw: 7 * k, draw: d }));
  if (p.label) {
    const tip = q(L / 2, depth + 30 * k);
    const tg = tagAt($, p.label, tip[0] + (vert ? dir * 120 * k : 0), tip[1] + (vert ? 0 : dir * 30 * k), col, 38);
    s += M.part("label", { at: tin + 0.45, in: "pop", out: "fade", box: tg.box }, tg.markup);
  }
  return s;
}
