// Words pop in on their time; the key words go off with a burst of particles in the brand's colours.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 84 : A.wide ? 68 : 76) * k * sizeOf(p.size), font: { ls: -0.02 }, position: p.position, lines: 2, maxWords: 6, lh: 1.14 });
  if (!C) return "";
  const f = C.font;
  // Without marked words, the last word of each group bursts.
  const marked = C.lay.words.some(function (u) { return u.accent; });
  let back = "", front = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    const key = marked ? u.accent : j === C.lay.words.length - 1;
    const cx = u.x + u.ww / 2, cy = u.y + f.size / 2;
    if (key) back += $.burst(t, u.s, cx, cy, { n: 18, r: f.size * 1.7 + u.ww * 0.4, size: f.size * 0.11, colors: [c.accent, c.accent2, "#FFFFFF"], dur: 0.75 });
    const sc = 1 + (key ? 0.5 : 0.3) * (1 - settle(since / 0.22));
    front += $.g({ transform: $.tf({ s: sc, ox: cx, oy: cy }) }, $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: key ? c.accent : "#FFFFFF", op: $.clamp(since / 0.05) })));
  });
  const s = back + $.g({ extra: 'filter="url(#mg-sm)"' }, front);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, s);
}

function sound($) {
  const ws = captionWords($, $.data, $.beat("in", 0.05));
  return ws.filter(function (w) { return w.accent; }).map(function (w) { return { at: w.s, kind: "pop", level: 0.7 }; });
}
