// Bold words filled with a gradient of the brand's two accents, each bouncing in on its time.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 88 : A.wide ? 72 : 80) * k * sizeOf(p.size), font: { ls: -0.02 }, position: p.position, lines: 2, maxWords: 6, lh: 1.08 });
  if (!C) return "";
  const f = C.font;
  const angle = { across: 90, down: 180, diagonal: 135 }[p.direction] || 90;
  let s = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.04);
    if (since < 0) return;
    // An elastic land: in from small, past full size, back, settled in a third of a second.
    const x = $.clamp(since / 0.45);
    const el = x >= 1 ? 1 : 1 - Math.pow(2, -9 * x) * Math.cos(x * Math.PI * 3.2);
    const fill = u.accent ? $.gradient([c.accent2, "#FFFFFF"], { angle: angle }) : $.gradient([c.accent, c.accent2], { angle: angle });
    const word = $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: fill, op: $.clamp(since / 0.06) }));
    s += $.g({ transform: $.tf({ s: Math.max(0.01, 0.4 + 0.6 * el), r: (1 - $.clamp(since / 0.3)) * (j % 2 ? 4 : -4), ox: u.x + u.ww / 2, oy: u.y + f.size / 2 }) }, word);
  });
  s = $.g({ extra: 'filter="url(#mg-md)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? wordCues(captionWords($, $.data, $.beat("in", 0.05))) : [];
}
