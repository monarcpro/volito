// Handwritten captions: each word written on in a marker hand as it is said, the key words underlined or circled with a quick scribble.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const hand = { family: p.hand === "print" ? "Patrick Hand" : "Caveat", weight: p.hand === "print" ? 400 : 700 };
  const C = captionLines($, A, ws, t, { size: (A.tall ? 104 : A.wide ? 86 : 94) * k * sizeOf(p.size), font: Object.assign({ ls: 0 }, hand), position: p.position, charW: 0.46, lh: 1.08 });
  if (!C) return "";
  const f = C.font;
  let ink = "", marks = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    // Written left to right across the word's own time.
    const e = $.clamp(since / Math.max(0.12, Math.min(0.45, (u.e - u.s) * 0.95)));
    const pad = f.size * 0.1;
    ink += $.clip(u.x - pad, u.y - f.size * 0.3, (u.ww + pad * 2) * e, f.size * 1.6, 0, $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: u.accent ? c.accent : "#FFFFFF" })));
    if (!u.accent) return;
    const d = $.clamp((since - 0.2) / 0.35);
    if (d <= 0) return;
    const wob = function (n) { return ($.hash(j * 9.1 + n) - 0.5) * f.size * 0.08; };
    const x0 = u.x - pad, x1 = u.x + u.ww + pad, base = u.y + f.size * 0.92;
    const path = p.mark === "circle"
      ? "M" + (x0 + f.size * 0.1) + " " + (u.y + f.size * 0.18 + wob(1)) + " C" + (x0 - f.size * 0.25) + " " + (u.y + f.size * 0.9) + " " + (x1 + f.size * 0.1) + " " + (u.y + f.size * 1.15 + wob(2)) + " " + (x1 + f.size * 0.12) + " " + (u.y + f.size * 0.45) + " C" + (x1 + f.size * 0.1) + " " + (u.y - f.size * 0.05) + " " + (x0 + f.size * 0.2) + " " + (u.y - f.size * 0.12 + wob(3)) + " " + (x0 - f.size * 0.02) + " " + (u.y + f.size * 0.35)
      : "M" + x0 + " " + (base + wob(1)) + " Q" + (x0 + x1) / 2 + " " + (base + f.size * 0.12 + wob(2)) + " " + x1 + " " + (base + wob(3)) + " M" + (x0 + f.size * 0.15) + " " + (base + f.size * 0.16 + wob(4)) + " Q" + (x0 + x1) / 2 + " " + (base + f.size * 0.24 + wob(5)) + " " + (x1 - f.size * 0.1) + " " + (base + f.size * 0.13 + wob(6));
    marks += $.path(path, { stroke: c.accent2, sw: f.size * 0.07, draw: d });
  });
  const s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, marks + ink));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}
