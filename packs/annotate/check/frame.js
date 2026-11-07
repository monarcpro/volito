// A verdict mark: a big hand-drawn tick (or cross) inked onto the spot in green (or red), with an optional
// word beside it — "Do this", "Not this". Put one on each side of a comparison.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const good = p.mark !== "cross";
  const col = p.color || (good ? c.green : c.red);
  const at = spot($, p.x, p.y);
  const sz = (p.size === "large" ? 220 : p.size === "small" ? 110 : 160) * k;
  // A soft disc behind the mark, then the mark inked on.
  const disc = $.circle(at[0], at[1], sz * 0.72 * Math.max(0, $.pop(t, tin, 2.6, 6.5)), { fill: $.rgba(col, 0.16) });
  const shape = good ? $.hand.check(at[0] - sz / 2, at[1] - sz / 2, sz, { seed: 4, rough: 3 * k }) : $.hand.cross(at[0], at[1], sz * 0.7, { seed: 6, rough: 3 * k });
  let s = M.part("mark", { at: tin, in: "none", out: "fade" }, disc + $.ink(t, tin + 0.1, shape, { color: col, sw: 16 * k, dur: good ? 0.4 : 0.5 }));
  if (p.label) {
    const tg = tagAt($, p.label, at[0], at[1] + sz * 0.72 + 40 * k, col, 40);
    s += M.part("label", { at: tin + 0.5, in: "pop", out: "fade", box: tg.box }, tg.markup);
  }
  return s;
}
