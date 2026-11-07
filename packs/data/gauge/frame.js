// A half-dial gauge: the track, tick marks, a filled arc and a needle that swings to the value with a little
// overshoot, the number counting up in the middle and the label under it.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  const max = Number(p.max) || 100, val = Math.max(0, Math.min(max, Number(p.value) || 0));
  const lf = Object.assign({}, $.font("text"), { size: (A.tall ? 40 : 34) * k, weight: 600 });
  const roomH = A.y + A.h - head.y;
  // The dial, then the number under its pivot, then the label: one block, centred in the room left.
  const R = Math.min(A.w * (A.tall ? 0.47 : 0.4), roomH * 0.55);
  const blockH = R + R * 0.36 * 1.1 + 70 * k + lf.size * 1.4;
  const cx = W / 2, cy = head.y + Math.max(0, (roomH - blockH) / 2) + R;
  const sw = R * 0.16, a0 = -Math.PI / 2, a1 = Math.PI / 2;
  // The needle springs to its angle; the arc and the number follow it.
  const sp = Math.max(0, $.pop(t, tin + 0.7, 1.6, 5.5));
  const f = (val / max) * sp;
  const ang = a0 + (a1 - a0) * Math.min(1.04, f);
  let dial = $.path(arcPath(cx, cy, R - sw, R, a0, a1), { fill: $.rgba(c.fg, 0.1) });
  // Zones: the last third in the accent's tint, so "good" reads at a glance.
  if (p.zones !== false) dial += $.path(arcPath(cx, cy, R + sw * 0.35, R + sw * 0.6, a0 + (a1 - a0) * 0.66, a1), { fill: $.rgba(c.accent, 0.35) });
  if (f > 0.001) dial += $.path(arcPath(cx, cy, R - sw, R, a0, a0 + (a1 - a0) * Math.min(1, f)), { fill: c.accent });
  for (let i = 0; i <= 10; i++) {
    const a = a0 + (a1 - a0) * (i / 10), long = i % 5 === 0;
    const r0 = R - sw - (long ? 30 : 18) * k, r1 = R - sw - 8 * k;
    dial += $.line(cx + r0 * Math.sin(a), cy - r0 * Math.cos(a), cx + r1 * Math.sin(a), cy - r1 * Math.cos(a), { stroke: $.rgba(c.fg, long ? 0.5 : 0.25), sw: (long ? 4 : 2.5) * k });
  }
  const mf = Object.assign({}, $.font("mono"), { size: 24 * k, fill: c.mute });
  dial += $.text(fmtNum(0, p.decimals, p.prefix, p.suffix), Object.assign({}, mf, { x: cx - R + sw / 2, y: cy + 14 * k, anchor: "middle" }));
  dial += $.text(fmtNum(max, p.decimals, p.prefix, p.suffix), Object.assign({}, mf, { x: cx + R - sw / 2, y: cy + 14 * k, anchor: "middle" }));
  s += M.part("dial", { at: tin + 0.2, in: "pop", out: "fade", box: { x: cx - R, y: cy - R, w: 2 * R, h: R } }, dial);
  const nl = R - sw - 46 * k;
  const needle = $.path("M" + $.fx(cx + nl * Math.sin(ang)) + " " + $.fx(cy - nl * Math.cos(ang)) + "L" + $.fx(cx + 12 * k * Math.cos(ang)) + " " + $.fx(cy + 12 * k * Math.sin(ang)) + "L" + $.fx(cx - 12 * k * Math.cos(ang)) + " " + $.fx(cy - 12 * k * Math.sin(ang)) + "Z", { fill: c.fg });
  s += M.part("needle", { at: tin + 0.6, in: "fade", dur: 0.2, out: "fade" }, needle + $.circle(cx, cy, 20 * k, { fill: c.fg }) + $.circle(cx, cy, 8 * k, { fill: c.bg }));
  const nf = Object.assign({}, $.font("display"), { size: R * 0.36, ls: -0.04 });
  const shown = val * Math.min(1, sp);
  s += M.text("value", Object.assign({ at: tin + 0.7, in: "rise", distance: 20 }, nf, { x: cx, y: cy + 50 * k, anchor: "middle", fill: c.fg }), fmtNum(shown, p.decimals, p.prefix, p.suffix));
  if (p.label) s += M.text("label", Object.assign({ at: tin + 0.9, in: "rise", distance: 16 }, lf, { x: cx, y: cy + 60 * k + nf.size * 1.1, anchor: "middle", fill: c.mute, maxW: A.w }), String(p.label));
  return s;
}
