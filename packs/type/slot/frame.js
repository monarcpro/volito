// A slot-machine reel: the line's last word rolls through the list, fast and blurred, slows and lands on the
// final word with a little bounce, in an accent window beside the words before it.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  let s = ground(M, $, t);
  const words = (p.words || []).map(function (w) { return $.case(String(w)); }).filter(Boolean);
  if (!words.length) return s;
  const lead = $.case(String(p.before || ""));
  const longest = words.reduce(function (a, w) { return w.length > a.length ? w : a; }, "");
  // One line on wide frames (lead + reel), two on narrow ones (lead over reel).
  const one = A.wide;
  const size = Math.min((A.tall ? 150 : 170) * k, one ? A.w / (lead.length + longest.length + 2) * 1.6 : A.w / (longest.length + 1) * 1.6);
  const f = Object.assign({}, $.font("display"), { size: size, ls: -0.03 });
  const leadW = lead ? $.measure(lead, f) : 0;
  const reelW = Math.max.apply(null, words.map(function (w) { return $.measure(w, f); })) + size * 0.5;
  const reelH = size * 1.3;
  const totalW = one ? leadW + (lead ? size * 0.3 : 0) + reelW : Math.max(leadW, reelW);
  const x0 = W / 2 - totalW / 2;
  const cy = A.y + A.h / 2 - (one ? 0 : size * 0.65);
  if (lead) s += M.text("lead", Object.assign({ at: tin, in: "rise", distance: 30 }, f, { x: one ? x0 : W / 2, y: cy - size * 0.55, anchor: one ? "start" : "middle", fill: c.fg }), lead);
  const rx = one ? x0 + leadW + (lead ? size * 0.3 : 0) : W / 2 - reelW / 2, ry = one ? cy - reelH / 2 : cy + size * 0.75;
  // The roll: two spins through the list, easing out onto the last word; overshoot then settle.
  const n = words.length, turns = 2 * n + (n - 1);
  const t0 = tin + 0.4, t1 = t0 + 1.6;
  const u = $.E.out5($.seg(t, t0, t1));
  const settle = t > t1 ? 0.08 * Math.exp(-(t - t1) * 9) * Math.sin((t - t1) * 30) : 0;
  const pos = u * turns + settle;
  const speed = t < t1 ? (turns * 5 * Math.pow(1 - $.seg(t, t0, t1), 4)) / 1.6 : 0;
  const clip = $.uid(), blur = $.uid();
  $.def('<clipPath id="' + clip + '"><rect x="' + rx + '" y="' + ry + '" width="' + reelW + '" height="' + reelH + '" rx="' + reelH * 0.22 + '"/></clipPath>');
  $.def('<filter id="' + blur + '" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="0 ' + $.fx(Math.min(size * 0.25, speed * size * 0.02)) + '"/></filter>');
  let reel = $.rect(rx, ry, reelW, reelH, { r: reelH * 0.22, fill: c.accent });
  let roll = "";
  const base = Math.floor(pos);
  for (let j = -1; j <= 1; j++) {
    const idx = base + j, w = words[((idx % n) + n) % n];
    // Capitals sit about 0.45 of the size below the text top: centre them in the window.
    const y = ry + reelH / 2 - size * 0.47 + (idx - pos) * reelH;
    roll += $.text(w, Object.assign({}, f, { x: rx + reelW / 2, y: y, anchor: "middle", fill: $.on(c.accent) }));
  }
  reel += '<g clip-path="url(#' + clip + ')"><g filter="url(#' + blur + ')">' + roll + "</g></g>";
  s += M.part("reel", { at: tin + 0.2, in: "pop", out: "fade", box: { x: rx, y: ry, w: reelW, h: reelH } }, reel);
  return s;
}
function sound($) {
  const t0 = $.beat("in", 0.15) + 0.4;
  const cues = [];
  for (let i = 0; i < 12; i++) cues.push({ at: t0 + 1.6 * (1 - Math.pow(1 - i / 12, 0.45)), kind: "tick", level: 0.5 });
  cues.push({ at: t0 + 1.6, kind: "pop", level: 0.9 });
  return cues;
}
