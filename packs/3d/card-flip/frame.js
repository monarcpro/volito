function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H }, glow: [W / 2, H * 0.4] }));
  const cw = A.wide ? A.w * 0.58 : A.tall ? A.w * 0.92 : A.w * 0.78;
  const ch = A.wide ? cw * 0.56 : A.tall ? cw * 1.05 : cw * 0.8;
  const d = 18 * k;
  const cy = A.y + A.h * 0.5;
  const S = scene3d($, { camera: { fov: 30, pitch: -6, y: cy }, light: { spec: 0.3 } });
  // In: tilted back, settling on a spring. Flip: a half turn with a lift toward the camera.
  const e = $.spring(Math.max(0, t - tin), 2, 6.5);
  const fl = $.E.inOut3($.seg(t, p.flipAt, p.flipAt + 0.9));
  const card = { rotate: [42 * (1 - e) + 12 * Math.sin(Math.PI * fl), 180 * fl - 14 * (1 - e), 0], position: [0, 80 * k * (1 - e), -140 * k * Math.sin(Math.PI * fl)] };
  S.add(S.card(cw, ch, { depth: d, radius: 36 * k, color: c.surface, back: c.accent, side: $.mix(c.accent, c.bg, 0.35) }), card);
  const side = function (title, line, back) {
    const ink = back ? $.on(c.accent) : c.fg;
    const tface = $.font("display"), lface = $.font("text");
    const ts = fit3d(S, title, { face: tface }, cw * 0.8, ch * 0.32);
    const ls = Math.min(ts * 0.34, ch * 0.09);
    const lines = wrap3d(S, line, { face: lface, size: ls }, cw * 0.8, 2);
    const z = back ? d / 2 + 1.5 : -d / 2 - 1.5;
    const ry = back ? 180 : 0;
    const total = ts + (lines.length ? ts * 0.35 + lines.length * ls * 1.3 : 0);
    let y = -total / 2 + ts / 2;
    S.add(S.text(title, { face: tface, size: ts, depth: 0, color: ink }), { position: [0, y, z], rotate: [0, ry, 0], parent: card, flat: true, decal: true });
    y += ts / 2 + ts * 0.35 + ls / 2;
    lines.forEach(function (l, i) { S.add(S.text(l, { face: lface, size: ls, depth: 0, color: ink }), { position: [0, y + i * ls * 1.3, z], rotate: [0, ry, 0], parent: card, flat: true, decal: true }); });
  };
  side($.case(String(p.frontTitle || "")), String(p.frontText || ""), false);
  side($.case(String(p.backTitle || "")), String(p.backText || ""), true);
  s += M.part("card", { at: tin, in: "fade", dur: 0.25, out: "zoom", box: { x: W / 2 - cw / 2, y: cy - ch / 2, w: cw, h: ch } }, floorShadow($, S, [0, ch * 0.62, 0], cw * 0.5, 0.35) + S.render());
  return s;
}
