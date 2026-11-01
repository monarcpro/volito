function frame(t, $) {
  var p = $.data, c = $.c, k = $.k, D = $.dur;
  var tin = $.beat("in", 0.1);
  var str = $.case(p.title);
  var T = fitTitle($, str, 0.14, 220 * k);
  var settle = $.E.out3($.seg(t, tin, tin + 0.6));
  var split = (1 - settle) * T.font.size * 0.35;
  // Hits: the channels jolt apart and back, spread evenly through the hold.
  var n = Math.max(0, Math.round(Number(p.hits) || 0));
  for (var i = 1; i <= n; i++) split += $.bump(t, tin + 0.8 + ((D - tin - 1.2) * i) / (n + 1), 0.04, 0.22) * T.font.size * 0.12;
  var op = $.fadeIn(t, tin, 0.15) * $.fadeOut(t, D, 0.3);
  var base = Object.assign({}, T.font, { y: T.y, anchor: "middle" });
  var s = $.text(str, Object.assign({}, base, { x: T.x - split, fill: c.accent, op: 0.9 * op }));
  s += $.text(str, Object.assign({}, base, { x: T.x + split, fill: c.accent2 || c.accent, op: 0.9 * op }));
  s += $.text(str, Object.assign({}, base, { x: T.x, fill: c.fg, op: op }));
  return s;
}
