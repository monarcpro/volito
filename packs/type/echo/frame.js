function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.2);
  let s = ground(M, $, t);
  const str = $.case(p.word), n = Math.max(1, Math.round(p.copies));
  const f = fitFont($, str, "display", Math.min(A.h / (2 * n + 1) * 1.45, 260 * k), A.w * 0.92, { ls: -0.03 });
  const step = f.size * 0.74, cy = H / 2 - f.size * 0.56;
  let ech = "";
  for (let j = n; j >= 1; j--) {
    const open = $.E.outBack($.clamp((t - tin - 0.25 - j * 0.07) / 0.6));
    for (const sgn of [-1, 1]) {
      const wob = Math.sin((t - tin) * 2.2 - j * 0.55) * 16 * k * j / n;
      ech += $.text(str, Object.assign({}, f, { x: W / 2 + wob * sgn, y: cy + sgn * j * step * open, anchor: "middle", fill: "none", stroke: j % 2 ? c.accent : c.accent2, sw: 2.6 * k, op: Math.max(0.15, 1 - j * 0.16) }));
    }
  }
  s += M.part("echoes", { at: tin + 0.2, in: "fade", dur: 0.3 }, ech);
  s += M.text("word", Object.assign({ at: tin, in: "pop" }, f, { x: W / 2, y: cy, anchor: "middle", fill: c.fg }), str);
  return s;
}
