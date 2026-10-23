function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.2);
  let s = ground(M, $, t);
  const str = $.case(p.title);
  const fit = fitLines($, str, Object.assign({}, $.font("display"), { ls: -0.02 }), A.w * 0.8, Math.min(170 * k, A.h * 0.3), 60 * k, 2);
  const lh = fit.size * 1.05, h = fit.lines.length * lh, y0 = H / 2 - h / 2 - (p.line ? 40 * k : 0);
  const w = widest($, fit.lines, fit.font);
  fit.lines.forEach(function (l, i) {
    s += M.text("title", Object.assign({ at: tin + 0.2 + i * 0.25, in: "scramble", split: "letters", dur: 0.7, stagger: Math.min(0.06, 0.9 / l.length) }, fit.font, { x: W / 2, y: y0 + i * lh, anchor: "middle", fill: c.fg }), l);
  });
  // Brackets open out from the centre to frame the title.
  const bo = $.E.out3($.seg(t, tin, tin + 0.5)), bx = (w / 2 + 50 * k) * bo, bh = h + 30 * k, by = y0 - 18 * k, arm = 34 * k;
  const br = function (x, dir) { return $.path("M" + (x + dir * arm) + " " + by + "H" + x + "V" + (by + bh) + "H" + (x + dir * arm), { stroke: c.accent, sw: 7 * k, cap: "square", join: "miter" }); };
  s += M.part("brackets", { at: tin, in: "fade", dur: 0.2 }, br(W / 2 - bx, 1) + br(W / 2 + bx, -1));
  if (p.line) {
    const mf = Object.assign({}, $.font("mono"), { size: Math.max(28 * k, fit.size * 0.22) });
    const txt = "> " + p.line, mw = $.measure(txt, mf);
    s += M.text("line", Object.assign({ at: tin + 1.1, in: "typewriter", split: "letters", stagger: 0.04 }, mf, { x: W / 2 - Math.min(mw, A.w) / 2, y: by + bh + 40 * k, fill: c.accent, maxW: A.w }), txt);
  }
  return s;
}
