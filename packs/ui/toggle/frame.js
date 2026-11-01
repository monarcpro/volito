function frame(t, $) {
  var p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  var bOff = $.beat("off", 0.4), bOn = $.beat("turnOn", 0.7), bBack = $.beat("turnOff", 1.7);
  var tf = $.font("text");
  var size = unit($, 0.06);
  var th = size * 1.9, tw = th * 1.8, kr = th * 0.5 - 5 * k;
  var label = $.case(p.label), hint = p.hint ? p.hint : "";
  var lf = { size: size, weight: Math.max(650, tf.weight), family: tf.family };
  var hf = { size: size * 0.62, weight: 500, family: tf.family };
  var textW = Math.max($.measure(label, lf), hint ? $.measure(hint, hf) : 0);
  var gap = size * 1.4, total = textW + gap + tw;
  var x0 = W / 2 - total / 2, tx = x0 + textW + gap, ty = H / 2 - th / 2;

  var appear = $.E.outBack($.seg(t, 0, bOff * 0.9));
  // How far on: slides on at turnOn, back off at turnOff; the knob stretches while it moves.
  var on = t < bOn ? 0 : t < bBack ? $.E.inOut3($.seg(t, bOn, bOn + 0.38)) : 1 - $.E.inOut3($.seg(t, bBack, bBack + 0.38));
  var moving = t < bBack ? $.bump(t, bOn + 0.05, 0.12, 0.25) : $.bump(t, bBack + 0.05, 0.12, 0.25);
  var track = $.mix($.mix(c.surface, c.fg, 0.22), c.accent, on);
  var padX = size * 1.0, padY = size * 0.8, ch = Math.max(th, hint ? size * 1.9 : size) + padY * 2;
  var s = uiBox($, x0 - padX, H / 2 - ch / 2, total + padX * 2, ch, Math.min(ch / 2, Math.max(10 * k, $.style.radius)), c.surface, "md");
  s += $.text(label, Object.assign({}, lf, { x: x0, y: H / 2 - (hint ? size * 1.05 : size * 0.55), fill: c.fg }));
  if (hint) s += $.text(hint, Object.assign({}, hf, { x: x0, y: H / 2 + size * 0.25, fill: $.mix(c.fg, c.surface, 0.4) }));
  var g = uiBox($, tx, ty, tw, th, th / 2, track, null);
  var kx = $.lerp(tx + th / 2, tx + tw - th / 2, on);
  var stretch = 1 + 0.35 * moving;
  g += '<ellipse cx="' + n2(kx) + '" cy="' + n2(H / 2) + '" rx="' + n2(kr * stretch) + '" ry="' + n2(kr * (1 - 0.08 * moving)) + '" fill="' + $.on(c.accent) + '"/>';
  if (on > 0.6) g += checkMark($, kx, H / 2, kr * 0.9, (on - 0.6) / 0.4, c.accent, size * 0.16);
  s += g;
  return posed(s, W / 2, H / 2, 0.85 + 0.15 * appear, 0, (1 - appear) * 20 * k, Math.min(1, appear * 1.5));
}
