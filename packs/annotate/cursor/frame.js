// A cursor glides in along a gentle curve, clicks the spot (a press and a ripple) and, if there is a label,
// a tooltip pops beside it. For walkthroughs over screen recordings.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  const to = spot($, p.x, p.y);
  const from = spot($, p.fromX, p.fromY);
  const arrive = tin + 0.9, click = arrive + 0.15;
  // The path: a quadratic curve that bows to one side, eased in and out.
  const u = $.E.inOut3($.seg(t, tin, arrive));
  const mx = (from[0] + to[0]) / 2 + (to[1] - from[1]) * 0.25, my = (from[1] + to[1]) / 2 - (to[0] - from[0]) * 0.25;
  const x = (1 - u) * (1 - u) * from[0] + 2 * (1 - u) * u * mx + u * u * to[0];
  const y = (1 - u) * (1 - u) * from[1] + 2 * (1 - u) * u * my + u * u * to[1];
  let s = "";
  // The ripple where it clicks.
  if (t >= click) for (let i = 0; i < 2; i++) {
    const q = $.clamp((t - click - i * 0.18) / 0.6);
    if (q > 0 && q < 1) s += $.circle(to[0], to[1], (12 + 70 * q) * k, { stroke: col, sw: 5 * k * (1 - q), op: 1 - q });
  }
  if (t >= click) s += $.circle(to[0], to[1], 14 * k, { fill: col, op: 0.35 * (1 - $.clamp((t - click) / 0.5)) });
  // The pointer itself: squashes a little on the press.
  const press = 1 - 0.14 * $.bump(t, click, 0.06, 0.18);
  const sz = 56 * k * (p.size === "large" ? 1.4 : 1);
  const arrow = "M0 0 L0 " + $.fx(sz) + " L" + $.fx(sz * 0.27) + " " + $.fx(sz * 0.76) + " L" + $.fx(sz * 0.47) + " " + $.fx(sz * 1.18) + " L" + $.fx(sz * 0.62) + " " + $.fx(sz * 1.1) + " L" + $.fx(sz * 0.43) + " " + $.fx(sz * 0.7) + " L" + $.fx(sz * 0.76) + " " + $.fx(sz * 0.7) + " Z";
  // Its shadow is an offset, translucent copy (a filter shadow on a path draws a box round it).
  s += $.g({ transform: "translate(" + $.fx(x) + " " + $.fx(y) + ") scale(" + $.fx(press) + ")" }, $.g({ transform: "translate(" + $.fx(3 * k) + " " + $.fx(5 * k) + ")" }, $.path(arrow, { fill: "#000000", op: 0.22 })) + $.path(arrow, { fill: c.ink, stroke: "#FFFFFF", sw: 3.5 * k }));
  let out = M.part("cursor", { at: tin, in: "fade", dur: 0.2, out: "fade" }, s);
  if (p.label) {
    const tg = tagAt($, p.label, to[0] + 40 * k + $.measure(String(p.label), { size: 36 * k, weight: 700 }) / 2, to[1] + sz * 1.6, col, 36);
    out += M.part("label", { at: click + 0.15, in: "pop", out: "fade", box: tg.box }, tg.markup);
  }
  return out;
}
