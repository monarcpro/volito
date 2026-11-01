function frame(t, $) {
  var p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  var tin = $.beat("in", 0.2);
  var L = Math.min(W, H);
  // The ground: the brand's ground with three soft colour fields drifting on slow loops.
  var fields = [
    { col: c.accent, x: 0.3, y: 0.35, r: 0.42, sp: 0.21 },
    { col: c.accent2 || c.accent, x: 0.72, y: 0.62, r: 0.36, sp: 0.17 },
    { col: $.mix(c.accent, c.accent2 || c.accent, 0.5), x: 0.55, y: 0.2, r: 0.28, sp: 0.27 },
  ];
  var blobs = "";
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var x = (f.x + Math.sin(t * f.sp * 2 + i) * 0.06) * W, y = (f.y + Math.cos(t * f.sp * 2 + i * 1.7) * 0.06) * H;
    blobs += '<circle cx="' + f2(x) + '" cy="' + f2(y) + '" r="' + f2(L * f.r) + '" fill="' + f.col + '"/>';
  }
  var soft = $.uid();
  $.def('<filter id="' + soft + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + f2(L * 0.08) + '"/></filter>');
  var s = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + c.bg + '"/><g filter="url(#' + soft + ')">' + blobs + "</g>";

  // The glass: the same fields blurred harder, clipped to the card, a frost over them and a lit edge.
  var A = safeArea($);
  var title = $.case(p.title), sub = p.subtitle ? $.case(p.subtitle) : "", kick = p.kicker ? $.case(p.kicker) : "";
  var tf = fitFont($, title, "display", L * 0.11, A.w * 0.72, { ls: -0.03 });
  var sf = { size: tf.size * 0.32, weight: 500, family: $.font("text").family };
  var cw = Math.min(A.w, Math.max($.measure(title, tf), sub ? $.measure(sub, sf) : 0) + tf.size * 1.6);
  var ch = tf.size * (sub ? 2.4 : 1.8) + (kick ? tf.size * 0.7 : 0);
  var rise = $.E.out3($.seg(t, tin, tin + 0.7));
  var cx = W / 2 - cw / 2, cy = H / 2 - ch / 2 + (1 - rise) * 40 * k;
  var r = Math.min(ch * 0.25, Math.max(14 * k, $.style.radius));
  var clip = $.uid(), frost = $.uid(), edge = $.uid();
  $.def('<clipPath id="' + clip + '"><rect x="' + f2(cx) + '" y="' + f2(cy) + '" width="' + f2(cw) + '" height="' + f2(ch) + '" rx="' + f2(r) + '"/></clipPath>');
  $.def('<filter id="' + frost + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="' + f2(L * 0.14) + '"/></filter>');
  var sweep = $.seg(t, tin + 0.4, tin + 1.6);
  $.def('<linearGradient id="' + edge + '" x1="0" y1="0" x2="1" y2="1"><stop offset="' + f2(Math.max(0, sweep - 0.25)) + '" stop-color="#FFFFFF" stop-opacity="0.15"/><stop offset="' + f2(sweep) + '" stop-color="#FFFFFF" stop-opacity="0.85"/><stop offset="' + f2(Math.min(1, sweep + 0.25)) + '" stop-color="#FFFFFF" stop-opacity="0.15"/></linearGradient>');
  var glass = '<g clip-path="url(#' + clip + ')"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + c.bg + '"/><g filter="url(#' + frost + ')">' + blobs + '</g><rect x="' + f2(cx) + '" y="' + f2(cy) + '" width="' + f2(cw) + '" height="' + f2(ch) + '" fill="#FFFFFF" fill-opacity="0.16"/></g>';
  glass += '<rect x="' + f2(cx) + '" y="' + f2(cy) + '" width="' + f2(cw) + '" height="' + f2(ch) + '" rx="' + f2(r) + '" fill="none" stroke="url(#' + edge + ')" stroke-width="' + f2(2.5 * k) + '"/>';
  var ty = cy + ch / 2 - (sub ? tf.size * 0.85 : tf.size * 0.56) + (kick ? tf.size * 0.35 : 0);
  if (kick) glass += $.chip(kick, W / 2, cy + tf.size * 0.35, { size: tf.size * 0.26, anchor: "middle", fill: c.accent, color: $.on(c.accent) });
  glass += $.text(title, Object.assign({}, tf, { x: W / 2, y: ty, anchor: "middle", fill: c.fg }));
  if (sub) glass += $.text(sub, Object.assign({}, sf, { x: W / 2, y: ty + tf.size * 1.15, anchor: "middle", fill: c.fg, op: 0.82 }));
  s += '<g opacity="' + f2(Math.min(1, rise * 1.4)) + '">' + glass + "</g>";
  return s;
}
