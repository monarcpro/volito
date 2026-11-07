// Editorial: the line in the brand's text face, its key words set far bigger in the accent face, each landing as it is said.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 58 : A.wide ? 48 : 52) * k * sizeOf(p.size);
  const maxW = A.w * (A.tall ? 0.9 : 0.8);
  const g = groupAt(phrases(ws, Math.floor(maxW / (size * 0.62)) * 2, 9), t, 0.8);
  if (!g) return "";
  // Without marked words, the longest word in each group is the one to lift.
  const marked = g.words.some(function (w) { return w.accent; });
  const longest = g.words.reduce(function (a, w) { return w.w.replace(/[^\w]/g, "").length > a.w.replace(/[^\w]/g, "").length ? w : a; }, g.words[0]);
  const big = function (w) { return marked ? w.accent : p.emphasis !== "marked" && w === longest; };
  const scale = { subtle: 1.5, standard: 2.1, dramatic: 2.8 }[p.contrast] || 2.1;
  const fontFor = function (w) {
    return big(w) ? Object.assign({}, $.font("accent"), { size: Math.min(size * scale, (maxW * 0.95) / Math.max(1, w.w.length * 0.52)), ls: -0.02 })
      : Object.assign({}, $.font("text"), { size: size, weight: 500 });
  };
  const lay = lineUpMixed($, g.words, fontFor, maxW, W / 2, captionY($, A, p.position), 1.12);
  let s = "";
  lay.forEach(function (u) {
    const since = t - (u.s - 0.04);
    if (since < 0 && p.upcoming === "hidden") return;
    const e = $.E.out3($.clamp(since / 0.3));
    const lifted = big(u);
    const word = $.text(u.w, Object.assign({}, u.font, { x: u.x, y: u.y + (1 - e) * u.size * 0.18, fill: lifted ? c.accent : "#FFFFFF", op: since < 0 ? 0.32 : 0.32 + 0.68 * e }));
    s += lifted && since >= 0 ? $.g({ transform: $.tf({ s: 1 + 0.06 * (1 - settle(since / 0.35)), ox: u.x + u.ww / 2, oy: u.y + u.size / 2 }) }, word) : word;
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, g, t, s));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? wordCues(captionWords($, $.data, $.beat("in", 0.05))) : [];
}
