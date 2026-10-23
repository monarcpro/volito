function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H }, glow: [W * 0.3, H * 0.3] }));
  const face = $.font("display");
  const title = $.case(String(p.title || ""));
  const cy = A.y + A.h * 0.45;
  const fov = 32, f = focalFor($, fov);
  const S = scene3d($, { camera: { fov: fov, distance: f * (1.18 - 0.18 * $.E.out3($.seg(t, tin, $.dur))), pitch: -8, y: cy }, light: { spec: 0.35 } });
  // One line when it holds at a good size, else two.
  let lines = [title];
  let size = fit3d(S, title, { face: face }, A.w * 0.86, Math.min(A.h * 0.24, 260 * k));
  if (size < Math.min(A.h * 0.24, 260 * k) * 0.62) {
    lines = wrap3d(S, title, { face: face, size: 100 }, (A.w * 0.86 * 100) / (Math.min(A.h * 0.2, 220 * k)), 2);
    size = Math.min.apply(null, lines.map(function (l) { return fit3d(S, l, { face: face }, A.w * 0.86, Math.min(A.h * 0.2, 220 * k)); }));
  }
  let n0 = 0;
  lines.forEach(function (line, li) {
    const base = n0;
    const mesh = S.text(line, { face: face, size: size, depth: size * p.depth, color: c.fg, side: c.accent, each: function (i) {
      const at = tin + 0.25 + (base + i) * 0.055;
      if (t < at) return { hide: true };
      const e = $.spring(t - at, 2.4, 6.8);
      return { rotate: [-100 * (1 - e), 0, 0], offset: [0, size * 0.25 * (1 - Math.min(1, e)), 0] };
    } });
    S.add(mesh, { position: [0, (li - (lines.length - 1) / 2) * size * 1.12, 0] });
    n0 += Array.from(line).length;
  });
  s += M.part("title", { at: tin, in: "fade", dur: 0.2, out: "blur", box: { x: A.x, y: cy - size * lines.length, w: A.w, h: size * lines.length * 2 } }, S.render());
  if (p.subtitle) {
    const sf = fitFont($, $.case(String(p.subtitle)), "text", 46 * k, A.w * 0.8);
    s += M.text("subtitle", { at: tin + 0.4 + n0 * 0.055, in: "rise", distance: 20, out: "fade", ...sf, x: W / 2, y: cy + size * (lines.length * 0.56 + 0.35), anchor: "middle", fill: c.mute }, $.case(String(p.subtitle)));
  }
  return s;
}
