function frame(t, $) {
  var p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  var bIdle = $.beat("idle", 0.5), bLike = $.beat("like", 1.5), bUn = $.beat("unlike", 2.6);
  var tf = $.font("text");
  var hs = unit($, 0.17);
  var base = Math.max(0, Math.round(Number(p.count) || 0));
  var cf = { size: hs * 0.5, weight: Math.max(700, tf.weight), family: tf.family };
  var after = $.count(base + 1), before = $.count(base);
  var cw = Math.max($.measure(after, cf), $.measure(before, cf));
  var gap = hs * 0.3, total = hs + gap + cw;
  var hx = W / 2 - total / 2, hy = H / 2 - hs / 2, cx = hx + hs / 2, cy = H / 2;

  var appear = $.E.outBack($.seg(t, 0, bIdle * 0.9));
  var breathe = t >= bIdle && t < bLike ? Math.sin(loopP(t, bIdle, bLike) * Math.PI * 2) : 0;
  var liked = t < bLike ? 0 : t < bUn ? 1 : 1 - $.E.inOut2($.seg(t, bUn, bUn + 0.3));
  var popS = t >= bLike && t < bUn ? 1 + 0.45 * $.bump(t, bLike, 0.1, 0.35) : 1;
  var squash = t >= bUn ? $.bump(t, bUn, 0.08, 0.25) : 0;
  var pad = hs * 0.32, ph = hs + pad * 2;
  var s = uiBox($, hx - pad * 1.2, cy - ph / 2, total + pad * 2.6, ph, ph / 2, c.surface, "md");
  if (t >= bLike && t < bUn) s += $.burst(t, bLike + 0.05, cx, cy, { n: 12, r: hs * 1.2, colors: [c.accent, c.accent2], size: hs * 0.08, dur: 0.7 });
  // The heart: an outline that fills with the accent when liked.
  var scale = (0.7 + 0.3 * appear) * (1 + 0.04 * breathe) * (liked > 0 && t < bUn ? popS : 1) * (1 - 0.15 * squash);
  var heart = $.icon("heart", hx, hy, hs, { color: $.mix(c.fg, c.accent, liked), sw: 2.2 });
  if (liked > 0.01) heart += '<g opacity="' + n2(liked) + '">' + $.icon("heart", hx, hy, hs, { color: c.accent, fill: true }) + "</g>";
  s += posed(heart, cx, cy, scale, 0, 0, Math.min(1, appear * 1.5));
  // The count rolls: the old number slides up and out as the new one slides in.
  var roll = t < bLike ? 0 : t < bUn ? $.E.out3($.seg(t, bLike + 0.05, bLike + 0.4)) : 1 - $.E.out3($.seg(t, bUn, bUn + 0.35));
  var tx = hx + hs + gap, ty = cy - cf.size * 0.55, dy = cf.size * 0.9;
  var clip = $.uid();
  $.def('<clipPath id="' + clip + '"><rect x="' + n2(tx - 4 * k) + '" y="' + n2(cy - cf.size * 0.8) + '" width="' + n2(cw + 8 * k) + '" height="' + n2(cf.size * 1.6) + '"/></clipPath>');
  var nums = $.text(before, Object.assign({}, cf, { x: tx, y: ty - dy * roll, fill: c.fg, op: Math.max(0, 1 - roll * 2) })) + $.text(after, Object.assign({}, cf, { x: tx, y: ty + dy * (1 - roll), fill: liked > 0.5 ? c.accent : c.fg, op: Math.max(0, roll * 2 - 1) }));
  s += '<g clip-path="url(#' + clip + ')"' + (appear < 1 ? ' opacity="' + n2(Math.min(1, appear * 1.5)) + '"' : "") + ">" + nums + "</g>";
  return s;
}
