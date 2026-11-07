// Each word is wiped on from the left as it is said, an accent edge leading the reveal.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 76 : A.wide ? 62 : 68) * k * sizeOf(p.size), position: p.position, lh: 1.2 });
  if (!C) return "";
  const f = C.font;
  let s = "";
  C.lay.words.forEach(function (u) {
    const since = t - (u.s - 0.02);
    const fill = u.accent ? c.accent : "#FFFFFF";
    if (since < 0) {
      if (p.upcoming === "dim") s += $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: "#FFFFFF", op: 0.3 }));
      return;
    }
    const e = $.E.inOut3($.clamp(since / Math.max(0.14, Math.min(0.34, (u.e - u.s) * 0.9))));
    const pad = f.size * 0.08, w = (u.ww + pad * 2) * e;
    s += $.clip(u.x - pad, u.y - f.size * 0.25, w, f.size * 1.5, 0, $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: fill })));
    if (e < 1) s += $.rect(u.x - pad + w - f.size * 0.03, u.y - f.size * 0.06, f.size * 0.07, f.size * 1.12, { r: f.size * 0.03, fill: c.accent });
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, s));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}
