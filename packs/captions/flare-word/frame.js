// A lockup around each phrase's key word: the key word in huge glowing magenta capitals, the words before it small above on the left, the words after it small below on the right.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 5);
  if (!L) return "";
  const key = String(L.key.w).toUpperCase();
  const kf = fitFont($, key, "display", (A.tall ? 190 : A.wide ? 160 : 175) * k * sizeOf(p.size), A.w * 0.84, { family: "Inter", weight: 900, ls: -0.01 });
  const cy = captionY($, A, p.position);
  const kw = $.measure(key, kf), kx = W / 2 - kw / 2, ky = cy - kf.size * 0.45;
  const sf = { family: "Inter", weight: 800, ls: -0.01, size: kf.size * 0.3 };
  const magenta = p.palette === "brand" ? c.accent : "#FF4FD8";
  let s = lockRun($, t, L.before, sf, kx + kf.size * 0.04, ky - sf.size * 0.92, "start", "#FFFFFF").s + lockRun($, t, L.after, sf, kx + kw, ky + kf.size * 0.98, "end", "#FFFFFF").s;
  const ki = keyIn($, t, L.key, W / 2, ky + kf.size / 2);
  if (ki.show) {
    const word = $.text(key, Object.assign({}, kf, { x: kx, y: ky, fill: magenta }));
    s += $.g({ op: ki.op * 0.85, transform: ki.tf, extra: blurFilter($, {}, kf.size * 0.12) }, word) + $.g({ op: ki.op, transform: ki.tf }, word);
  }
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, s));
}
