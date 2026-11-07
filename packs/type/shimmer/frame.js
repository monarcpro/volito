// A headline with a band of light sweeping across it: the lines rise in, then a bright sheen passes over the
// letters (and again on a loop), with a sparkle where it leaves.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  let s = ground(M, $, t);
  const text = $.case(String(p.text || ""));
  const tf = fitLines($, text, Object.assign({}, $.font("display"), { ls: -0.03 }), A.w * 0.9, (A.tall ? 190 : 170) * k, 60 * k, 3);
  const lh = tf.size * 1.04;
  const blockH = tf.lines.length * lh;
  const y0 = A.y + (A.h - blockH) / 2;
  const widest = Math.max.apply(null, tf.lines.map(function (l) { return $.measure(l, tf.font); }));
  const x0 = W / 2 - widest / 2;
  // The sheen: a gradient band in user space, sweeping from left to right every `every` seconds.
  const every = Math.max(1.2, Number(p.every) || 2.4);
  const start = tin + 0.8;
  const ph = t < start ? -1 : ((t - start) % every) / Math.min(1.1, every * 0.6);
  const band = widest * 0.28, bx = x0 - band + (widest + band * 2) * $.E.inOut2($.clamp(ph));
  const base = p.color === "fg" ? c.fg : c.accent;
  const hi = $.mix(base, "#FFFFFF", 0.85);
  const id = $.uid();
  $.def('<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + $.fx(bx - band) + '" y1="0" x2="' + $.fx(bx + band) + '" y2="' + $.fx(band * 0.4) + '"><stop offset="0" stop-color="' + base + '"/><stop offset="0.5" stop-color="' + hi + '"/><stop offset="1" stop-color="' + base + '"/></linearGradient>');
  const lit = ph >= 0 && ph <= 1;
  tf.lines.forEach(function (line, i) {
    s += M.text("text", Object.assign({ at: tin + i * 0.1, in: "rise", distance: 40 }, tf.font, { x: W / 2, y: y0 + i * lh, anchor: "middle", fill: lit ? "url(#" + id + ")" : base }), line);
  });
  // A small four-point sparkle where the sheen leaves the last line.
  const sp = $.bump(t, start + Math.min(1.1, every * 0.6) * 0.95, 0.1, 0.4);
  if (sp > 0.01) {
    const lx = W / 2 + $.measure(tf.lines[tf.lines.length - 1], tf.font) / 2 + tf.size * 0.12, ly = y0 + (tf.lines.length - 1) * lh + tf.size * 0.12, r = tf.size * 0.22 * sp;
    s += $.path("M" + lx + " " + (ly - r) + "Q" + lx + " " + ly + " " + (lx + r) + " " + ly + "Q" + lx + " " + ly + " " + lx + " " + (ly + r) + "Q" + lx + " " + ly + " " + (lx - r) + " " + ly + "Q" + lx + " " + ly + " " + lx + " " + (ly - r) + "Z", { fill: hi });
  }
  return s;
}
