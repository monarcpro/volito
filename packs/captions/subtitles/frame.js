function frame(t, $) {
  const p = $.data, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0);
  const ws = captionWords($, p, tin);
  if (!ws.length) return "";
  const scale = { small: 0.85, medium: 1, large: 1.2 }[p.size] || 1;
  const font = Object.assign({}, $.font("text"), { weight: 600, ls: 0, size: (A.tall ? 50 : A.wide ? 46 : 48) * k * scale });
  const maxW = A.w * (A.tall ? 0.88 : 0.72);
  const perLine = Math.max(16, Math.min(42, Math.floor(maxW / (font.size * 0.5))));
  const groups = phrases(ws, perLine * 2, 16);
  // A subtitle stays at least a second (or until the next one), so it can be read.
  const g = groupAt(groups, t, 0.9);
  if (!g) return "";
  const lh = 1.3;
  const probe = lineUp($, g.words, font, maxW, W / 2, 0, lh);
  const bottom = p.position === "top" ? null : H * (A.tall ? 0.76 : 0.9);
  const top = p.position === "top" ? H * (A.tall ? 0.14 : 0.08) : bottom - probe.h;
  const lay = lineUp($, g.words, font, maxW, W / 2, top, lh);
  let s = "";
  if (p.ground !== "shadow") {
    lay.widths.forEach(function (w, li) {
      const y = lay.words.find(function (u) { return u.line === li; }).y;
      s += $.rect(W / 2 - w / 2 - font.size * 0.36, y - font.size * 0.18, w + font.size * 0.72, font.size * 1.36, { r: font.size * 0.14, fill: "#000000", op: p.ground === "solid" ? 0.86 : 0.6 });
    });
  }
  lay.words.forEach(function (u) {
    s += $.text(u.w, Object.assign({}, font, { x: u.x, y: u.y, fill: u.accent ? $.c.accent : "#FFFFFF" }));
  });
  const fade = Math.min($.clamp((t - g.start) / 0.1), $.clamp((g.end - t) / 0.1));
  s = $.g({ op: fade }, s);
  if (p.ground === "shadow") s = $.g({ extra: 'filter="url(#mg-sm)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, s);
}
