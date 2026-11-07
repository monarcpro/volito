// One word at a time, as big as the frame allows, slammed in from alternating sides with a smear of motion blur.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const g = groupAt(phrases(ws, A.tall ? 12 : 18, p.words === "two" ? 2 : 1), t, 0.45);
  if (!g) return "";
  const line = g.words.map(function (w) { return w.w; }).join(" ");
  const accent = g.words.some(function (w) { return w.accent; });
  const base = (A.tall ? 300 : A.wide ? 240 : 270) * k * sizeOf(p.size) * (accent ? 1.12 : 1);
  const f = fitFont($, line, "display", base, A.w * 0.9, { ls: -0.03 });
  const cy = captionY($, A, p.position);
  const lay = lineUp($, g.words, f, A.w * 0.92, W / 2, cy - f.size / 2, 1);
  const since = t - g.start;
  // Alternating directions: left, right, up, down; the word travels in fast and settles with a small overshoot.
  const dir = [[-1, 0], [1, 0], [0, -1], [0, 1]][g.k % 4];
  const e = settle(since / 0.24);
  const dist = (dir[0] ? W : H) * 0.55;
  const dx = -dir[0] * (1 - e) * dist, dy = -dir[1] * (1 - e) * dist;
  const speed = 1 - $.E.out3($.clamp(since / 0.2));
  const blur = blurFilter($, {}, Math.abs(dir[0]) * speed * 34 * k, Math.abs(dir[1]) * speed * 34 * k);
  const punch = 1 + 0.08 * (1 - settle(since / 0.3));
  let s = "";
  lay.words.forEach(function (u) {
    s += $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: u.accent ? c.accent : "#FFFFFF" }));
  });
  s = $.g({ transform: $.tf({ x: dx, y: dy, s: punch, ox: W / 2, oy: cy }) }, s);
  if (blur) s = $.g({ extra: blur }, s);
  s = $.g({ extra: 'filter="url(#mg-md)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.18, outDur: 0.16, vary: false }, s);
}

function sound($) {
  const p = $.data, ws = captionWords($, p, $.beat("in", 0.05));
  return ws.map(function (w, i) { return { at: w.s - 0.06, kind: "whoosh", level: 0.4, pitch: (i % 2) * 3, dur: 0.22 }; });
}
