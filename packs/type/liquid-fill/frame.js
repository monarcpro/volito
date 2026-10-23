function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.2);
  let s = ground(M, $, t);
  const str = $.case(p.word);
  const f = fitFont($, str, "display", Math.min(A.h * 0.42, 320 * k), A.w * 0.92, { ls: -0.03 });
  const tw = $.measure(str, f), x0 = W / 2 - tw / 2, y = H / 2 - f.size * (p.tagline ? 0.72 : 0.56);
  const top = y + f.size * 0.12, bot = y + f.size * 0.96;
  const word = function (fill, stroke) { return $.text(str, Object.assign({}, f, { x: W / 2, y: y, anchor: "middle", fill: fill, stroke: stroke, sw: stroke ? 3.2 * k : undefined })); };
  const lvl = $.E.inOut2($.seg(t, tin + 0.4, tin + 2.2));
  const wave = function (level, amp, ph, id) {
    let d = "M" + (x0 - 20 * k) + " " + (bot + 20 * k);
    for (let i = 0; i <= 30; i++) { const x = x0 - 20 * k + ((tw + 40 * k) * i) / 30; d += "L" + x + " " + (level + Math.sin(i * 0.65 + (t - tin) * 4 + ph) * amp); }
    d += "L" + (x0 + tw + 20 * k) + " " + (bot + 20 * k) + "Z";
    $.def('<clipPath id="' + id + '"><path d="' + d + '"/></clipPath>');
    return 'clip-path="url(#' + id + ')"';
  };
  const amp = f.size * 0.045 * (1 - 0.6 * lvl), L = $.lerp(bot + amp, top - amp * 2, lvl);
  s += M.part("outline", { at: tin, in: "fade" }, word("none", c.fg));
  if (lvl > 0) s += M.part("fill", { at: tin + 0.4, in: "none" }, "<g " + wave(L - f.size * 0.05, amp, 1.8, $.uid("lq")) + ">" + word(c.accent2) + "</g><g " + wave(L, amp, 0, $.uid("lq")) + ">" + word(c.accent) + "</g>");
  if (p.tagline) {
    const tf = Object.assign({}, $.font("text"), { size: Math.max(32 * k, f.size * 0.16) });
    s += M.text("tagline", Object.assign({ at: tin + 2, in: "rise", distance: 18 }, tf, { x: W / 2, y: bot + f.size * 0.18, anchor: "middle", fill: c.mute, maxW: A.w }), $.case(p.tagline));
  }
  return s;
}
