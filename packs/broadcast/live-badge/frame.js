function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.3 : 1.2);
  const tin = $.beat("in", 0.1);
  const right = p.corner === "top-right";
  const h = 64 * k;
  const lf = { ...$.font("display"), size: 30 * k, ls: 0.08 };
  const nf = { ...$.font("mono"), size: 28 * k, weight: 700 };
  const label = String(p.label || "LIVE").toUpperCase();
  const liveW = h * 0.62 + $.measure(label, lf) + 30 * k;
  // Viewers: up to the number in 1.2 s, then a slow, fixed drift so the count keeps moving.
  const up = $.E.out3($.seg(t, tin + 0.3, tin + 1.5));
  const drift = Math.floor(Math.max(0, t - tin - 1.5) * 1.7);
  let v = Math.round(p.viewers * up);
  for (let i = 0; i < drift; i++) v += Math.floor($.hash(i * 7.31) * 9) - 2;
  const vText = $.count(Math.max(0, v));
  const vw = h * 0.95 + Math.max($.measure("88.8K", nf), $.measure(vText, nf)) + 24 * k;
  const secs = Math.floor(p.elapsed + Math.max(0, t - tin));
  const two = function (n) { return (n < 10 ? "0" : "") + n; };
  const cText = Math.floor(secs / 3600) + ":" + two(Math.floor(secs / 60) % 60) + ":" + two(secs % 60);
  const cw = p.clock ? $.measure("00:00:00", nf) + 40 * k : 0;
  const gap = 12 * k;
  const total = liveW + gap + vw + (p.clock ? gap + cw : 0);
  let x = right ? W - A.x - total : A.x;
  const y = A.y;
  const leave = { out: "fade", outDur: 0.3 };
  let s = M.part("live", Object.assign({ at: tin, in: "pop", origin: right ? "right" : "left", box: { x: x, y: y, w: liveW, h: h } }, leave),
    $.rect(x, y, liveW, h, { r: 10 * k, fill: c.red, shadow: "md" }),
    $.circle(x + h * 0.42, y + h / 2, 9 * k, { fill: "#FFFFFF", op: 0.45 + 0.55 * $.wave(t, 1.1) }),
    $.text(label, { ...lf, x: x + h * 0.66, y: y + (h - lf.size) / 2 - lf.size * 0.03, fill: "#FFFFFF" }));
  x += liveW + gap;
  s += M.part("viewers", Object.assign({ at: tin + 0.15, in: "slide", from: right ? "right" : "left", distance: 16, box: { x: x, y: y, w: vw, h: h } }, leave),
    $.rect(x, y, vw, h, { r: 10 * k, fill: "rgba(10,12,16,0.72)" }),
    $.icon("users", x + 18 * k, y + (h - 30 * k) / 2, 30 * k, { color: "#FFFFFF", sw: 2.2 }),
    $.text(vText, { ...nf, x: x + h * 0.85, y: y + (h - nf.size) / 2 - nf.size * 0.05, fill: "#FFFFFF" }));
  x += vw + gap;
  if (p.clock) s += M.part("clock", Object.assign({ at: tin + 0.3, in: "slide", from: right ? "right" : "left", distance: 16, box: { x: x, y: y, w: cw, h: h } }, leave),
    $.rect(x, y, cw, h, { r: 10 * k, fill: "rgba(10,12,16,0.72)" }),
    $.text(cText, { ...nf, x: x + cw / 2, y: y + (h - nf.size) / 2 - nf.size * 0.05, anchor: "middle", fill: "#FFFFFF" }));
  return s;
}
