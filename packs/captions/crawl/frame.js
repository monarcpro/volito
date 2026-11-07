// A news crawl: the whole transcript on one line in a band, sliding so the word being said sits at the reading point, lit in the accent.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 54 : A.wide ? 46 : 50) * k * sizeOf(p.size);
  const font = Object.assign({}, $.font("display"), { size: size, ls: 0 });
  const line = lineUp($, ws, font, 1e9, 0, 0, 1);
  const lay = line.words.map(function (u) { return Object.assign({}, u, { x: u.x + line.widths[0] / 2 }); });
  const bandH = size * 1.9;
  const by = p.position === "top" ? H * (A.tall ? 0.12 : 0.08) : H * (A.tall ? 0.74 : 0.86) - bandH / 2;
  const label = String(p.label || "").trim();
  const labelW = label ? $.measure(label.toUpperCase(), Object.assign({}, font, { size: size * 0.62 })) + size * 1.2 : 0;
  // The reading point: where each word starts as it is said, with room before it for the words just gone by.
  const readX = Math.max(labelW + size * 4, W * (A.tall ? 0.42 : 0.34));
  // The line slides from word to word: each word's start reaches the reading point as it is said.
  let i = 0;
  lay.forEach(function (u, j) { if (t >= u.s - 0.05) i = j; });
  const a = lay[i], b = lay[Math.min(lay.length - 1, i + 1)];
  const e = b === a ? 0 : $.E.inOut3($.clamp((t - a.s) / Math.max(0.1, b.s - a.s)));
  const offset = readX - $.lerp(a.x, b.x, e);
  let words = "";
  lay.forEach(function (u, j) {
    const x = u.x + offset;
    if (x > W + size || x + u.ww < labelW - size) return;
    const said = t >= u.s - 0.05;
    words += $.text(u.w, Object.assign({}, font, { x: x, y: by + (bandH - size) / 2, fill: j === i && said ? c.accent : u.accent ? c.accent2 : "#FFFFFF", op: said ? 1 : 0.55, within: { x: -1e7, y: -1e7, w: 2e7, h: 2e7 } }));
  });
  let s = $.rect(0, by, W, bandH, { fill: "#000000", op: 0.62 });
  s += $.clip(labelW, by, W - labelW, bandH, 0, words);
  if (label) {
    s += $.rect(0, by, labelW, bandH, { fill: c.accent });
    s += $.text(label.toUpperCase(), Object.assign({}, font, { size: size * 0.62, x: labelW / 2, y: by + (bandH - size * 0.62) / 2, anchor: "middle", fill: $.on(c.accent) }));
  }
  const ein = $.E.out3($.clamp((t - (ws[0].s - 0.4)) / 0.35));
  s = $.g({ op: ein, transform: $.tf({ y: (1 - ein) * bandH * (p.position === "top" ? -1 : 1) }) }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.25, outDur: 0.22, vary: false }, s);
}
