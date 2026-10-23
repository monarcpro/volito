function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = "";
  s += M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const fit = fitLines($, $.case(p.name), Object.assign({}, $.font("display"), { ls: -0.045 }), A.w * 0.94, Math.min(A.h * 0.36, 300 * k), 80 * k, 2);
  const tf = Object.assign({}, $.font("text"), { size: Math.max(30 * k, Math.min(48 * k, fit.size * 0.2)) });
  const tl = p.tagline ? $.wrap(p.tagline, A.w * 0.8, tf).slice(0, 2) : [];
  const total = fit.lines.length * fit.size * 0.98 + (tl.length ? 34 * k + tl.length * tf.size * 1.3 : 0) + (p.when ? 90 * k : 0);
  let y = H / 2 - total / 2;
  const w = widest($, fit.lines, fit.font);
  fit.lines.forEach(function (l, i) { s += M.text("name", Object.assign({ at: tin + 0.35 + i * 0.12, in: "push", split: "letters", stagger: 0.03 }, fit.font, { x: W / 2, y: y + i * fit.size * 0.98, anchor: "middle", fill: c.fg }), l); });
  // The sticker sits on the name's top-right corner.
  const R = Math.max(56 * k, fit.size * 0.42), bx = Math.min(W - R - 20 * k, W / 2 + w / 2 + R * 0.2), by = Math.max(R + 20 * k, y - R * 0.1);
  const bt = $.case(p.badge), bf = fitFont($, bt, "display", R * 0.6, R * 1.5, { ls: 0.02 });
  s += M.part("badge", { at: tin, in: "spin", box: { x: bx - R, y: by - R, w: 2 * R, h: 2 * R } }, '<g transform="rotate(-14 ' + bx + " " + by + ')">' + $.circle(bx, by, R, { fill: c.accent2, stroke: boldSurface($) ? c.ink : undefined, sw: 4 * k, shadow: boldSurface($) ? "hard" : "md" }) + $.text(bt, Object.assign({}, bf, { x: bx, y: by - bf.size * 0.56, anchor: "middle", fill: $.on(c.accent2) })) + "</g>");
  y += fit.lines.length * fit.size * 0.98 + 34 * k;
  if (tl.length) s += M.text("tagline", Object.assign({ at: tin + 1.0, in: "rise", split: "lines", distance: 16 }, tf, { x: W / 2, y: y, anchor: "middle", fill: c.mute, lh: 1.3, maxW: A.w * 0.8 }), tl.join("\n"));
  y += tl.length * tf.size * 1.3 + 30 * k;
  if (p.when) {
    const wt = $.case(p.when), sz = $.chip.size(wt, { size: 30 * k, dot: true });
    s += M.part("when", { at: tin + 1.3, in: "pop", box: { x: W / 2 - sz.w / 2, y: y, w: sz.w, h: sz.h } }, $.chip(wt, W / 2, y, { size: 30 * k, dot: true, anchor: "middle", fill: c.accent, color: $.on(c.accent) }));
  }
  return s;
}
