// UI pieces: product micro-interactions whose timeline is cut into states at named beats (enter, idle,
// hover, press, loading, done…). Loops are periodic so a looped state repeats without a seam, and every
// state ends on a pose the next one starts from.

/** 0→1 through a loop of [a, b): the frame at b is the frame at a. */
function loopP(t, a, b) {
  var L = b - a;
  if (L <= 0) return 0;
  var x = (t - a) % L;
  return (x < 0 ? x + L : x) / L;
}

/** A size as a share of the frame's short side, so a control reads the same at every aspect. */
function unit($, share) {
  return Math.min($.W, $.H) * share;
}

/** Fixed-precision number for markup. */
function n2(v) {
  return (Math.round(v * 100) / 100).toString();
}

/** A rounded box in the brand's surface: bold brands get an ink outline and a hard shadow. */
function uiBox($, x, y, w, h, r, fill, shadow) {
  var k = $.k;
  if ($.style.surface === "bold") return $.rect(x + 6 * k, y + 6 * k, w, h, { r: r, fill: $.c.ink }) + $.rect(x, y, w, h, { r: r, fill: fill, stroke: $.c.ink, sw: 3.5 * k });
  return $.rect(x, y, w, h, { r: r, fill: fill, shadow: $.style.surface === "flat" ? null : shadow || "md" });
}

/** A spinner arc at (cx, cy) turned `turn` (0–1) of the way round. */
function spinnerArc(cx, cy, r, turn, color, sw, op) {
  return '<g transform="rotate(' + n2(turn * 360) + " " + n2(cx) + " " + n2(cy) + ')"' + (op != null && op < 1 ? ' opacity="' + n2(op) + '"' : "") + '><circle cx="' + n2(cx) + '" cy="' + n2(cy) + '" r="' + n2(r) + '" fill="none" stroke="' + color + '" stroke-width="' + n2(sw) + '" stroke-linecap="round" pathLength="100" stroke-dasharray="30 70"/></g>';
}

/** A check mark centred at (cx, cy), `s` wide, drawn on as p goes 0→1. */
function checkMark($, cx, cy, s, p, color, sw) {
  if (p <= 0) return "";
  var d = "M" + n2(cx - s * 0.5) + " " + n2(cy + s * 0.02) + " L" + n2(cx - s * 0.14) + " " + n2(cy + s * 0.36) + " L" + n2(cx + s * 0.52) + " " + n2(cy - s * 0.34);
  return $.path(d, { stroke: color, sw: sw, draw: Math.min(1, p) });
}

/** A cross centred at (cx, cy), `s` wide, drawn on as p goes 0→1. */
function crossMark($, cx, cy, s, p, color, sw) {
  if (p <= 0) return "";
  var h = s * 0.4;
  var a = $.path("M" + n2(cx - h) + " " + n2(cy - h) + " L" + n2(cx + h) + " " + n2(cy + h), { stroke: color, sw: sw, draw: Math.min(1, p * 2) });
  var b = p > 0.5 ? $.path("M" + n2(cx + h) + " " + n2(cy - h) + " L" + n2(cx - h) + " " + n2(cy + h), { stroke: color, sw: sw, draw: Math.min(1, (p - 0.5) * 2) }) : "";
  return a + b;
}

/** A group scaled about (ox, oy) and moved by (dx, dy), at an opacity. */
function posed(markup, ox, oy, s, dx, dy, op) {
  return '<g transform="translate(' + n2(dx || 0) + " " + n2(dy || 0) + ") translate(" + n2(ox) + " " + n2(oy) + ") scale(" + n2(s) + ") translate(" + n2(-ox) + " " + n2(-oy) + ')"' + (op != null && op < 1 ? ' opacity="' + n2(Math.max(0, op)) + '"' : "") + ">" + markup + "</g>";
}
