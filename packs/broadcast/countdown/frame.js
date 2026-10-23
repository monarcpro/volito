function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.1);
  const n = Math.max(1, Math.round(p.from));
  // The count fills the time before the closing words (the last ~0.9 s).
  const span = Math.max(0.5, $.dur - tin - 1.2);
  const step = span / n;
  const el = t - tin;
  const left = Math.max(0, n - Math.floor(el / step));
  const done = el >= span;
  const cx = W / 2, cy = A.y + A.h * (A.tall ? 0.45 : 0.5);
  const r = Math.min(A.w, A.h) * 0.24;
  const tick = el >= 0 && !done ? (el % step) / step : 0;
  let s = M.part("ring", { at: tin, in: "grow", dur: 0.5, out: "fade", box: { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r } },
    $.circle(cx, cy, r, { fill: "rgba(10,12,16,0.55)" }),
    $.ring(cx, cy, r * 0.92, done ? 0 : 1 - (el + 0) / span, { sw: r * 0.09, color: c.accent }));
  const label = $.case(String(p.label || ""));
  if (label) s += M.text("label", { at: tin + 0.15, in: "rise", distance: 16, out: "fade", ...fitFont($, label, "text", 40 * k, A.w), x: cx, y: cy - r - 76 * k, anchor: "middle", fill: "#FFFFFF", shadow: "md" }, label);
  if (!done) {
    // Each number pops in on its second.
    const pop = 1 + 0.25 * Math.exp(-9 * tick * step) * Math.cos(tick * step * 14);
    const nf = { ...$.font("display"), size: r * 0.95 };
    s += M.part("number", { at: tin + 0.1, in: "fade", dur: 0.2, out: "none", box: { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r } },
      $.g({ transform: $.tf({ s: pop, ox: cx, oy: cy }) }, $.text(String(left), { ...nf, x: cx, y: cy - nf.size * 0.52, anchor: "middle", fill: "#FFFFFF" })));
  } else {
    const end = $.case(String(p.end || ""));
    const ef = fitFont($, end, "display", r * 0.46, r * 1.45);
    s += M.text("end", { at: tin + span, in: "slam", intensity: 0.4, out: "fade", ...ef, x: cx, y: cy - ef.size * 0.55, anchor: "middle", fill: "#FFFFFF" }, end);
  }
  return s;
}
