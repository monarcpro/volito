// A lowercase collage around each phrase's key word: the key word big in bubblegum pink, the others smaller in white on staggered rows, all in a soft glow.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 5);
  if (!L) return "";
  const key = String(L.key.w).toLowerCase();
  const kf = fitFont($, key, "display", (A.tall ? 170 : A.wide ? 140 : 155) * k * sizeOf(p.size), A.w * 0.7, { family: "Montserrat", weight: 800, ls: -0.05 });
  const sf = Object.assign({}, kf, { size: kf.size * 0.62 });
  const cy = captionY($, A, p.position);
  const kw = $.measure(key, kf), kx = W / 2 - kw / 2 - kf.size * 0.3, ky = cy - kf.size * 0.5;
  const pink = p.palette === "brand" ? c.accent : "#FFB5E8";
  const low = function (ws) { return ws.map(function (w) { return Object.assign({}, w, { w: String(w.w).toLowerCase() }); }); };
  let s = lockRun($, t, low(L.before), sf, kx + kw * 0.12, ky - sf.size * 0.86, "start", "#FFFFFF").s;
  const ki = keyIn($, t, L.key, kx + kw / 2, ky + kf.size / 2);
  if (ki.show) s += $.g({ op: ki.op, transform: ki.tf }, $.text(key, Object.assign({}, kf, { x: kx, y: ky, fill: pink })));
  const after = low(L.after);
  s += lockRun($, t, after.slice(0, 1), Object.assign({}, sf, { size: sf.size * 0.62 }), kx + kw + kf.size * 0.12, ky + kf.size * 0.45, "start", "#FFFFFF").s;
  s += lockRun($, t, after.slice(1), sf, kx + kw * 0.35, ky + kf.size * 0.9, "start", "#FFFFFF").s;
  // The glow: the same words blurred behind, in a pink haze.
  const haze = $.g({ op: 0.55, extra: blurFilter($, {}, kf.size * 0.2) }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, haze + s));
}
