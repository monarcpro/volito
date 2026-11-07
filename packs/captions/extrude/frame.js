// Chunky retro 3D: each word pops up out of the frame with a deep extrusion in the brand's colour behind its face.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 88 : A.wide ? 72 : 80) * k * sizeOf(p.size), font: { ls: 0 }, position: p.position, lines: 2, maxWords: 6, charW: 0.66, lh: 1.24 });
  if (!C) return "";
  const f = C.font, steps = 10;
  const dir = { "down-right": [1, 1], down: [0, 1.3], "down-left": [-1, 1] }[p.direction] || [1, 1];
  let s = "";
  C.lay.words.forEach(function (u) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    const e = settle(since / 0.28);
    const depth = f.size * 0.11 * Math.max(0, e);
    const face = u.accent ? c.accent2 : "#FFFFFF", side = u.accent ? c.accent : c.accent;
    // The face rises off the extrusion as it grows.
    for (let i = steps; i >= 1; i--) {
      const d = (depth * i) / steps;
      s += $.text(u.w, Object.assign({}, f, { x: u.x + dir[0] * d - dir[0] * depth, y: u.y + dir[1] * d - dir[1] * depth, fill: side, op: $.clamp(since / 0.05) * (0.55 + 0.45 * (i / steps)) }));
    }
    s += $.text(u.w, Object.assign({}, f, { x: u.x - dir[0] * depth, y: u.y - dir[1] * depth, fill: face, op: $.clamp(since / 0.05) }));
  });
  s = $.g({ extra: 'filter="url(#mg-md)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? wordCues(captionWords($, $.data, $.beat("in", 0.05))) : [];
}
