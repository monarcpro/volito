function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.2);
  let s = ground(M, $, t);
  const ws = markedWords($.case(p.text)), plain = ws.map(function (w) { return w.word; }).join(" ");
  const fit = fitLines($, plain, Object.assign({}, $.font("display"), { ls: -0.025 }), A.w * 0.9, Math.min(150 * k, A.h * 0.22), 48 * k, 5);
  const lh = fit.size * 1.18, y0 = H / 2 - (fit.lines.length * lh) / 2;
  let wi = 0, marks = "", nMark = 0;
  const flags = [], boxes = [];
  fit.lines.forEach(function (line, li) {
    const lay = M.layout(line, Object.assign({}, fit.font, { x: W / 2, y: y0 + li * lh, anchor: "middle" }), "words");
    lay.units.forEach(function (u) { flags.push(ws[wi] && ws[wi].marked); boxes.push(u); wi++; });
  });
  const tMarks = tin + 0.35 + fit.lines.length * 0.12, markAt = [];
  boxes.forEach(function (u, j) {
    if (!flags[j]) return;
    const a = tMarks + nMark * 0.35;
    markAt[j] = a;
    const pr = $.E.out3($.seg(t, a, a + 0.32)), pad = fit.size * 0.1;
    if (pr > 0) marks += $.path("M" + (u.x - pad) + " " + (u.y + fit.size * 0.18) + "h" + (u.w + 2 * pad) * pr + "l" + -pad * 0.4 + " " + fit.size * 0.86 + "h" + -(u.w + 2 * pad) * pr + "Z", { fill: c.accent2 });
    nMark++;
  });
  s += M.part("marks", { at: tMarks, in: "none" }, marks);
  let base = 0;
  fit.lines.forEach(function (line, li) {
    const off = base;
    s += M.text("text", Object.assign({ at: tin + li * 0.12, in: "rise", split: "words", stagger: 0.05, fillFor: function (u) { const j = off + u.index; return flags[j] && t >= markAt[j] + 0.1 ? $.on(c.accent2) : c.fg; } }, fit.font, { x: W / 2, y: y0 + li * lh, anchor: "middle", fill: c.fg }), line);
    base += line.split(/\s+/).filter(Boolean).length;
  });
  return s;
}
