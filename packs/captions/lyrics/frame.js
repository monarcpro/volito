// Lyrics: the line being sung sits big in the middle, the ones before and after small and dim around it, and the view scrolls as the song moves on.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 78 : A.wide ? 64 : 70) * k * sizeOf(p.size);
  const maxW = A.w * 0.9;
  const groups = phrases(ws, Math.floor(maxW / (size * 0.58)), 7);
  const g = groupAt(groups, t, 1.5);
  if (!g) return "";
  // Where the view is: it eases from the line before to this one over 0.4 s.
  const pos = g.k - 1 + $.E.out3($.clamp((t - g.start) / 0.4));
  const cy = captionY($, A, p.position === "bottom" ? "bottom" : "center");
  const left = p.align === "center" ? null : A.x + A.w * 0.05;
  let s = "";
  for (let j = Math.max(0, Math.floor(pos) - 2); j <= Math.min(groups.length - 1, Math.ceil(pos) + 2); j++) {
    const d = j - pos;
    const near = Math.max(0, 1 - Math.abs(d));
    const f = Object.assign({}, $.font("display"), { size: size * (0.66 + 0.34 * near), ls: -0.02 });
    const op = (0.26 + 0.74 * near) * $.clamp(1.6 - Math.abs(d) * 0.55);
    if (op <= 0.02) continue;
    const y = cy + d * size * 1.5 - f.size / 2;
    const text = groups[j].map(function (w) { return w.w; }).join(" ");
    const fit = Math.min(1, maxW / Math.max(1, $.measure(text, f)));
    f.size *= fit;
    const lay = lineUp($, groups[j], f, maxW * 2, left === null ? $.W / 2 : left + $.measure(text, f) / 2, y, 1);
    lay.words.forEach(function (u) {
      const sung = t >= u.s - 0.03;
      const wop = j === g.k ? (sung ? 1 : 0.45) : 1;
      s += $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: j === g.k && sung && u.accent ? c.accent : "#FFFFFF", op: op * wop }));
    });
  }
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.25, outDur: 0.22, vary: false }, s);
}
