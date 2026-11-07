// The line hangs as hollow outlines; each word fills solid from the left as it is said.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 86 : A.wide ? 70 : 78) * k * sizeOf(p.size), font: { ls: -0.01 }, position: p.position, lh: 1.12 });
  if (!C) return "";
  const f = C.font;
  let s = "";
  C.lay.words.forEach(function (u) {
    const fill = u.accent ? c.accent : p.fill === "accent" ? c.accent : "#FFFFFF";
    const line = u.accent ? c.accent : "#FFFFFF";
    s += $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: "none", stroke: line, sw: Math.max(1.5, f.size * 0.03), op: 0.85 }));
    const since = t - (u.s - 0.02);
    if (since < 0) return;
    const e = $.E.out3($.clamp(since / Math.max(0.12, Math.min(0.32, (u.e - u.s) * 0.85))));
    const pad = f.size * 0.06;
    s += $.clip(u.x - pad, u.y - f.size * 0.25, (u.ww + pad * 2) * e, f.size * 1.5, 0, $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: fill })));
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, s));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}
