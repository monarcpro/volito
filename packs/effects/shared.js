// Effects: looks built from SVG filters (turbulence, displacement, blur, colour matrices), which resvg and
// browsers both draw, so a render and the live player match. Every filter is a pure function of t.

/** Fixed-precision number for markup. */
function f2(v) {
  return (Math.round(v * 100) / 100).toString();
}

/** A glow filter (a blur of the shape under the shape itself); returns its id. */
function glowFilter($, std, strength) {
  var id = $.uid();
  var copies = "";
  for (var i = 0; i < (strength || 2); i++) copies += '<feMergeNode in="b"/>';
  $.def('<filter id="' + id + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="' + f2(std) + '" result="b"/><feMerge>' + copies + '<feMergeNode in="SourceGraphic"/></feMerge></filter>');
  return id;
}

/** A title sized to fit the safe area's width, centred: { font, x, y, lines }. */
function fitTitle($, str, share, maxSize) {
  var A = safeArea($);
  var f = fitFont($, str, "display", Math.min(maxSize, $.W * share), A.w * 0.9, { ls: -0.03 });
  return { font: f, x: $.W / 2, y: $.H / 2 - f.size * 0.56 };
}
