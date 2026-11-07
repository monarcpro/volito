// Mixed type around each phrase's key word: an italic serif, a small sans and the key word in bold coral capitals, stacked into one composition.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 5);
  if (!L) return "";
  const key = String(L.key.w).toUpperCase();
  const kf = fitFont($, key, "display", (A.tall ? 150 : A.wide ? 120 : 135) * k * sizeOf(p.size), A.w * 0.62, { family: "Inter", weight: 700, ls: -0.01 });
  const serif = { family: "Instrument Serif", weight: 400, italic: true, ls: 0, size: kf.size * 0.62 };
  const small = { family: "Inter", weight: 500, ls: 0, size: kf.size * 0.3 };
  const cy = captionY($, A, p.position);
  const kw = $.measure(key, kf), kx = W / 2 - kw / 2 + kf.size * 0.4, ky = cy - kf.size * 0.4;
  const coral = p.palette === "brand" ? c.accent : "#FF8C5A";
  let s = "";
  // Above: the first word in the serif; beside the key: the rest of the words before it, small.
  s += lockRun($, t, L.before.slice(0, 1), serif, kx + kw * 0.1, ky - serif.size * 0.92, "start", "#FFFFFF").s;
  s += lockRun($, t, L.before.slice(1), small, kx - kf.size * 0.1, ky + kf.size * 0.52, "end", "#FFFFFF").s;
  const ki = keyIn($, t, L.key, kx + kw / 2, ky + kf.size / 2);
  if (ki.show) s += $.g({ op: ki.op, transform: ki.tf }, $.text(key, Object.assign({}, kf, { x: kx, y: ky, fill: coral })));
  // Below: a small word, then the rest in the serif.
  const a1 = lockRun($, t, L.after.slice(0, 1), small, kx + kw * 0.08, ky + kf.size * 1.12, "start", "#FFFFFF");
  s += a1.s + lockRun($, t, L.after.slice(1), serif, kx + kw * 0.08 + a1.w + small.size * 0.3, ky + kf.size * 0.86, "start", "#FFFFFF").s;
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, $.g({ extra: 'filter="url(#mg-sm)"' }, s)));
}
