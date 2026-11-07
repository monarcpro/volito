// Calm captions: each word resolves from a soft blur and rises into place as it is said.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const role = p.face === "display" ? "display" : "text";
  const C = captionLines($, A, ws, t, { role: role, size: (A.tall ? 66 : A.wide ? 54 : 60) * k * sizeOf(p.size), font: role === "text" ? { weight: 600 } : {}, position: p.position, lh: 1.24 });
  if (!C) return "";
  const f = C.font, blurs = {};
  let s = "";
  C.lay.words.forEach(function (u) {
    const since = t - (u.s - 0.06);
    if (since < 0) return;
    const e = $.E.out3($.clamp(since / 0.42));
    const blur = blurFilter($, blurs, (1 - e) * 12 * k);
    const word = $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y + (1 - e) * 22 * k, fill: u.accent ? c.accent : "#FFFFFF", op: $.clamp(since / 0.25) }));
    s += blur ? $.g({ extra: blur }, word) : word;
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}
