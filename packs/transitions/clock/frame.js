function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const ph = phases($, t), col = paints($, p.colors);
  let s = "";
  const cx = W / 2, cy = H / 2, R = Math.hypot(W, H);
  const dirn = p.direction === "anticlockwise" ? -1 : 1;
  const pt = function (deg) { const a = (deg - 90) * Math.PI / 180; return [cx + R * Math.cos(a) * 1, cy + R * Math.sin(a)]; };
  // A wedge from angle a to angle b (degrees from 12 o'clock, in the turning direction).
  const wedge = function (a, b, fill) {
    if (b - a <= 0.2) return "";
    if (b - a >= 359.8) return $.rect(0, 0, W, H, { fill: fill });
    const steps = Math.ceil((b - a) / 30), d = ["M" + cx + " " + cy];
    for (let i = 0; i <= steps; i++) { const q = pt(dirn * (a + ((b - a) * i) / steps)); d.push("L" + q[0] + " " + q[1]); }
    return $.path(d.join("") + "Z", { fill: fill });
  };
  if (ph.before) {
    const e = $.E.inOut2(ph.cover) * 360;
    s += wedge(0, e, col.cover) + wedge(Math.max(0, e - 14), e, col.lead);
  } else {
    const e = $.E.inOut2(ph.uncover) * 360;
    s += wedge(e, 360, col.cover) + wedge(e, Math.min(360, e + 14), col.lead2);
  }
  s = M.part("cover", { in: "none", out: "none", vary: false }, s);
  return s + cutWord(M, $, t, p.label, col.cover);
}
