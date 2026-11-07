// Neon tubes: the line hangs unlit, and each word flickers on as it is said with a glow in the brand's colours.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 76 : A.wide ? 64 : 70) * k * sizeOf(p.size), position: p.position, lh: 1.22 });
  if (!C) return "";
  const f = C.font, blurs = {};
  const wide = blurFilter($, blurs, 14 * k), tight = blurFilter($, blurs, 4 * k);
  let glow = "", core = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.02);
    const hue = u.accent ? c.accent2 : c.accent;
    // A tube buzzes as it catches, then holds; lit tubes drift a hair.
    const lit = since < 0 ? 0 : since > 0.2 ? 1 : $.hash(Math.floor(t * 30) * 7.13 + j) < 0.35 + since * 3.2 ? 1 : 0.12;
    const dy = Math.sin(t * 2.1 + j * 1.7) * 1.6 * k * (since > 0.2 ? 1 : 0);
    const at = Object.assign({}, f, { x: u.x, y: u.y + dy });
    if (lit < 0.5) {
      core += $.text(u.w, Object.assign({}, at, { fill: "none", stroke: $.rgba(hue, 0.42), sw: 1.6 * k, op: 1 }));
      return;
    }
    glow += $.g({ extra: wide }, $.text(u.w, Object.assign({}, at, { fill: hue, stroke: hue, sw: f.size * 0.06, op: 0.85 })));
    glow += $.g({ extra: tight }, $.text(u.w, Object.assign({}, at, { fill: hue, op: 0.9 })));
    core += $.text(u.w, Object.assign({}, at, { fill: "#FFFFFF", stroke: hue, sw: f.size * 0.025 }));
  });
  const s = groupIn($, C.g, t, glow + core);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  const ws = captionWords($, $.data, $.beat("in", 0.05));
  return $.data.ticks ? ws.map(function (w) { return { at: w.s, kind: "zap", level: w.accent ? 0.6 : 0.35 }; }) : [];
}
