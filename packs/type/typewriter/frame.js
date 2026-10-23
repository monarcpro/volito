function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.2);
  let s = ground(M, $, t);
  const face = p.face, txt = face === "display" ? $.case(p.text) : String(p.text || "");
  const font = Object.assign({}, $.font(face), { ls: face === "mono" ? 0 : -0.015 });
  const fit = fitLines($, txt, font, A.w * 0.86, Math.min(A.h * 0.2, 140 * k), 34 * k, 6);
  const w = widest($, fit.lines, fit.font), lh = face === "display" ? 1.08 : 1.3;
  const y0 = H / 2 - (fit.lines.length * fit.size * lh) / 2;
  s += M.text("text", Object.assign({ at: tin, in: "typewriter", split: "letters", stagger: 1 / p.speed }, fit.font, { x: W / 2 - w / 2, y: y0, lh: lh, maxW: A.w * 0.86, fill: c.fg }), fit.lines.join("\n"));
  return s;
}
