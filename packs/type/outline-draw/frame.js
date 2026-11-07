// A word traced on as an outline, every letter's contour drawing at once, then filled in a wipe from the left,
// with an optional line under it rising after.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  let s = ground(M, $, t);
  const word = $.case(String(p.text || ""));
  const f = fitFont($, word, "display", (A.tall ? 300 : 280) * k, A.w * 0.92, { ls: -0.02 });
  const sub = String(p.subtitle || "");
  const sf = Object.assign({}, $.font("text"), { size: (A.tall ? 46 : 40) * k, weight: 500 });
  const blockH = f.size + (sub ? sf.size * 2 : 0);
  const y = A.y + (A.h - blockH) / 2;
  const tw = $.measure(word, f), x = W / 2 - tw / 2;
  // The trace: a dash as long as a big letter's contour, sliding off as it draws.
  const L = f.size * 4;
  const d = $.E.inOut2($.seg(t, tin, tin + 1.4));
  const line = $.text(word, Object.assign({}, f, { x: W / 2, y: y, anchor: "middle", fill: "none", stroke: c.accent, sw: Math.max(2, f.size * 0.018), extra: 'stroke-dasharray="' + $.fx(L) + " " + $.fx(L) + '" stroke-dashoffset="' + $.fx(L * (1 - d)) + '"' }));
  // The fill wipes in from the left once the trace is nearly done.
  const w = $.E.inOut3($.seg(t, tin + 1.1, tin + 1.8));
  const clip = $.uid();
  $.def('<clipPath id="' + clip + '"><rect x="' + (x - f.size * 0.2) + '" y="' + (y - f.size * 0.3) + '" width="' + ((tw + f.size * 0.4) * w) + '" height="' + f.size * 1.6 + '"/></clipPath>');
  const fill = '<g clip-path="url(#' + clip + ')">' + $.text(word, Object.assign({}, f, { x: W / 2, y: y, anchor: "middle", fill: p.fill === "fg" ? c.fg : c.accent })) + "</g>";
  s += M.part("word", { at: tin, in: "none", out: "fade", box: { x: x, y: y, w: tw, h: f.size } }, line + fill);
  if (sub) s += M.text("subtitle", Object.assign({ at: tin + 1.7, in: "rise", distance: 20 }, sf, { x: W / 2, y: y + f.size * 1.08, anchor: "middle", fill: c.mute, maxW: A.w }), sub);
  return s;
}
