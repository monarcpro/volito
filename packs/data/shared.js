// MONARC Data — helpers this pack's charts share.

/** Series colours: the brand's two accents first, then fixed hues that sit well beside them. */
function seriesColor($, i) {
  var list = [$.c.accent, $.c.accent2, "#3DD6FF", "#7C5CFF", "#22C55E", "#F59E0B", "#EC4899", "#94A3B8"];
  return list[i % list.length];
}

/** A number as a reader expects it: thousands separators, fixed decimals, a prefix and a suffix. */
function fmtNum(v, dec, prefix, suffix) {
  var n = Number(v) || 0, d = Math.max(0, Math.min(3, Math.round(dec || 0)));
  var s = n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (d) { var parts = n.toFixed(d).split("."); s = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + parts[1]; }
  return (prefix || "") + s + (suffix || "");
}

/** Round "nice" steps for an axis that reaches max: 1, 2 or 5 × a power of ten. */
function niceStep(max, count) {
  var raw = (max || 1) / Math.max(1, count || 4), pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), m = raw / pow;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
}

/** A heading (and kicker) at the top of the safe area; returns the y below it. */
function chartHead($, M, t, at, title, A, k) {
  if (!title) return { s: "", y: A.y };
  var tf = fitLines($, $.case(title), Object.assign({}, $.font("display"), { ls: -0.02 }), A.w, Math.min((A.tall ? 96 : 80) * k, A.h * 0.1), 40 * k, 2);
  var s = "";
  tf.lines.forEach(function (line, i) { s += M.text("title", Object.assign({ at: at + i * 0.1, in: "rise", distance: 22 }, tf.font, { x: A.x, y: A.y + i * tf.size * 1.05, fill: $.c.fg }), line); });
  return { s: s, y: A.y + tf.lines.length * tf.size * 1.05 + 40 * k };
}

/** A donut or ring segment from angle a0 to a1 (radians, 0 = up, clockwise). */
function arcPath(cx, cy, r0, r1, a0, a1) {
  var big = a1 - a0 > Math.PI ? 1 : 0;
  var p = function (r, a) { return (cx + r * Math.sin(a)).toFixed(2) + " " + (cy - r * Math.cos(a)).toFixed(2); };
  if (a1 - a0 >= Math.PI * 2 - 1e-4) a1 = a0 + Math.PI * 2 - 1e-4;
  return "M" + p(r1, a0) + "A" + r1 + " " + r1 + " 0 " + big + " 1 " + p(r1, a1) + "L" + p(r0, a1) + "A" + r0 + " " + r0 + " 0 " + big + " 0 " + p(r0, a0) + "Z";
}
