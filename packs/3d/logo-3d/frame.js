function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H }, glow: [W / 2, H / 2] }));
  const word = $.case(String(p.wordmark || ""));
  const face = $.font("display");
  const cy = A.y + A.h * 0.46;
  const e = $.spring(Math.max(0, t - tin), 2.1, 6.2);
  // The light sweeps right across the letters as they settle.
  const sweep = $.seg(t, tin + 0.45, tin + 1.5);
  const lx = -1.4 + 2.8 * $.E.inOut2(sweep);
  const S = scene3d($, { camera: { fov: 30, yaw: -7 + 14 * $.seg(t, tin, $.dur), pitch: -5, y: cy }, light: { dir: [lx, 0.4, 0.85], spec: 0.2 + 0.7 * Math.sin(Math.PI * sweep), shine: 14 } });
  const size = fit3d(S, word, { face: face }, A.w * 0.82, Math.min(A.h * 0.3, 300 * k));
  const mesh = S.text(word, { face: face, size: size, depth: size * p.depth, color: c.fg, side: c.accent });
  S.add(mesh, { rotate: [10 * (1 - e), -78 * (1 - e), 0], scale: 0.88 + 0.12 * e });
  const shadow = floorShadow($, S, [0, size * 0.62, 0], mesh.w * 0.55, 0.4 * Math.min(1, e));
  s += M.part("wordmark", { at: tin, in: "fade", dur: 0.2, out: "zoom", box: { x: W / 2 - mesh.w / 2, y: cy - size, w: mesh.w, h: size * 2 } }, shadow + S.render());
  if (p.tagline) {
    const tf = fitFont($, String(p.tagline).toUpperCase(), "mono", 34 * k, A.w * 0.8, { ls: 0.24 });
    s += M.text("tagline", { at: tin + 1.1, in: "rise", distance: 18, out: "fade", ...tf, x: W / 2, y: cy + size * 0.75, anchor: "middle", fill: c.mute }, String(p.tagline).toUpperCase());
  }
  return s;
}
