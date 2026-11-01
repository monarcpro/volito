function frame(t, $) {
  var p = $.data, c = $.c, W = $.W, H = $.H, D = $.dur;
  var strength = $.clamp(Number(p.strength) || 0.7, 0.1, 1);
  // It swells in, drifts, and fades out by the end.
  var life = $.E.out3($.seg(t, 0, Math.min(1, D * 0.3))) * (1 - $.E.in2($.seg(t, D - Math.min(1, D * 0.3), D)));
  var u = D > 0 ? t / D : 0;
  var origin = { left: [0, 0.45], right: [1, 0.55], top: [0.5, 0], corner: [0, 0] }[p.from] || [0, 0.45];
  var dir = { left: [1, 0.15], right: [-1, -0.1], top: [0.1, 1], corner: [0.8, 0.6] }[p.from] || [1, 0.15];
  var blobs = [
    { c: c.accent, r: 0.75, d: 0.18, a: 0.55 },
    { c: c.accent2 || c.accent, r: 0.5, d: 0.32, a: 0.45 },
    { c: $.mix(c.accent2 || c.accent, "#FFFFFF", 0.55), r: 0.3, d: 0.45, a: 0.5 },
  ];
  var s = "";
  var L = Math.max(W, H);
  for (var i = 0; i < blobs.length; i++) {
    var b = blobs[i], id = $.uid();
    var x = (origin[0] + dir[0] * b.d * u) * W + Math.sin(t * 0.7 + i * 2.1) * L * 0.03;
    var y = (origin[1] + dir[1] * b.d * u) * H + Math.cos(t * 0.5 + i * 1.3) * L * 0.03;
    $.def('<radialGradient id="' + id + '"><stop offset="0%" stop-color="' + b.c + '" stop-opacity="' + f2(b.a * strength * life) + '"/><stop offset="60%" stop-color="' + b.c + '" stop-opacity="' + f2(b.a * 0.35 * strength * life) + '"/><stop offset="100%" stop-color="' + b.c + '" stop-opacity="0"/></radialGradient>');
    s += '<circle cx="' + f2(x) + '" cy="' + f2(y) + '" r="' + f2(L * b.r) + '" fill="url(#' + id + ')"/>';
  }
  return s;
}
