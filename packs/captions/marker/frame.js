// A highlighter swipes under each word as it is said and stays lit, so the line fills with colour as it is spoken.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 74 : A.wide ? 62 : 68) * k * sizeOf(p.size), position: p.position, lh: 1.26 });
  if (!C) return "";
  const f = C.font;
  let marks = "", words = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.02);
    const ink = u.accent ? c.accent2 : c.accent;
    if (since >= 0) {
      // The swipe takes about as long as the word, a little crooked, like a real pen.
      const e = $.E.out3($.clamp(since / Math.max(0.12, Math.min(0.32, (u.e - u.s) * 0.85))));
      const x = u.x - f.size * 0.14, y = u.y + f.size * (p.style === "underline" ? 0.62 : 0.06), h = f.size * (p.style === "underline" ? 0.36 : 1.0);
      const tilt = (($.hash(j + 3) - 0.5) * 2.4);
      marks += $.rect(x, y, (u.ww + f.size * 0.28) * e, h, { r: f.size * 0.1, fill: ink, op: 0.95, transform: $.tf({ r: tilt, ox: x, oy: y + h / 2 }) });
    }
    const on = since >= 0 && p.style !== "underline";
    words += $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: on ? $.on(ink) : "#FFFFFF", op: since >= 0 ? 1 : 0.55 }));
  });
  const s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, marks + words));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? wordCues(captionWords($, $.data, $.beat("in", 0.05))) : [];
}
