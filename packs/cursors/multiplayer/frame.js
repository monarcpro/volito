// Several people's cursors at once, each with its name tag in its own colour, drifting over the frame on their own
// paths and clicking now and then — a live, shared document.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const names = (p.names || []).map(String).filter(Boolean).slice(0, 6);
  const ps = 46 * k, size = 26 * k;
  const sp = Number(p.speed) || 1;
  let s = "";
  names.forEach(function (nm, i) {
    const col = personColor($, i);
    // A slow Lissajous wander, different for each person, kept inside the frame.
    const ph = $.hash(i * 7.3) * 6.28, fx = 0.13 + 0.07 * $.hash(i * 3.1), fy = 0.17 + 0.06 * $.hash(i * 5.9);
    const x = W * (0.5 + 0.34 * Math.sin((t - tin) * fx * sp * 2.2 + ph) * Math.cos((t - tin) * 0.07 * sp + i));
    const y = H * (0.48 + 0.3 * Math.sin((t - tin) * fy * sp * 2.6 + ph * 1.7));
    const appear = $.clamp((t - tin - i * 0.25) / 0.3);
    if (appear <= 0) return;
    // A click every few seconds, at a different time for each.
    const period = 2.6 + i * 0.4, last = tin + 0.8 + i * 0.5 + Math.floor(Math.max(0, t - tin - 0.8 - i * 0.5) / period) * period;
    let m = clickRings($, t, last, x, y, col, 36 * k);
    m += pointer($, x, y, ps, { fill: col, press: $.bump(t, last, 0.05, 0.14) });
    const tag = nameTag($, 0, 0, nm, col, size);
    m += '<g transform="translate(' + $.fx(Math.min(W - tag.w - 10 * k, x + ps * 0.55)) + " " + $.fx(Math.min(H - tag.h - 10 * k, y + ps * 1.05)) + ')">' + tag.m + "</g>";
    s += $.g({ op: appear }, m);
  });
  return M.part("cursors", { at: tin, in: "none", out: "fade" }, s);
}
