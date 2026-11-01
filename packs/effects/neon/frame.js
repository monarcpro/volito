function frame(t, $) {
  var p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  var on = $.beat("on", 0.3);
  var str = $.case(p.title), sub = p.subtitle ? $.case(p.subtitle) : "";
  var T = fitTitle($, str, 0.14, 210 * k);
  var tube = c.accent, tube2 = c.accent2 || c.accent;
  // Strikes on with a few hard flickers, then hums (a slight shimmer of brightness).
  var flick = [0, 0.06, 0.1, 0.16, 0.22, 0.3, 0.34];
  var lit = t < on ? 0 : 1;
  for (var i = 0; i < flick.length; i += 2) if (t >= on + flick[i] && t < on + flick[i + 1]) lit = 0.15;
  var hum = 0.93 + 0.07 * Math.sin(t * 47) * Math.sin(t * 13);
  var b = lit * (t > on + 0.4 ? hum : 1);
  var glow = glowFilter($, T.font.size * 0.12, 2);
  var dark = $.mix(c.ink || "#000000", "#000000", 0.35);
  var s = '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + dark + '"/>';
  // The unlit tubes stay faintly visible; the lit ones glow.
  var base = Object.assign({}, T.font, { x: T.x, y: T.y - (sub ? T.font.size * 0.3 : 0), anchor: "middle", fill: "none", stroke: $.mix(dark, tube, 0.25), sw: T.font.size * 0.045 });
  s += $.text(str, base);
  if (b > 0) s += '<g filter="url(#' + glow + ')" opacity="' + f2(b) + '">' + $.text(str, Object.assign({}, base, { stroke: tube })) + $.text(str, Object.assign({}, base, { stroke: $.mix(tube, "#FFFFFF", 0.6), sw: T.font.size * 0.015 })) + "</g>";
  if (sub) {
    var sf = { size: T.font.size * 0.3, weight: 600, family: $.font("text").family };
    var sb = $.seg(t, on + 0.5, on + 0.6) * hum;
    var sy = T.y + T.font.size * 1.0;
    s += $.text(sub, Object.assign({}, sf, { x: T.x, y: sy, anchor: "middle", fill: "none", stroke: $.mix(dark, tube2, 0.25), sw: sf.size * 0.05 }));
    if (sb > 0) s += '<g filter="url(#' + glow + ')" opacity="' + f2(sb) + '">' + $.text(sub, Object.assign({}, sf, { x: T.x, y: sy, anchor: "middle", fill: "none", stroke: tube2, sw: sf.size * 0.06 })) + "</g>";
  }
  return s;
}
