// Two-tone: each word cut through the middle, its top half in white and its bottom half in the accent, the halves sliding together as it is said.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 90 : A.wide ? 74 : 82) * k * sizeOf(p.size), font: { ls: -0.01 }, position: p.position, lines: 2, maxWords: 6, charW: 0.64, lh: 1.08 });
  if (!C) return "";
  const f = C.font;
  const lower = p.colors === "accents" ? c.accent2 : c.accent, upper = p.colors === "accents" ? c.accent : "#FFFFFF";
  let s = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    const e = $.E.out3($.clamp(since / 0.24));
    const slide = (1 - e) * f.size * 0.6 * (j % 2 ? 1 : -1);
    const pad = f.size * 0.2, top = u.y - f.size * 0.3, mid = u.y + f.size * 0.5, bottom = u.y + f.size * 1.3;
    const word = function (fill, dx) { return $.text(u.w, Object.assign({}, f, { x: u.x + dx, y: u.y, fill: fill, op: $.clamp(since / 0.06) })); };
    s += $.clip(u.x - pad - f.size, top, u.ww + pad * 2 + f.size * 2, mid - top, 0, word(u.accent ? lower : upper, slide));
    s += $.clip(u.x - pad - f.size, mid, u.ww + pad * 2 + f.size * 2, bottom - mid, 0, word(u.accent ? upper : lower, -slide));
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, s));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, s);
}
