// Annotations point at things in the footage: every place is a percentage of the frame (0–100).
function spot($, x, y) { return [$.W * $.clamp(x / 100), $.H * $.clamp(y / 100)]; }
function boxOf($, x, y, w, h) { return { x: $.W * x / 100, y: $.H * y / 100, w: $.W * w / 100, h: $.H * h / 100 }; }
/** The annotation colour: the prop when given, else the accent. */
function inkOf($, col) { return col || $.c.accent; }
/** Which side of a point has the most room for a label. */
function roomy($, x, y) {
  const room = { left: x, right: $.W - x, above: y, below: $.H - y };
  const wide = $.W >= $.H;
  let best = wide ? (x < $.W / 2 ? "right" : "left") : (y < $.H / 2 ? "below" : "above");
  if (room[best] < Math.min($.W, $.H) * 0.3) for (const s in room) if (room[s] > room[best]) best = s;
  return best;
}
/** A label tag (the brand's chip) centred on (cx, cy), kept inside the frame: { markup, box }. */
function tagAt($, str, cx, cy, fill, size) {
  const txt = $.case(str), o = { size: (size || 40) * $.k, fill: fill, color: $.on(fill) };
  const sz = $.chip.size(txt, o), m = 24 * $.k;
  const x = Math.min($.W - m - sz.w, Math.max(m, cx - sz.w / 2)), y = Math.min($.H - m - sz.h, Math.max(m, cy - sz.h / 2));
  return { markup: $.chip(txt, x, y, o), box: { x: x, y: y, w: sz.w, h: sz.h } };
}
/** Pulsing rings on a point (from at). */
function pulse($, t, at, x, y, r, col) {
  let s = "";
  for (let i = 0; i < 2; i++) {
    const q = ((t - at - i * 0.6) % 1.2) / 1.2;
    if (t - at - i * 0.6 < 0) continue;
    s += $.circle(x, y, r * (1 + q * 2.2), { stroke: col, sw: 4 * $.k, op: 0.8 * (1 - q) });
  }
  return s;
}
