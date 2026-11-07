function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.05);
  const ws = captionWords($, p, tin);
  if (!ws.length) return "";
  const per = { one: 1, two: 2, three: 3 }[p.words] || 2;
  const g = groupAt(phrases(ws, A.tall ? 18 : 26, per), t, 0.5);
  if (!g) return "";
  const scale = { medium: 1, large: 1.2, huge: 1.45 }[p.size] || 1;
  // The group on one line, as big as it fits.
  const line = g.words.map(function (w) { return w.w; }).join(" ");
  const font = fitFont($, line, "display", (A.tall ? 190 : A.wide ? 140 : 160) * k * scale, A.w * 0.9, { ls: -0.02 });
  const lay = lineUp($, g.words, font, A.w * 0.92, W / 2, captionY($, A, p.position) - font.size / 2, 1.05);
  let s = "";
  let newest = -1;
  lay.words.forEach(function (u, j) { if (t >= u.s - 0.03) newest = j; });
  lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    // Each word lands on its own time: in big, then settles with a little overshoot.
    const sc = 1 + 0.42 * (1 - settle(since / 0.2));
    const op = $.clamp(since / 0.05);
    const lit = p.highlight === "newest" ? j === newest : false;
    const fill = u.accent ? c.accent2 : lit ? c.accent : "#FFFFFF";
    const cx = u.x + u.ww / 2, cy = u.y + font.size / 2;
    const word = $.text(u.w, Object.assign({}, font, { x: u.x, y: u.y, fill: fill, op: op }));
    s += $.g({ transform: $.tf({ s: sc, ox: cx, oy: cy, r: (1 - $.E.out3($.clamp(since / 0.2))) * (j % 2 ? 3 : -3) }) }, word);
  });
  s = $.g({ extra: 'filter="url(#mg-md)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.18, outDur: 0.16, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? wordCues(captionWords($, $.data, $.beat("in", 0.05))) : [];
}
