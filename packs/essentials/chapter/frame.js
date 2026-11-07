// A chapter card: a huge outlined number, the chapter's name under a small kicker, and a row of segments that
// shows where this chapter sits among all of them, the current one filling in.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const total = Math.max(1, Math.min(12, Math.round(p.total))), cur = Math.max(1, Math.min(total, Math.round(p.number)));
  const num = (cur < 10 ? "0" : "") + cur;
  const side = A.wide;
  const nf = fitFont($, num, "display", Math.min(side ? A.h * 0.7 : A.h * 0.32, 520 * k), side ? A.w * 0.42 : A.w * 0.8, { ls: -0.04 });
  const title = $.case(String(p.title || ""));
  const tf = fitLines($, title, Object.assign({}, $.font("display"), { ls: -0.03 }), side ? A.w * 0.5 : A.w, (side ? 110 : 120) * k, 50 * k, 2);
  const kf = Object.assign({}, $.font("mono"), { size: 28 * k, ls: 0.12, weight: 700 });
  const kicker = String(p.kicker || "Chapter").toUpperCase() + "  " + cur + " / " + total;
  // Wide: number left, words right. Otherwise: number above, words under it.
  const blockH = kf.size * 2 + tf.lines.length * tf.size * 1.05 + 90 * k;
  // Stacked: the number and the words as one block, centred.
  const nx = side ? A.x : W / 2, ny = side ? A.y + (A.h - nf.size) / 2 - nf.size * 0.05 : A.y + Math.max(0, (A.h - nf.size * 1.02 - 40 * k - blockH) / 2);
  const wx = side ? A.x + A.w * 0.5 : W / 2, anchor = side ? "start" : "middle";
  const wy = side ? A.y + (A.h - blockH) / 2 : ny + nf.size * 1.02 + 40 * k;
  // The number: drawn as an outline that fills from the bottom once it lands.
  const fillP = $.E.inOut2($.seg(t, tin + 0.5, tin + 1.3));
  const clipId = $.uid();
  $.def('<clipPath id="' + clipId + '"><rect x="' + (nx - (side ? 0 : nf.size * 2)) + '" y="' + (ny + nf.size * (1 - fillP)) + '" width="' + nf.size * 4 + '" height="' + nf.size * 1.2 + '"/></clipPath>');
  const numM = $.text(num, Object.assign({}, nf, { x: nx, y: ny, anchor: anchor, fill: "none", stroke: c.accent, sw: 4 * k })) +
    '<g clip-path="url(#' + clipId + ')">' + $.text(num, Object.assign({}, nf, { x: nx, y: ny, anchor: anchor, fill: c.accent })) + "</g>";
  s += M.part("number", { at: tin, in: "rise", distance: 60, out: "fade", box: { x: side ? nx : nx - nf.size, y: ny, w: nf.size * 2, h: nf.size } }, numM);
  s += M.text("kicker", Object.assign({ at: tin + 0.25, in: "fade", dur: 0.4 }, kf, { x: wx, y: wy, anchor: anchor, fill: c.mute }), kicker);
  tf.lines.forEach(function (line, i) { s += M.text("title", Object.assign({ at: tin + 0.35 + i * 0.1, in: "rise", distance: 30 }, tf.font, { x: wx, y: wy + kf.size * 2 + i * tf.size * 1.05, anchor: anchor, fill: c.fg }), line); });
  // The segments: one per chapter, done ones solid, this one filling, the rest faint.
  const segW = Math.min((side ? A.w * 0.46 : A.w * 0.8) / total, 90 * k), segH = 10 * k, gap = 10 * k;
  const rowW = total * segW + (total - 1) * gap;
  const sx = side ? wx : W / 2 - rowW / 2, sy = wy + kf.size * 2 + tf.lines.length * tf.size * 1.05 + 50 * k;
  let segs = "";
  for (let i = 0; i < total; i++) {
    const x = sx + i * (segW + gap);
    segs += $.rect(x, sy, segW, segH, { r: segH / 2, fill: $.rgba(c.fg, 0.14) });
    const f = i + 1 < cur ? 1 : i + 1 === cur ? $.E.inOut2($.seg(t, tin + 0.7, tin + 1.6)) : 0;
    if (f > 0) segs += $.rect(x, sy, segW * f, segH, { r: segH / 2, fill: i + 1 === cur ? c.accent : c.fg });
  }
  s += M.part("progress", { at: tin + 0.5, in: "fade", dur: 0.4, out: "fade" }, segs);
  return s;
}
