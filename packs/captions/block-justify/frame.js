// A justified two-row lockup in chartreuse capitals: the words before the key word spread across the top, the key word and what follows big and bold beneath.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 5);
  if (!L) return "";
  const lime = p.palette === "brand" ? c.accent : "#E9FF8F";
  const big = [L.key].concat(L.after);
  const line = big.map(function (w) { return String(w.w).toUpperCase(); }).join(" ");
  const bf = fitFont($, line, "display", (A.tall ? 130 : A.wide ? 110 : 120) * k * sizeOf(p.size), A.w * 0.86, { family: "Archivo Black", weight: 400, ls: 0 });
  const cy = captionY($, A, p.position);
  const bw = $.measure(line, bf), bx = W / 2 - bw / 2, by = cy - bf.size * 0.25;
  let s = lockRun($, t, big, bf, bx, by, "start", lime, true).s;
  // The top row spreads its words to the bottom row's width.
  const tf = { family: "Inter", weight: 500, ls: 0.02, size: bf.size * 0.48 };
  const tops = L.before.map(function (w) { return Object.assign({}, w, { w: String(w.w).toUpperCase() }); });
  if (tops.length) {
    // A top row wider than the bottom one (with a word space between its words) is set smaller until it fits.
    const sumOf = function () { return tops.reduce(function (a, w) { return a + $.measure(w.w, tf); }, 0); };
    const natural = sumOf() + tf.size * 0.3 * (tops.length - 1);
    if (natural > bw) tf.size *= bw / natural;
    const widths = tops.map(function (w) { return $.measure(w.w, tf); });
    const free = Math.max(tf.size * 0.3 * (tops.length - 1), bw - widths.reduce(function (a, b) { return a + b; }, 0));
    const gap = tops.length > 1 ? free / (tops.length - 1) : 0;
    let x = tops.length > 1 ? bx : W / 2 - widths[0] / 2;
    tops.forEach(function (w, i) {
      s += lockRun($, t, [w], tf, x, by - tf.size * 1.12, "start", lime).s;
      x += widths[i] + gap;
    });
  }
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, $.g({ extra: 'filter="url(#mg-sm)"' }, s)));
}
