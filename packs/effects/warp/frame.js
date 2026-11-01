function frame(t, $) {
  var p = $.data, c = $.c, k = $.k, D = $.dur;
  var tin = $.beat("in", 0.1);
  var str = $.case(p.title);
  var T = fitTitle($, str, 0.13, 200 * k);
  var settle = $.E.out3($.seg(t, tin, tin + 1.1));
  var amp = (1 - settle) * T.font.size * 0.5 + (p.shimmer ? T.font.size * 0.025 : 0);
  var id = $.uid();
  // The noise drifts with time (its offset moves), so the ripple rolls rather than flickers.
  $.def('<filter id="' + id + '" x="-20%" y="-60%" width="140%" height="220%"><feTurbulence type="turbulence" baseFrequency="' + f2(0.012 / Math.max(0.5, k)) + " " + f2(0.045 / Math.max(0.5, k)) + '" numOctaves="2" seed="7" result="n"/><feOffset in="n" dx="' + f2(t * 60 * k) + '" dy="0" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" scale="' + f2(amp) + '" xChannelSelector="R" yChannelSelector="G"/></filter>');
  var op = $.fadeIn(t, tin, 0.3) * $.fadeOut(t, D, 0.3);
  return '<g filter="url(#' + id + ')">' + $.text(str, Object.assign({}, T.font, { x: T.x, y: T.y, anchor: "middle", fill: c.fg, op: op })) + "</g>";
}
