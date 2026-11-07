// Each phrase's key word in a wide futuristic face lit like a warm glowing tube that flickers on, light words above and below it.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 5);
  if (!L) return "";
  const key = String(L.key.w);
  const kf = fitFont($, key, "display", (A.tall ? 120 : A.wide ? 100 : 110) * k * sizeOf(p.size), A.w * 0.84, { family: "Michroma", weight: 400, ls: 0 });
  const sf = { family: "Inter", weight: 300, ls: 0, size: kf.size * 0.4 };
  const cy = captionY($, A, p.position);
  const kw = $.measure(key, kf), kx = W / 2 - kw / 2, ky = cy - kf.size * 0.45;
  const tube = p.palette === "brand" ? c.accent : "#FFE08A";
  let s = lockRun($, t, L.before, sf, kx, ky - sf.size * 1.15, "start", "#FFFFFF").s + lockRun($, t, L.after, sf, kx + kw, ky + kf.size * 1.12, "end", "#FFFFFF").s;
  const since = t - (L.key.s - 0.03);
  if (since >= 0) {
    // The tube buzzes on for a fifth of a second, then holds.
    const lit = since > 0.22 ? 1 : $.hash(Math.floor(t * 30) * 5.3) < 0.35 + since * 3 ? 1 : 0.1;
    const word = $.text(key, Object.assign({}, kf, { x: kx, y: ky, fill: tube, stroke: tube, sw: kf.size * 0.06 }));
    s += $.g({ op: 0.75 * lit, extra: blurFilter($, {}, kf.size * 0.13) }, word) + $.g({ op: lit }, word);
  }
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, s));
}
