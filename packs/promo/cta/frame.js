function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = "";
  const size = Math.min(64 * k, A.w / 14);
  const by = p.position === "bottom" ? A.y + A.h - size * 2.4 : H / 2 + (p.line ? size * 0.4 : -size);
  if (p.line) {
    const lf = fitFont($, $.case(p.line), "display", size * 1.5, A.w * 0.9, { ls: -0.03 });
    s += M.text("line", Object.assign({ at: tin, in: "rise", split: "words" }, lf, { x: W / 2, y: by - lf.size * 1.6, anchor: "middle", fill: c.fg }), $.case(p.line));
  }
  const press = tin + 1.5;
  s += M.part("button", { at: tin + 0.3, in: "pop", box: { x: W / 2 - size * 4, y: by, w: size * 8, h: size * 2 } }, $.button(t, $.case(p.button), W / 2, by, { size: size, fill: c.accent, icon: p.icon || "arrowRight", pressAt: press, done: $.case(p.done || p.button), anchor: "middle" }));
  const glide = $.E.inOut3($.seg(t, press - 0.75, press - 0.05)), bx = W / 2 + size * 1.2, byy = by + size * 1.1;
  s += M.part("cursor", { at: press - 0.8, in: "fade", dur: 0.2 }, $.cursor($.lerp(W * 0.86, bx, glide), $.lerp(H * 0.98, byy, glide), { press: $.bump(t, press, 0.05, 0.2), ripple: $.seg(t, press, press + 0.5), scale: 2.6 * k }));
  return s;
}
