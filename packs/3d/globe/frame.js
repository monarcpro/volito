function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H }, glow: [W / 2, H / 2] }));
  let top = A.y;
  if (p.title) {
    const tf = fitFont($, $.case(String(p.title)), "display", 72 * k, A.w);
    s += M.text("title", { at: tin, in: "rise", distance: 20, out: "fade", ...tf, x: W / 2, y: A.y, anchor: "middle", fill: c.fg }, $.case(String(p.title)));
    top = A.y + tf.size * 1.4;
  }
  const target = worldFind(p.target) || worldFind("India");
  const R = Math.min(A.w, A.y + A.h - top) * 0.4;
  const cy = top + (A.y + A.h - top) / 2;
  const S = scene3d($, { camera: { fov: 28, y: cy }, light: { dir: [0.45, 0.35, 0.82], spec: 0.15 } });
  // Spin from well behind to the country, easing in; tilt toward its latitude.
  const arrive = tin + 2.2;
  const g = $.E.inOut3($.seg(t, tin, arrive));
  const spin = -target.c[0] - 150 * (1 - g) - 6 * $.seg(t, arrive, $.dur);
  const tilt = Math.max(-35, Math.min(35, target.c[1])) * g + 12 * (1 - g);
  S.add(S.sphere(R, { color: $.mix(c.bg, c.accent, 0.1) }), { position: [0, 0, 0] });
  const lit = $.seg(t, arrive - 0.3, arrive + 0.3);
  worldGlobe(S, { r: R, spin: spin, tilt: tilt, colorOf: function (cn) { return cn === target ? $.mix($.mix(c.fg, c.bg, 0.55), c.accent, lit) : $.mix(c.fg, c.bg, 0.55); } });
  // Routes: great circles from each country to the target, lifted off the surface as they travel.
  const tp = target.c;
  (p.from || []).forEach(function (name, i) {
    const src = worldFind(name);
    if (!src || src === target) return;
    const at = arrive + 0.1 + i * 0.25;
    const run = $.E.inOut2($.seg(t, at, at + 1));
    if (run <= 0) return;
    const v = function (q) { const l = q[0] * Math.PI / 180, f = q[1] * Math.PI / 180; return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)]; };
    const va = v(src.c), vb = v(tp);
    const om = Math.acos(Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))) || 1e-6;
    const pts = [];
    const steps = 40;
    for (let j = 0; j <= Math.round(steps * run); j++) {
      const f = j / steps, s1 = Math.sin((1 - f) * om) / Math.sin(om), s2 = Math.sin(f * om) / Math.sin(om);
      const x = s1 * va[0] + s2 * vb[0], y = s1 * va[1] + s2 * vb[1], z = s1 * va[2] + s2 * vb[2];
      const lon = Math.atan2(y, x) * 180 / Math.PI, lat = Math.asin(Math.max(-1, Math.min(1, z))) * 180 / Math.PI;
      pts.push(worldOnSphere(lon, lat, R * (1.01 + 0.05 * Math.sin(Math.PI * f) * Math.min(1, om)), spin, tilt));
    }
    // Only the stretch on the near side of the globe: a route round the back would cross the picture.
    const near = pts.filter(function (q) { return q[2] < -R * 0.08; });
    if (near.length > 1) S.line(near, { stroke: $.style.mode === "light" ? c.accent : c.accent2, width: 4 * k, opacity: 0.9 });
  });
  s += M.part("globe", { at: tin, in: "zoom", dur: 0.8, out: "fade", box: { x: W / 2 - R, y: cy - R, w: 2 * R, h: 2 * R } }, S.render());
  // The pin: where the country's label point sits on the turned globe.
  if (t > arrive) {
    const q = S.project(worldOnSphere(tp[0], tp[1], R * 1.01, spin, tilt));
    if (q) {
      const lf = fitFont($, $.case(String(p.label || target.name)), "display", 40 * k, A.w * 0.6);
      const lw = $.measure($.case(String(p.label || target.name)), lf) + 40 * k, lh = lf.size * 1.6;
      const right = q.x < W / 2 + R * 0.4;
      const bx = right ? q.x + 30 * k : q.x - 30 * k - lw;
      s += M.part("pin", { at: arrive, in: "pop", out: "fade", box: { x: Math.min(bx, q.x) - 20 * k, y: q.y - lh - 30 * k, w: lw + 60 * k, h: lh + 50 * k } },
        $.line(q.x, q.y, right ? bx : bx + lw, q.y - lh / 2 - 20 * k, { stroke: c.fg, sw: 3 * k }),
        $.circle(q.x, q.y, 10 * k, { fill: c.accent, stroke: c.fg, sw: 3 * k }),
        $.rect(bx, q.y - lh - 20 * k, lw, lh, { r: lh / 2, fill: c.surface, shadow: "md" }),
        $.text($.case(String(p.label || target.name)), { ...lf, x: bx + lw / 2, y: q.y - lh - 20 * k + (lh - lf.size) / 2 - lf.size * 0.04, anchor: "middle", fill: c.fg }));
    }
  }
  return s;
}
