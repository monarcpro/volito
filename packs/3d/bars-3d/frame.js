function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const title = $.case(String(p.title || ""));
  let top = A.y;
  if (title) {
    const tf = fitLines($, title, { ...$.font("display"), ls: -0.02 }, A.w, Math.min(84 * k, A.h * 0.09), 40 * k, 2);
    tf.lines.forEach(function (l, i) { s += M.text("title", { at: tin + i * 0.1, in: "rise", distance: 20, out: "fade", ...tf.font, x: A.x, y: A.y + i * tf.size * 1.05, fill: c.fg }, l); });
    top = A.y + tf.lines.length * tf.size * 1.05 + 30 * k;
  }
  const rows = p.rows || [];
  const n = rows.length;
  const maxV = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1e-9]));
  const span = A.w * (A.wide ? 0.78 : 0.9);
  const gap = span / n, bw = gap * 0.56;
  const maxH = (A.y + A.h - top) * 0.62;
  const cy = top + (A.y + A.h - top) * 0.52;
  const floorY = maxH / 2;
  const S = scene3d($, { camera: { fov: 32, yaw: -26 + 14 * $.E.inOut2($.seg(t, tin, $.dur)), pitch: -20, y: cy }, light: { spec: 0.22 } });
  // The floor: a thin slab under the bars.
  S.add(S.box(span + gap * 0.4, 6 * k, gap * 1.4, { color: $.mix(c.bg, c.fg, 0.1) }), { position: [0, floorY + 3 * k, 0], rotate: [0, 0, 0] });
  let lab = "";
  rows.forEach(function (r, i) {
    const at = tin + 0.4 + i * 0.16;
    const e = $.spring(Math.max(0, t - at), 2.2, 7.5);
    const h = Math.max(2 * k, maxH * (r.value / maxV) * e);
    const x = -span / 2 + gap * (i + 0.5);
    const lead = r.value === maxV;
    S.add(S.box(bw, h, bw, { color: lead ? c.accent : $.mix(c.fg, c.bg, 0.45) }), { position: [x, floorY - h / 2, 0] });
    S.at([x, floorY + 18 * k, -bw / 2], function (px, py, sc) { return $.text(String(r.label), { ...$.font("text"), size: 30 * k, x: px, y: py, anchor: "middle", fill: c.mute }); });
    if (t > at) S.at([x, floorY - h - 14 * k, 0], function (px, py, sc) { return $.text(Math.round(r.value * Math.min(1, e)) + (p.suffix || ""), { ...$.font("display"), size: 36 * k, x: px, y: py - 40 * k, anchor: "middle", fill: lead ? c.accent : c.fg }); }, { onTop: true });
  });
  s += M.part("bars", { at: tin + 0.2, in: "fade", dur: 0.3, out: "fade", box: { x: A.x, y: top, w: A.w, h: A.y + A.h - top } }, S.render());
  return s + lab;
}
