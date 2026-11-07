// Two lines of script set as fine outlines; each word fills in as it is said, the word being said in gold.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 86 : A.wide ? 70 : 78) * k * sizeOf(p.size);
  const C = captionLines($, A, ws, t, { size: size, font: { family: "Dancing Script", weight: 700, ls: 0 }, charW: 0.5, lines: 2, maxWords: 8, lh: 1.16, position: p.position });
  if (!C) return "";
  const gold = p.palette === "brand" ? c.accent : "#FFCB47";
  let ci = -1;
  C.lay.words.forEach(function (u, j) { if (t >= u.s - 0.03) ci = j; });
  let lines = "", fills = "";
  C.lay.words.forEach(function (u, j) {
    const f = Object.assign({}, C.font, { x: u.x, y: u.y });
    lines += $.text(u.w, Object.assign({}, f, { fill: "none", stroke: "#FFFFFF", sw: size * 0.028, op: 0.62 }));
    const q = writeP($, t, u, 1);
    if (q > 0) fills += writeOn($, u, size, q, $.text(u.w, Object.assign({}, f, { fill: j === ci ? gold : "#FFFFFF" })));
  });
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, groupIn($, C.g, t, $.g({ extra: 'filter="url(#mg-sm)"' }, lines + fills)));
}
