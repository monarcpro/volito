// A hand-drawn box round something, with a label on a tab that hangs off its corner: "the new menu", "fixed".
// The box inks on corner to corner, then the tab drops in.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  const b = boxOf($, p.x, p.y, p.w, p.h);
  const pad = 14 * k;
  const box = p.look === "clean"
    ? $.path("M" + (b.x - pad) + " " + (b.y - pad) + "H" + (b.x + b.w + pad) + "V" + (b.y + b.h + pad) + "H" + (b.x - pad) + "Z", { stroke: col, sw: 6 * k, draw: $.E.inOut2($.seg(t, tin, tin + 0.6)) })
    : $.ink(t, tin, $.hand.rect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2, { seed: 5, rough: 4 * k }), { color: col, sw: 8 * k, dur: 0.7 });
  let s = M.part("box", { at: tin, in: "none", out: "fade" }, box);
  if (p.label) {
    // The tab: on the top edge, flush with the box's left corner, unless that runs off the frame.
    const lf = Object.assign({}, $.font("display"), { size: 34 * k });
    const txt = $.case(String(p.label)), tw = $.measure(txt, lf) + 40 * k, th = lf.size * 1.55;
    const above = b.y - pad - th > 20 * k;
    const tx = Math.min(W - tw - 20 * k, Math.max(20 * k, b.x - pad)), ty = above ? b.y - pad - th + 4 * k : b.y + b.h + pad - 4 * k;
    const tab = $.rect(tx, ty, tw, th, { r: 10 * k, fill: col }) + $.text(txt, Object.assign({}, lf, { x: tx + 20 * k, y: ty + (th - lf.size) / 2 - 1 * k, fill: $.on(col) }));
    s += M.part("label", { at: tin + 0.55, in: "drop", distance: 24, ease: "bouncy", out: "fade", box: { x: tx, y: ty, w: tw, h: th } }, tab);
  }
  return s;
}
