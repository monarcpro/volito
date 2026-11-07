// The whole line on screen, the word being said in sharp focus; the rest sits soft and dim around it.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 74 : A.wide ? 62 : 68) * k * sizeOf(p.size), position: p.position, lh: 1.2 });
  if (!C) return "";
  const f = C.font, blurs = {};
  let ci = -1;
  C.lay.words.forEach(function (u, j) { if (t >= u.s - 0.03) ci = j; });
  const soft = { light: 2.5, standard: 5, deep: 9 }[p.depth] || 5;
  let s = "";
  C.lay.words.forEach(function (u, j) {
    // Focus pulls in as the word starts and lets go as the next one takes it.
    const cur = j === ci;
    const pull = cur ? $.E.out3($.clamp((t - u.s + 0.03) / 0.16)) : 0;
    const said = j < ci;
    const blur = blurFilter($, blurs, (said ? soft * 0.45 : soft) * k * (1 - pull));
    const op = cur ? 0.55 + 0.45 * pull : said ? 0.62 : 0.34;
    const word = $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: u.accent ? c.accent : "#FFFFFF", op: op }));
    const sc = 1 + 0.05 * pull;
    const g = sc === 1 ? word : $.g({ transform: $.tf({ s: sc, ox: u.x + u.ww / 2, oy: u.y + f.size / 2 }) }, word);
    s += blur ? $.g({ extra: blur }, g) : g;
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, s));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}
