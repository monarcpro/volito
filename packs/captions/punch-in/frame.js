// Each phrase punches in from far too close, out of a blur, then holds with a slow push while its words light up as they are said.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const groups = phrases(ws, A.tall ? 18 : 28, 5);
  const g = groupAt(groups, t, 0.6);
  if (!g) return "";
  const line = g.words.map(function (w) { return w.w; }).join(" ");
  const f = fitFont($, line, "display", (A.tall ? 130 : A.wide ? 110 : 120) * k * sizeOf(p.size), A.w * 0.9, { ls: -0.02 });
  const cy = captionY($, A, p.position);
  const lay = lineUp($, g.words, f, A.w * 0.92, W / 2, cy - f.size / 2, 1.05);
  const since = t - g.start;
  const e = 1 - Math.pow(2, -10 * $.clamp(since / 0.32));
  const sc = 2.6 - 1.6 * e + 0.035 * $.clamp((since - 0.32) / Math.max(0.5, g.end - g.start));
  const blur = blurFilter($, {}, (1 - e) * 16 * k);
  let ci = -1;
  lay.words.forEach(function (u, j) { if (t >= u.s - 0.03) ci = j; });
  let s = "";
  lay.words.forEach(function (u, j) {
    const fill = j === ci ? c.accent : u.accent ? c.accent2 : "#FFFFFF";
    s += $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: fill, op: j <= ci ? 1 : 0.4 }));
  });
  s = $.g({ op: $.clamp(since / 0.1), transform: $.tf({ s: sc, ox: W / 2, oy: cy }) }, s);
  if (blur) s = $.g({ extra: blur }, s);
  s = $.g({ extra: 'filter="url(#mg-md)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, s);
}

function sound($) {
  const groups = phrases(captionWords($, $.data, $.beat("in", 0.05)), 22, 5);
  return groups.map(function (g) { return { at: g[0].s - 0.08, kind: "whoosh", level: 0.4, pitch: 3, dur: 0.3 }; });
}
