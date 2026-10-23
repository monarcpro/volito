function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H }, glow: [W / 2, H * 0.45] }));
  const dec = Math.max(0, Math.min(3, Math.round(p.decimals)));
  const fmt = function (v) { const s2 = v.toFixed(dec); const parts = s2.split("."); return (p.prefix || "") + parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (parts[1] ? "." + parts[1] : "") + (p.suffix || ""); };
  const face = $.font("display");
  const cy = A.y + A.h * 0.42;
  const land = tin + 1.4;
  const sweep = $.seg(t, land, land + 0.9);
  const S = scene3d($, { camera: { fov: 30, yaw: -16 + 10 * $.E.out3($.seg(t, tin, $.dur)), pitch: -10, y: cy }, light: { dir: [-1.2 + 2.4 * sweep, 0.4, 0.85], spec: 0.2 + 0.6 * Math.sin(Math.PI * sweep), shine: 14 } });
  const final = fmt(p.value);
  const size = fit3d(S, final, { face: face }, A.w * 0.8, Math.min(A.h * 0.36, 380 * k));
  const v = p.value * $.E.out3($.seg(t, tin + 0.2, land));
  const e = $.spring(Math.max(0, t - tin), 2, 7);
  S.add(S.text(fmt(v), { face: face, size: size, depth: size * 0.28, color: c.accent, side: $.mix(c.accent, c.bg, 0.45) }), { rotate: [14 * (1 - e) + 8, 0, 0], scale: 0.8 + 0.2 * e });
  s += M.part("number", { at: tin, in: "fade", dur: 0.2, out: "zoom", box: { x: A.x, y: cy - size, w: A.w, h: size * 2 } }, floorShadow($, S, [0, size * 0.6, 0], S.measure(final, { face: face, size: size }) * 0.5, 0.35) + S.render());
  if (p.label) {
    const lf = fitFont($, $.case(String(p.label)), "text", 50 * k, A.w * 0.86);
    s += M.text("label", { at: land - 0.2, in: "rise", distance: 20, out: "fade", ...lf, x: W / 2, y: cy + size * 0.78, anchor: "middle", fill: c.fg }, $.case(String(p.label)));
  }
  return s;
}
