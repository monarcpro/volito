// The phrase on screen with a thin bar under it that fills with the voice; the words light up as they are said.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 70 : A.wide ? 58 : 64) * k * sizeOf(p.size), position: p.position, lh: 1.2 });
  if (!C) return "";
  const f = C.font, words = C.g.words;
  const first = words[0], last = words[words.length - 1];
  const share = $.clamp((t - first.s) / Math.max(0.2, last.end - first.s));
  const bw = Math.max.apply(null, C.lay.widths), bx = W / 2 - bw / 2;
  const by = C.lay.words[C.lay.words.length - 1].y + f.size * 1.32, bh = Math.max(4, f.size * 0.08);
  let s = $.rect(bx, by, bw, bh, { r: bh / 2, fill: "#FFFFFF", op: 0.22 });
  s += $.rect(bx, by, Math.max(bh, bw * share), bh, { r: bh / 2, fill: c.accent });
  s += $.circle(bx + Math.max(bh / 2, bw * share), by + bh / 2, bh * 1.3, { fill: c.accent });
  C.lay.words.forEach(function (u) {
    const said = t >= u.s - 0.03;
    s += $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: said && u.accent ? c.accent : "#FFFFFF", op: said ? 1 : 0.4 }));
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, s));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}
