// Each word lands as a broken signal — split into red and cyan, jittering, a slice torn sideways — then locks clean.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 80 : A.wide ? 64 : 72) * k * sizeOf(p.size), font: { ls: 0 }, position: p.position, lh: 1.18 });
  if (!C) return "";
  const f = C.font, fr = Math.floor(t * 30);
  const amount = { subtle: 0.5, standard: 1, heavy: 1.7 }[p.intensity] || 1;
  let s = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    // Glitch strength: high as the word lands, gone after a quarter second (accent words flare again now and then).
    let g = Math.max(0, 1 - since / 0.26);
    if (u.accent && since > 0.5 && $.hash(Math.floor(t * 6) * 3.1 + j) > 0.86) g = 0.6;
    g *= amount;
    const fill = u.accent ? c.accent : "#FFFFFF";
    const at = function (dx, dy, col, op) { return $.text(u.w, Object.assign({}, f, { x: u.x + dx, y: u.y + dy, fill: col, op: op })); };
    if (g <= 0.01) { s += at(0, 0, fill, 1); return; }
    const jx = ($.hash(fr * 3.3 + j) - 0.5) * 26 * k * g, jy = ($.hash(fr * 5.7 + j) - 0.5) * 8 * k * g;
    const split = (5 + 16 * g) * k;
    s += at(jx - split, jy, "#FF2D55", 0.85) + at(jx + split, jy, "#22E4FF", 0.85);
    if ($.hash(fr * 9.1 + j) > 0.18 * g) s += at(jx, jy, fill, 1);
    // A torn slice: one band of the word shoved sideways.
    const band = u.y + f.size * (0.1 + 0.7 * $.hash(fr * 2.9 + j)), bh = f.size * 0.18;
    s += $.clip(u.x - f.size, band, u.ww + f.size * 2, bh, 0, at(jx + ($.hash(fr * 7.7 + j) - 0.5) * 60 * k * g, jy, fill, 1));
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, s));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  const ws = captionWords($, $.data, $.beat("in", 0.05));
  return $.data.ticks ? ws.map(function (w) { return { at: w.s, kind: "zap", level: 0.45 }; }) : [];
}
