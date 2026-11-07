// A bold white line with its key word in a glowing gold script and a dotted, looping flourish drawn underneath across the phrase.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 6);
  if (!L) return "";
  const size = (A.tall ? 72 : A.wide ? 60 : 66) * k * sizeOf(p.size);
  const gold = p.palette === "brand" ? c.accent : "#FFC46B";
  const words = L.g.words;
  const maxW = A.w * 0.9;
  const fontFor = function (w) { return w === L.key ? { family: "Parisienne", weight: 400, ls: 0, size: size * 1.3 } : { family: "Instrument Sans", weight: 700, ls: -0.01, size: size }; };
  const lay = lineUpMixed($, words, fontFor, maxW, W / 2, captionY($, A, p.position), 1.2);
  const blurs = {};
  let s = "";
  lay.forEach(function (u) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    const e = $.E.out3($.clamp(since / 0.25));
    const isKey = u.w === L.key.w && u.s === L.key.s;
    const word = $.text(u.w, Object.assign({}, u.font, { x: u.x, y: u.y + (1 - e) * u.size * 0.2, fill: isKey ? gold : "#FFFFFF", op: $.clamp(since / 0.15) }));
    if (isKey) s += $.g({ extra: blurFilter($, blurs, u.size * 0.1) }, word);
    s += word;
  });
  // The flourish: loops traced as glowing dots, drawn left to right across the phrase's time.
  const x0 = Math.min.apply(null, lay.map(function (u) { return u.x; })), x1 = Math.max.apply(null, lay.map(function (u) { return u.x + u.ww; }));
  const base = Math.max.apply(null, lay.map(function (u) { return u.y + u.size; })) + size * 0.32;
  const last = words[words.length - 1];
  const prog = $.clamp((t - L.g.start) / Math.max(0.6, last.end - L.g.start + 0.2));
  const loops = 3, a = 1, b = 2.4, span = loops * 2 * Math.PI;
  const xAt = function (th) { return a * th - b * Math.sin(th); }, xMax = xAt(span);
  let dots = "";
  const n = 120;
  for (let i = 0; i <= n * prog; i++) {
    const th = (i / n) * span;
    const x = x0 + ((xAt(th) - xAt(0)) / (xMax - xAt(0))) * (x1 - x0), y = base + size * 0.15 - b * Math.cos(th) * size * 0.17;
    dots += $.circle(x, y, size * 0.028, { fill: gold, op: 0.9 });
  }
  s += $.g({ extra: blurFilter($, blurs, size * 0.06) }, dots) + dots;
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, s));
}
