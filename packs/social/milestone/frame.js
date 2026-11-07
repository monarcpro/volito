// A milestone: a badge with the platform's icon and the count rolling up to the goal; when it gets there it
// pops, confetti bursts and the thank-you line rises under it.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  const pl = PLATFORM[p.platform] || PLATFORM.youtube;
  const goal = Number(p.value) || 0;
  const hit = tin + 1.6;
  const cx = W / 2, cy = A.y + A.h * (A.tall ? 0.38 : 0.42);
  const R = Math.min(A.w * 0.3, A.h * (A.tall ? 0.2 : 0.3));
  // The ring fills as the count climbs; at the goal it pulses once.
  const f = $.E.inOut2($.seg(t, tin + 0.3, hit));
  const thump = 1 + 0.12 * $.bump(t, hit, 0.08, 0.35);
  let b = $.circle(cx, cy, R, { fill: c.surface, shadow: "lg" });
  b += $.ring(cx, cy, R * 0.9, f, { color: c.accent, sw: R * 0.08 });
  b += appIcon($, pl.icon, cx - R * 0.17, cy - R * 0.62, R * 0.34, { fill: c.accent });
  const nf = fitFont($, $.count(goal), "display", R * 0.5, R * 1.5, { ls: -0.04 });
  b += $.text($.count(Math.round(goal * f)), Object.assign({}, nf, { x: cx, y: cy - nf.size * 0.3, anchor: "middle", fill: c.fg }));
  const lf = Object.assign({}, $.font("text"), { size: R * 0.14, weight: 600 });
  b += $.text(String(p.label || pl.count), Object.assign({}, lf, { x: cx, y: cy + nf.size * 0.75, anchor: "middle", fill: c.mute }));
  let s = M.part("badge", { at: tin, in: "pop", ease: "bouncy", out: "fade", box: { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R } }, $.g({ transform: $.tf({ s: thump, ox: cx, oy: cy }) }, b));
  if (t >= hit) s += M.part("confetti", { at: hit, in: "none", out: "fade" }, $.burst(t, hit, cx, cy, { n: 28, r: R * 2.4, colors: [c.accent, c.accent2, "#FFD23F", "#3DD6FF"], size: 14 * k, dur: 1.2 }));
  if (p.line) {
    const tf = fitFont($, $.case(String(p.line)), "display", (A.tall ? 84 : 72) * k, A.w, { ls: -0.02 });
    s += M.text("line", Object.assign({ at: hit + 0.15, in: "rise", distance: 30, out: "fade" }, tf, { x: cx, y: cy + R + 50 * k, anchor: "middle", fill: c.fg, shadow: "sm" }), $.case(String(p.line)));
  }
  return s;
}
