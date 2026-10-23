function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const face = p.face === "display" ? $.font("display") : $.font("accent");
  const text = String(p.quote).replace(/^["“”]+|["“”]+$/g, "").trim();
  const maxW = A.w * (A.wide ? 0.78 : 0.88);
  const fit = fitLines($, text, Object.assign({}, face, { ls: p.face === "display" ? -0.02 : 0 }), maxW, Math.min(96 * k, A.h * 0.12), 38 * k, A.tall ? 8 : 5);
  const lh = 1.22;
  const markSize = Math.max(160 * k, fit.size * 2.4);
  const af = Object.assign({}, $.font("display"), { size: Math.max(34 * k, fit.size * 0.5) });
  const rf = Object.assign({}, $.font("mono"), { size: Math.max(22 * k, fit.size * 0.3), ls: 0.12 });
  const blockH = markSize * 0.55 + fit.lines.length * fit.size * lh + 70 * k + af.size * 1.2 + (p.role ? rf.size * 1.6 : 0);
  const x = A.wide ? (W - maxW) / 2 : A.x;
  let y = A.y + (A.h - blockH) / 2;
  const tWords = landOn($, text, tin + 0.35);
  const leave = { out: "drop", distance: 24, outDur: 0.4 };

  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H }, glow: [W * 0.2, H * 0.25] }));
  // The quotation mark, in the accent, springs in first.
  s += M.part("mark", Object.assign({ at: tin, in: "spin", intensity: 0.05, box: { x: x - markSize * 0.04, y: y - markSize * 0.18, w: markSize * 0.6, h: markSize * 0.9 } }, leave),
    $.text("“", Object.assign({}, $.font("accent"), { size: markSize, x: x - markSize * 0.04, y: y - markSize * 0.18, fill: c.accent })));
  y += markSize * 0.55;
  s += M.text("quote", Object.assign({ at: tWords, in: "rise", distance: 24, split: "lines", stagger: 0.14 }, leave, fit.font, { x: x, y: y, lh: lh, maxW: maxW }), text);
  y += fit.lines.length * fit.size * lh + 40 * k;
  const tSign = tWords + fit.lines.length * 0.14 + 0.25;
  s += M.part("rule", Object.assign({ at: tSign, in: "grow-x", origin: "left", dur: 0.4, box: { x: x, y: y, w: 90 * k, h: 6 * k } }, leave), $.rect(x, y, 90 * k, 6 * k, { r: 3 * k, fill: c.accent }));
  y += 30 * k;
  s += M.text("author", Object.assign({ at: tSign + 0.1, in: "slide", from: "left", distance: 8 }, leave, af, { x: x, y: y }), $.case(p.author));
  if (p.role) s += M.text("role", Object.assign({ at: tSign + 0.22, in: "slide", from: "left", distance: 8 }, leave, rf, { x: x, y: y + af.size * 1.2, fill: c.mute }), String(p.role).toUpperCase());
  return s;
}
