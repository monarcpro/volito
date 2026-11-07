// A lockup around each phrase's key word: the key word huge in condensed jade capitals, the words before and after it small in an italic serif above it.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 5);
  if (!L) return "";
  const key = String(L.key.w).toUpperCase();
  const kf = fitFont($, key, "display", (A.tall ? 230 : A.wide ? 190 : 210) * k * sizeOf(p.size), A.w * 0.86, { family: "Anton", weight: 400, ls: 0 });
  const cy = captionY($, A, p.position);
  const kw = $.measure(key, kf), kx = W / 2 - kw / 2, ky = cy - kf.size * 0.4;
  const sf = { family: "Instrument Serif", weight: 400, italic: true, ls: 0, size: kf.size * 0.24 };
  const jade = p.palette === "brand" ? c.accent : "#2DD4A0", cream = "#F1F5FF";
  let s = lockRun($, t, L.before, sf, kx, ky - sf.size * 0.95, "start", cream).s + lockRun($, t, L.after, sf, kx + kw, ky - sf.size * 0.95, "end", cream).s;
  const ki = keyIn($, t, L.key, W / 2, ky + kf.size / 2);
  if (ki.show) s += $.g({ op: ki.op, transform: ki.tf }, $.text(key, Object.assign({}, kf, { x: kx, y: ky, fill: jade })));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, $.g({ extra: 'filter="url(#mg-md)"' }, s)));
}
