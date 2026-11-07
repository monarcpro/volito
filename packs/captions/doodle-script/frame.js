// Handwritten words with yellow doodles: the key word in yellow, scribbled under and sparked as it is said.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 60 : A.wide ? 48 : 54) * k * sizeOf(p.size);
  const C = captionLines($, A, ws, t, { size: size, font: { family: "Homemade Apple", weight: 400, ls: 0, gap: 0.75 }, charW: 0.7, lines: 2, maxWords: 6, lh: 1.65, position: p.position });
  if (!C) return "";
  const yellow = p.palette === "brand" ? c.accent : "#FFD93D";
  const key = C.g.words[keyIndex(C.g.words)];
  let s = "", doodles = "";
  C.lay.words.forEach(function (u) {
    const since = t - (u.s - 0.03);
    const isKey = u.i === key.i;
    if (since >= 0) {
      const e = $.E.out3($.clamp(since / 0.3));
      s += $.text(u.w, Object.assign({}, C.font, { x: u.x, y: u.y + (1 - e) * size * 0.2, fill: isKey || u.accent ? yellow : "#FFFFFF", op: $.clamp(since / 0.2) }));
    }
    if (!isKey) return;
    // Under the key word: a scribble and a second, shorter pass; at its top right, three sparks.
    const at = u.s + 0.08, x0 = u.x - size * 0.1, x1 = u.x + u.ww + size * 0.1, y = u.y + size * 1.2;
    const sw = Math.max(3, size * 0.075);
    doodles += $.ink(t, at, $.hand.line(x0, y, x1, y - size * 0.06, { seed: 3 + u.i }), { color: yellow, sw: sw, dur: 0.24 });
    doodles += $.ink(t, at + 0.22, $.hand.line(x0 + size * 0.3, y + size * 0.14, x1 - size * 0.4, y + size * 0.1, { seed: 7 + u.i }), { color: yellow, sw: sw, dur: 0.18 });
    const ox = u.x + u.ww + size * 0.06, oy = u.y + size * 0.3;
    [-80, -45, -10].forEach(function (deg, i) {
      const a = (deg * Math.PI) / 180, r0 = size * 0.12, r1 = size * 0.44;
      doodles += $.ink(t, at + 0.36 + i * 0.07, $.hand.line(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0, ox + Math.cos(a) * r1, oy + Math.sin(a) * r1, { seed: 11 + i }), { color: yellow, sw: sw * 0.85, dur: 0.1 });
    });
  });
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, groupIn($, C.g, t, $.g({ extra: 'filter="url(#mg-sm)"' }, s + doodles)));
}
