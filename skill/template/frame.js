// A MONARC Motion item: frame(t, $) returns the SVG of one frame — a pure function of t.
// Props arrive as $.data; sizes scale by $.k so one design fits 16:9, 9:16, 1:1 and 4:5.
// Each element is a named part of the motion kit, so a creator can give it any move:
//   monarc-motion sheet ./my-graphic --motion title.in=typewriter --mood playful --seed 7
// Run: monarc-motion api (the $ runtime) · monarc-motion moves (every move) · monarc-motion guide
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  const title = $.case(p.title);
  const font = { ...$.font("display"), size: 120 * k, ls: -0.03 };
  // Shrink the title until it fits 86% of the width.
  const w = $.measure(title, font);
  if (w > W * 0.86) font.size *= (W * 0.86) / w;
  const tw = $.measure(title, font);
  const pad = 56 * k;
  const cw = tw + pad * 2, ch = pad * 1.4 + 64 * k + font.size * 1.12;
  const x = (W - cw) / 2, y = H * (H > W ? 0.55 : 0.6);
  const ty = y + pad * 0.5 + 64 * k;
  let s = M.part("card", { at: tin, in: "pop", box: { x: x, y: y, w: cw, h: ch } }, $.card(x, y, cw, ch, { shadow: "lg" }));
  s += M.part("kicker", { at: tin + 0.15, in: "rise", distance: 20, box: { x: x + pad, y: y + pad * 0.5, w: 200 * k, h: 50 * k } }, $.chip($.case(p.kicker), x + pad, y + pad * 0.5, { size: 28 * k, dot: true }));
  s += M.text("title", { ...font, x: x + pad, y: ty, at: tin + 0.25, in: "rise", split: "words", distance: 30 }, title);
  s += M.part("underline", { at: tin + 0.6, in: "wipe", from: "left", box: { x: x + pad - 10 * k, y: ty + font.size * 1.02 - 14 * k, w: tw + 20 * k, h: 28 * k } },
    $.underline(1, 0, x + pad, ty + font.size * 1.02, tw, { sw: 10 * k, dur: 0.01 }));
  return s;
}
