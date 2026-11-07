// Every word on its own block, dropped in at a slight tilt as it is said — light, dark or in the brand's colour.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 70 : A.wide ? 58 : 64) * k * sizeOf(p.size), font: { ls: -0.01 }, position: p.position, lines: 2, maxWords: 6, charW: 0.68, lh: 1.42 });
  if (!C) return "";
  const f = C.font;
  const looks = { light: ["#FFFFFF", "#111111"], dark: ["#111111", "#FFFFFF"], brand: [c.accent, $.on(c.accent)] };
  const look = looks[p.look] || looks.light;
  let s = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    const bg = u.accent ? (p.look === "brand" ? c.accent2 : c.accent) : look[0];
    const ink = u.accent ? $.on(bg) : look[1];
    const e = settle(since / 0.22);
    const tilt = ($.hash(j * 4.3 + C.g.k) - 0.5) * 5;
    const px = f.size * 0.13, py = f.size * 0.12;
    const box = $.rect(u.x - px, u.y - py, u.ww + px * 2, f.size + py * 2, { r: f.size * 0.08, fill: bg }) + $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: ink }));
    s += $.g({ op: $.clamp(since / 0.06), transform: $.tf({ y: -(1 - e) * f.size * 0.7, r: tilt * (0.4 + 0.6 * e), ox: u.x + u.ww / 2, oy: u.y + f.size / 2 }) }, box);
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? wordCues(captionWords($, $.data, $.beat("in", 0.05))) : [];
}
