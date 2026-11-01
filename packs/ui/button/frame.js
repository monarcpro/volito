function frame(t, $) {
  var p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  var bIdle = $.beat("idle", 0.6), bHi = $.beat("hoverIn", 1.6), bHo = $.beat("hoverOut", 1.9), bPress = $.beat("press", 2.2), bLoad = $.beat("loading", 2.6), bDone = $.beat("done", 3.6);
  var tf = $.font("text");
  var size = unit($, 0.07);
  var font = { size: size, weight: Math.max(700, tf.weight), family: tf.family };
  var label = $.case(p.label), done = $.case(p.done || p.label);
  var iconS = size * 1.0, gap = size * 0.55, padX = size * 1.25, h = size * 2.4;
  var lw = Math.max($.measure(label, font), $.measure(done, font) + iconS + gap);
  var w = padX * 2 + lw + (p.icon ? iconS + gap : 0);
  var cx = W / 2, cy = H / 2;
  var r = Math.min(h / 2, Math.max(8 * k, $.style.radius));

  // Each stretch of the timeline is a state: enter, idle (loops), hover, unhover, press, loading (loops), done.
  var appear = $.E.outBack($.seg(t, 0, bIdle * 0.85));
  var breathe = t >= bIdle && t < bHi ? Math.sin(loopP(t, bIdle, bHi) * Math.PI * 2) : 0;
  var hover = t < bHi ? 0 : t < bHo ? $.E.out3($.seg(t, bHi, bHi + 0.22)) : t < bPress ? 1 - $.E.inOut2($.seg(t, bHo, bHo + 0.25)) : 0;
  var press = $.bump(t, bPress + 0.02, 0.06, 0.2);
  var collapse = t < bDone ? $.E.inOut3($.seg(t, bPress + 0.14, bLoad)) : 1 - $.E.out3($.seg(t, bDone, bDone + 0.35));
  var curW = $.lerp(w, h, collapse);
  var curR = $.lerp(r, h / 2, collapse);
  var lift = (hover * 6 + breathe * 1.5) * k;
  var scale = (0.6 + 0.4 * appear) * (1 - 0.06 * press) * (1 + 0.03 * hover);
  var fill = $.mix(c.accent, c.fg, 0.1 * hover);
  var fg = $.on(c.accent);
  var x = cx - curW / 2, y = cy - h / 2;

  var s = "";
  // The press ripple, outside the scaled button.
  var rp = $.seg(t, bPress, bPress + 0.55);
  if (rp > 0 && rp < 1) s += $.rect(cx - w / 2 - 26 * rp * k, y - 26 * rp * k, w + 52 * rp * k, h + 52 * rp * k, { r: r + 26 * rp * k, stroke: c.accent, sw: 5 * k * (1 - rp), op: 1 - rp });

  var b = uiBox($, x, y, curW, h, curR, fill, hover > 0.5 ? "lg" : "md");
  // The label and icon, until the button collapses into a circle.
  var labelOp = t < bDone ? 1 - $.seg(collapse, 0, 0.35) : 0;
  if (labelOp > 0) {
    var tx = cx - w / 2 + padX;
    b += $.text(label, Object.assign({}, font, { x: tx, y: cy - size * 0.55, fill: fg, op: labelOp }));
    if (p.icon) b += $.icon(p.icon, cx + w / 2 - padX - iconS + hover * 5 * k, cy - iconS / 2, iconS, { color: fg, sw: 2.4, op: labelOp });
  }
  // Loading: a spinner turning once a second, seamless across the loop.
  var spinOp = t >= bPress && t < bDone + 0.15 ? $.seg(t, bLoad - 0.15, bLoad) * (1 - $.seg(t, bDone, bDone + 0.12)) : 0;
  if (spinOp > 0) b += spinnerArc(cx, cy, h * 0.27, t >= bLoad ? loopP(t, bLoad, bDone) * Math.round(bDone - bLoad) : 0, fg, size * 0.22, spinOp);
  // Done: the check draws on, then the done label slides in as the button opens out again.
  if (t >= bDone) {
    var open = $.E.out3($.seg(t, bDone, bDone + 0.35));
    var ck = $.seg(t, bDone + 0.08, bDone + 0.42);
    var ckX = $.lerp(cx, cx - w / 2 + padX + iconS / 2, open);
    b += checkMark($, ckX, cy, iconS * 0.9, ck, fg, size * 0.2);
    var dOp = $.seg(t, bDone + 0.22, bDone + 0.5);
    if (dOp > 0) b += $.text(done, Object.assign({}, font, { x: cx - w / 2 + padX + iconS + gap + (1 - dOp) * 10 * k, y: cy - size * 0.55, fill: fg, op: dOp }));
  }
  s += posed(b, cx, cy, scale, 0, -lift, Math.min(1, appear * 1.4));
  return s;
}
