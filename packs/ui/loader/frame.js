function frame(t, $) {
  var p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  var bLoad = $.beat("loading", 0.4), bOk = $.beat("success", 1.4), bFail = $.beat("failure", 2.5);
  var tf = $.font("text");
  var size = unit($, 0.055);
  var font = { size: size, weight: Math.max(600, tf.weight), family: tf.family };
  var lines = [$.case(p.loading), $.case(p.success), $.case(p.failure)];
  var iconR = size * 0.85, padX = size * 1.1, padY = size * 0.85, gap = size * 0.75;
  var tw = Math.max($.measure(lines[0], font), $.measure(lines[1], font), $.measure(lines[2], font));
  var w = padX * 2 + iconR * 2 + gap + tw, h = padY * 2 + iconR * 2;
  var x = W / 2 - w / 2, y = H / 2 - h / 2, icx = x + padX + iconR, icy = H / 2, tx = icx + iconR + gap;

  var appear = $.E.outBack($.seg(t, 0, bLoad * 0.9));
  var phase = t < bOk ? 0 : t < bFail ? 1 : 2;
  var ok = phase === 1 ? $.E.out3($.seg(t, bOk, bOk + 0.4)) : 0;
  var bad = phase === 2 ? $.E.out3($.seg(t, bFail, bFail + 0.4)) : 0;
  var shake = phase === 2 ? $.shake(t, bFail + 0.15, 9 * k, 0.4)[0] : 0;
  var tone = phase === 2 ? c.red || c.accent2 : c.accent;
  var s = uiBox($, x, y, w, h, Math.min(h / 2, Math.max(10 * k, $.style.radius)), c.surface, "md");
  // The icon: a spinner while it works (one turn a second, seamless), then a full ring with a check or a cross.
  var sw = size * 0.2;
  if (phase === 0) s += '<circle cx="' + n2(icx) + '" cy="' + n2(icy) + '" r="' + n2(iconR) + '" fill="none" stroke="' + $.mix(c.surface, c.fg, 0.12) + '" stroke-width="' + n2(sw) + '"/>' + spinnerArc(icx, icy, iconR, t >= bLoad ? loopP(t, bLoad, bOk) * Math.round(bOk - bLoad) : 0, tone, sw, 1);
  else {
    var done = phase === 1 ? ok : bad;
    s += $.ring(icx, icy, iconR, done, { color: tone, sw: sw, bg: $.mix(c.surface, c.fg, 0.12) });
    if (phase === 1) s += checkMark($, icx, icy, iconR * 1.0, $.seg(t, bOk + 0.15, bOk + 0.5), tone, sw);
    else s += crossMark($, icx, icy, iconR * 1.0, $.seg(t, bFail + 0.15, bFail + 0.5), tone, sw);
  }
  // The line: the new one rises in as the old one fades.
  var swap = phase === 0 ? 1 : $.E.out3($.seg(t, phase === 1 ? bOk + 0.1 : bFail + 0.1, (phase === 1 ? bOk : bFail) + 0.45));
  if (phase > 0 && swap < 1) s += $.text(lines[phase - 1], Object.assign({}, font, { x: tx, y: icy - size * 0.55 - swap * size * 0.6, fill: c.fg, op: 1 - swap }));
  s += $.text(lines[phase], Object.assign({}, font, { x: tx, y: icy - size * 0.55 + (1 - swap) * size * 0.6, fill: c.fg, op: swap }));
  return posed(s, W / 2, H / 2, 0.85 + 0.15 * appear, shake, (1 - appear) * 20 * k, Math.min(1, appear * 1.5));
}
