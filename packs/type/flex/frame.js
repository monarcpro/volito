// Weight in motion: each letter of a word swells from thin to heavy and back in a wave that runs along it, the
// word re-centring as it breathes, then every letter settles on the heaviest cut.
var CUTS = [300, 400, 500, 600, 700, 800, 900];
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  let s = ground(M, $, t);
  const word = $.case(String(p.text || ""));
  const chars = word.split("");
  const n = chars.length;
  const family = p.face === "brand" ? $.font("display").family : "Inter";
  // Sized so the word at its heaviest fits the width.
  const big = fitFont($, word, "display", (A.tall ? 260 : 240) * k, A.w * 0.94, { family: family, weight: 900, ls: -0.02 });
  const size = big.size;
  const end = $.beat("out", $.dur - 0.45) - 0.8;
  const settle = $.E.inOut2($.seg(t, end - 0.6, end));
  const weights = chars.map(function (ch, i) {
    const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * ((t - tin) * (Number(p.speed) || 0.8) - i / Math.max(1, n) * 1.2));
    const v = $.lerp(300 + 600 * wave, 900, settle);
    return CUTS.reduce(function (a, b) { return Math.abs(b - v) < Math.abs(a - v) ? b : a; }, 300);
  });
  const widths = chars.map(function (ch, i) { return $.measure(ch, { family: family, weight: weights[i], size: size, ls: -0.02 }); });
  const total = widths.reduce(function (a, b) { return a + b; }, 0);
  let x = W / 2 - total / 2;
  const y = A.y + A.h / 2 - size * 0.55;
  let line = "";
  chars.forEach(function (ch, i) {
    const lit = weights[i] >= 800;
    line += $.text(ch, { family: family, weight: weights[i], size: size, ls: -0.02, x: x, y: y, fill: lit ? c.accent : c.fg });
    x += widths[i];
  });
  s += M.part("word", { at: tin, in: "rise", distance: 40, out: "fade", box: { x: W / 2 - total / 2, y: y, w: total, h: size } }, line);
  if (p.subtitle) {
    const sf = Object.assign({}, $.font("mono"), { size: 30 * k, ls: 0.12 });
    s += M.text("subtitle", Object.assign({ at: tin + 0.4, in: "fade", dur: 0.5 }, sf, { x: W / 2, y: y + size * 1.15, anchor: "middle", fill: c.mute }), String(p.subtitle).toUpperCase());
  }
  return s;
}
