// Words fall in from above on their time and bounce to rest on the line, squashing a little as they land.
function bounce(x) {
  const n = 7.5625, d = 2.75;
  x = Math.max(0, Math.min(1, x));
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; }
  if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; }
  x -= 2.625 / d;
  return n * x * x + 0.984375;
}

function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, H = $.H;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 82 : A.wide ? 68 : 74) * k * sizeOf(p.size), font: { ls: -0.01 }, position: p.position, lines: 2, maxWords: 7, lh: 1.55 });
  if (!C) return "";
  const f = C.font;
  // Fall from a couple of lines up: the first bounce stays below the line above.
  const fall = Math.min(H * 0.16, f.size * 2.4);
  // Each line's words fall within the space below the line above, so they never cross it.
  const tops = [];
  C.lay.words.forEach(function (u) { tops[u.line] = tops[u.line] === undefined ? u.y : Math.min(tops[u.line], u.y); });
  let s = "";
  C.lay.words.forEach(function (u) {
    const since = t - (u.s - 0.14);
    if (since < 0) return;
    const x = $.clamp(since / 0.62);
    const y = -(1 - bounce(x)) * fall;
    // A squash at each contact with the line, smaller with every bounce.
    const sq = 1 - [[0.364, 0.16], [0.727, 0.08], [0.909, 0.04]].reduce(function (a, h) { return a + h[1] * Math.exp(-Math.pow((x - h[0]) / 0.035, 2)); }, 0);
    const cx = u.x + u.ww / 2, base = u.y + f.size;
    const word = $.g({ transform: $.tf({ y: y, sx: 2 - sq, sy: sq, ox: cx, oy: base }) }, $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: u.accent ? c.accent : "#FFFFFF", op: $.clamp(since / 0.12) })));
    const top = u.line ? tops[u.line - 1] + f.size * 1.08 : tops[0] - fall - f.size;
    s += $.clip(0, top, $.W, tops[u.line] + f.size * 1.35 - top, 0, word);
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? captionWords($, $.data, $.beat("in", 0.05)).map(function (w) { return { at: w.s + 0.08, kind: "pop", level: 0.45 }; }) : [];
}
