// A lockup: the key word huge in a formal champagne script, written on as it is said, with the words before it in small spaced capitals above, the words after below, and fine rules either side.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 5);
  if (!L) return "";
  const gold = p.palette === "brand" ? c.accent : "#FFE3A3";
  const kf = fitFont($, L.key.w, "display", (A.tall ? 210 : A.wide ? 170 : 190) * k * sizeOf(p.size), A.w * 0.8, { family: "Great Vibes", weight: 400, ls: 0 });
  const cf = { family: "Inter", weight: 600, ls: 0.3, gap: 0.7, size: Math.max(kf.size * 0.15, 22 * k) };
  const cy = captionY($, A, p.position);
  const kw = $.measure(L.key.w, kf), kx = W / 2 - kw / 2, ky = cy - kf.size * 0.55;
  const caps = function (ws) { return ws.map(function (w) { return Object.assign({}, w, { w: String(w.w).toUpperCase() }); }); };
  // The capitals sit clear of the script: above its tall strokes, below its descenders.
  const topY = ky + kf.size * 0.04 - cf.size * 1.05, botY = ky + kf.size * 1.14;
  const top = lockRun($, t, caps(L.before), cf, W / 2, topY, "middle", "#FFFFFF");
  const bot = lockRun($, t, caps(L.after), cf, W / 2, botY, "middle", "#FFFFFF");
  let s = top.s + bot.s;
  // Fine rules either side of the capitals' row (the top one, else the bottom one).
  const row = L.before.length ? { w: top.w, y: topY } : L.after.length ? { w: bot.w, y: botY } : null;
  if (row) {
    const e = $.E.out3($.clamp((t - L.g.start) / 0.45)), len = kf.size * 0.32 * e, gap = cf.size * 0.9, y = row.y + cf.size * 0.42;
    s += $.line(W / 2 - row.w / 2 - gap - len, y, W / 2 - row.w / 2 - gap, y, { stroke: gold, sw: Math.max(1.5, cf.size * 0.07), op: 0.85 });
    s += $.line(W / 2 + row.w / 2 + gap, y, W / 2 + row.w / 2 + gap + len, y, { stroke: gold, sw: Math.max(1.5, cf.size * 0.07), op: 0.85 });
  }
  // The key word written on in the script, with a soft glow.
  const q = writeP($, t, L.key, 1.1);
  if (q > 0) {
    const word = $.text(L.key.w, Object.assign({}, kf, { x: kx, y: ky, fill: gold }));
    const box = { x: kx, y: ky, ww: kw };
    s += writeOn($, box, kf.size, q, $.g({ op: 0.45, extra: blurFilter($, {}, kf.size * 0.05) }, word)) + writeOn($, box, kf.size, q, word);
  }
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, $.g({ extra: 'filter="url(#mg-sm)"' }, s)));
}
