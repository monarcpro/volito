// Words as stickers: bold letters in a thick white die-cut border, slapped on at a tilt as they are said.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 92 : A.wide ? 72 : 82) * k * sizeOf(p.size), font: { ls: -0.01 }, position: p.position, lines: 2, maxWords: 5, charW: 0.66, lh: 1.12 });
  if (!C) return "";
  const f = C.font;
  const palette = p.color === "ink" ? ["#151515"] : p.color === "mixed" ? [c.accent, c.accent2, "#151515"] : [c.accent];
  const groupTilt = ($.hash(C.g.k * 2.3) - 0.5) * 7;
  let s = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    const fill = u.accent ? c.accent2 : palette[j % palette.length];
    const e = settle(since / 0.2);
    const cx = u.x + u.ww / 2, cy = u.y + f.size / 2;
    const word = $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: fill, stroke: "#FFFFFF", sw: f.size * 0.2 }));
    s += $.g({ op: $.clamp(since / 0.04), transform: $.tf({ s: 1 + 0.55 * (1 - e), r: (1 - e) * (j % 2 ? 9 : -9), ox: cx, oy: cy }) }, word);
  });
  s = $.g({ transform: $.tf({ r: groupTilt, ox: $.W / 2, oy: captionY($, A, p.position) }) }, s);
  s = $.g({ extra: 'filter="url(#mg-md)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, s);
}

function sound($) {
  const ws = captionWords($, $.data, $.beat("in", 0.05));
  return $.data.ticks ? ws.map(function (w) { return { at: w.s, kind: "stamp", level: 0.5 }; }) : [];
}
