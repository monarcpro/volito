// A poster lockup: each phrase's key word in huge condensed capitals filled with a cool tide-blue gradient, the other words in a white serif laid across it.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 5);
  if (!L) return "";
  const key = String(L.key.w).toUpperCase();
  const kf = fitFont($, key, "display", (A.tall ? 250 : A.wide ? 210 : 230) * k * sizeOf(p.size), A.w * 0.9, { family: "Anton", weight: 400, ls: 0 });
  const cy = captionY($, A, p.position);
  const kw = $.measure(key, kf), kx = W / 2 - kw / 2, ky = cy - kf.size * 0.45;
  const fillKey = p.palette === "brand" ? $.gradient([c.accent2, c.accent], { angle: 180 }) : $.gradient(["#B5F4FF", "#3FC5F0", "#3A5BEF"], { angle: 180 });
  let s = "";
  const ki = keyIn($, t, L.key, W / 2, ky + kf.size / 2);
  if (ki.show) s += $.g({ op: ki.op, transform: ki.tf }, $.text(key, Object.assign({}, kf, { x: kx, y: ky, fill: fillKey })));
  // The words before the key laid across its middle; the words after it beneath.
  const sf = { family: "Playfair Display", weight: 400, ls: -0.01, size: kf.size * 0.24 };
  s += lockRun($, t, L.before, sf, W / 2, ky + kf.size * 0.36, "middle", "#FFFFFF").s;
  s += lockRun($, t, L.after, sf, W / 2, ky + kf.size * 1.02, "middle", "#FFFFFF").s;
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, $.g({ extra: 'filter="url(#mg-md)"' }, s)));
}
