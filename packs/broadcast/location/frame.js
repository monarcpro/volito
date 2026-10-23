function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.2 : 1);
  const tin = landOn($, p.place, $.beat("in", 0.1));
  const px = W * p.x, py = Math.max(A.y + 140 * k, Math.min(A.y + A.h, H * p.y));
  const pw = 64 * k, ph = 88 * k;
  // A teardrop pin whose point sits on (px, py).
  const pin = "M" + $.fx(px) + " " + $.fx(py) + " C" + $.fx(px - pw * 0.2) + " " + $.fx(py - ph * 0.35) + " " + $.fx(px - pw / 2) + " " + $.fx(py - ph * 0.5) + " " + $.fx(px - pw / 2) + " " + $.fx(py - ph * 0.68) + " A" + $.fx(pw / 2) + " " + $.fx(pw / 2) + " 0 1 1 " + $.fx(px + pw / 2) + " " + $.fx(py - ph * 0.68) + " C" + $.fx(px + pw / 2) + " " + $.fx(py - ph * 0.5) + " " + $.fx(px + pw * 0.2) + " " + $.fx(py - ph * 0.35) + " " + $.fx(px) + " " + $.fx(py) + "Z";
  const ring = $.seg(t, tin + 0.45, tin + 1.6);
  let s = "";
  s += M.part("ripple", { at: tin + 0.4, in: "fade", dur: 0.1, out: "fade", box: { x: px - 90 * k, y: py - 30 * k, w: 180 * k, h: 60 * k } },
    $.path("M" + $.fx(px - 60 * k) + " " + $.fx(py) + "a" + $.fx(60 * k) + " " + $.fx(18 * k) + " 0 1 0 " + $.fx(120 * k) + " 0a" + $.fx(60 * k) + " " + $.fx(18 * k) + " 0 1 0 " + $.fx(-120 * k) + " 0", { fill: "rgba(0,0,0,0.35)" }),
    ring > 0 && ring < 1 ? $.path("M" + $.fx(px - 60 * k * (0.4 + ring)) + " " + $.fx(py) + "a" + $.fx(60 * k * (0.4 + ring)) + " " + $.fx(18 * k * (0.4 + ring)) + " 0 1 0 " + $.fx(120 * k * (0.4 + ring)) + " 0a" + $.fx(60 * k * (0.4 + ring)) + " " + $.fx(18 * k * (0.4 + ring)) + " 0 1 0 " + $.fx(-120 * k * (0.4 + ring)) + " 0", { fill: "none", stroke: c.accent, sw: 4 * k * (1 - ring) }) : "");
  s += M.part("pin", { at: tin, in: "bounce", origin: "bottom", out: "rise", box: { x: px - pw / 2, y: py - ph, w: pw, h: ph } },
    $.path(pin, { fill: c.accent, stroke: "rgba(0,0,0,0.25)", sw: 2 * k }), $.circle(px, py - ph * 0.68, pw * 0.2, { fill: "#FFFFFF" }));
  // The card sits on the side with more room.
  const left = p.x > 0.55;
  const nf = fitFont($, $.case(p.place), "display", 54 * k, A.w * 0.5);
  const rf = { ...$.font("text"), size: 30 * k };
  const cf = { ...$.font("mono"), size: 22 * k, ls: 0.06 };
  const cw = Math.max($.measure($.case(p.place), nf), $.measure(String(p.region || ""), rf), $.measure(String(p.coords || ""), cf)) + 64 * k;
  const ch = nf.size * 1.2 + (p.region ? rf.size * 1.35 : 0) + (p.coords ? cf.size * 1.6 : 0) + 44 * k;
  const cx = left ? Math.max(A.x, px - pw - 30 * k - cw) : Math.min(W - A.x - cw, px + pw + 30 * k);
  const cy = Math.max(A.y, py - ph - ch * 0.3);
  let yy = cy + 22 * k;
  let card = $.card(cx, cy, cw, ch, { shadow: "lg" });
  card += $.text($.case(p.place), { ...nf, x: cx + 32 * k, y: yy, fill: c.fg });
  yy += nf.size * 1.2;
  if (p.region) { card += $.text(String(p.region), { ...rf, x: cx + 32 * k, y: yy, fill: c.mute }); yy += rf.size * 1.35; }
  if (p.coords) card += $.text(String(p.coords), { ...cf, x: cx + 32 * k, y: yy + 4 * k, fill: c.accent });
  s += M.part("card", { at: tin + 0.55, in: "pop", origin: left ? "right" : "left", out: "fade", box: { x: cx, y: cy, w: cw, h: ch } }, card);
  return s;
}
