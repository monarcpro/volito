function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.wide ? 1.15 : A.tall ? 1.35 : 1.15);
  const tin = $.beat("in", 0.15);
  const pl = PLATFORM[p.platform] || PLATFORM.instagram;
  const cw = Math.min(A.w, 620 * k), pad = 40 * k, av = 62 * k;
  const nf = fitFont($, p.name, "display", 42 * k, cw - pad * 2 - av * 2 - 70 * k);
  const hf = { ...$.font("mono"), size: 24 * k };
  const bf = fitFont($, p.bio, "text", 28 * k, cw - pad * 2);
  const btn = { size: 30 * k };
  const bh = $.button.size($.case(p.action), btn).h;
  const ch = pad + av * 2 + 28 * k + 36 * k * 1.4 + (p.bio ? bf.size * 1.5 : 0) + 24 * k + bh + pad;
  const pos = p.position === "auto" ? (A.wide ? "bottom-right" : "center") : p.position;
  const x = pos === "center" ? (W - cw) / 2 : pos === "bottom-left" ? A.x : W - A.x - cw;
  const y = pos === "center" ? A.y + (A.h - ch) * (A.tall ? 0.62 : 0.5) : A.y + A.h - ch;
  const press = landOn($, p.action, Math.min(tin + 1.5, $.beat("out", $.dur - 0.45) - 0.9), tin);
  const leave = { out: "rise", distance: 40 };
  let s = M.part("card", Object.assign({ at: tin, in: "rise", distance: 70, box: { x: x, y: y, w: cw, h: ch } }, leave), $.card(x, y, cw, ch, { shadow: "lg" }));
  const ax = x + pad + av, ay = y + pad + av;
  s += M.part("avatar", Object.assign({ at: tin + 0.1, in: "pop", box: { x: ax - av, y: ay - av, w: av * 2, h: av * 2 } }, leave), avatar($, "photo", ax, ay, av, { name: p.name, fill: c.accent, ring: c.surface }));
  // The platform's icon sits on the picture's edge.
  s += M.part("avatar", Object.assign({ at: tin + 0.25, in: "pop", box: { x: ax + av * 0.4, y: ay + av * 0.4, w: av * 0.8, h: av * 0.8 } }, leave), $.circle(ax + av * 0.72, ay + av * 0.72, av * 0.34, { fill: c.surface }), $.icon(pl.icon, ax + av * 0.72 - av * 0.2, ay + av * 0.72 - av * 0.2, av * 0.4, { color: c.fg, sw: 2.2 }));
  const tx = ax + av + 26 * k;
  const nw = $.measure(p.name, nf);
  s += M.part("name", Object.assign({ at: tin + 0.2, in: "rise", distance: 16, box: { x: tx, y: ay - av * 0.75, w: cw - (tx - x) - pad, h: av * 1.4 } }, leave),
    $.text(p.name, { ...nf, x: tx, y: ay - nf.size * 0.95, fill: c.fg }),
    p.verified ? verified($, tx + nw + nf.size * 0.5, ay - nf.size * 0.42, nf.size * 0.36) : "",
    $.text(String(p.handle || ""), { ...hf, x: tx, y: ay + 8 * k, fill: c.mute }));
  let yy = y + pad + av * 2 + 28 * k;
  // The count on its own row: a big number and what it counts.
  const count = $.counter(t, tin + 0.4, tin + 1.6, p.followers, { short: true });
  const cf = { ...$.font("display"), size: 36 * k };
  s += M.part("stats", Object.assign({ at: tin + 0.35, in: "fade", dur: 0.3, box: { x: x + pad, y: yy, w: cw - pad * 2, h: cf.size * 1.2 } }, leave),
    $.text(count, { ...cf, x: x + pad, y: yy, fill: c.fg }),
    $.text(pl.count, { ...$.font("text"), size: 26 * k, x: x + pad + $.measure($.count(p.followers), cf) + 14 * k, y: yy + cf.size * 0.22, fill: c.mute }));
  yy += cf.size * 1.4;
  if (p.bio) {
    s += M.text("bio", Object.assign({ at: tin + 0.45, in: "fade", dur: 0.35 }, leave, bf, { x: x + pad, y: yy, fill: c.fg }), String(p.bio));
    yy += bf.size * 1.5;
  }
  yy += 24 * k;
  s += M.part("button", Object.assign({ at: tin + 0.55, in: "rise", distance: 14, box: { x: x + pad, y: yy, w: cw - pad * 2, h: bh } }, leave),
    $.button(t, $.case(p.action), x + cw / 2, yy, { size: 30 * k, anchor: "middle", pressAt: press, done: $.case(p.done) }));
  if (t > press - 0.8 && t < press + 0.9) {
    const g = $.E.inOut3($.seg(t, press - 0.75, press - 0.04));
    const px = $.lerp(x + cw + 160 * k, x + cw * 0.55, g), py = $.lerp(Math.min(H, y + ch + 200 * k), yy + bh * 0.6, g);
    s += M.part("cursor", { at: press - 0.8, in: "fade", dur: 0.2, outAt: press + 0.6, out: "fade", outDur: 0.3 }, $.cursor(px, py, { press: $.bump(t, press, 0.05, 0.2), scale: 2 * k }));
  }
  return s;
}
