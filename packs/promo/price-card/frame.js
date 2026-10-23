function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = "";
  const cw = Math.min(A.w * (A.wide ? 0.42 : 0.9), 760 * k), pad = 44 * k;
  const nf = Object.assign({}, $.font("display"), { size: 58 * k, ls: -0.02 });
  const nameLines = $.wrap($.case(p.name), cw - pad * 2, nf).slice(0, 2);
  const pf = Object.assign({}, $.font("display"), { size: 120 * k, ls: -0.03 }), of = Object.assign({}, $.font("text"), { size: 44 * k });
  const ch = pad * 2 + 40 * k + 20 * k + nameLines.length * nf.size * 1.08 + 24 * k + pf.size * 1.05 + 30 * k + 96 * k;
  const cx = p.position === "left" ? A.x : p.position === "right" ? A.x + A.w - cw : W / 2 - cw / 2, cy = H / 2 - ch / 2;
  let y = cy + pad;
  let card = $.card(cx, cy, cw, ch, { t: t });
  card += $.chip($.case(p.kicker), cx + pad, y, { size: 26 * k, fill: c.accent2, color: $.on(c.accent2) });
  y += 60 * k;
  nameLines.forEach(function (l, i) { card += $.text(l, Object.assign({}, nf, { x: cx + pad, y: y + i * nf.size * 1.08, fill: c.fg })); });
  y += nameLines.length * nf.size * 1.08 + 24 * k;
  s += M.part("card", { at: tin, in: "rise", distance: 40, box: { x: cx, y: cy, w: cw, h: ch } }, card);
  // The price counts down from the old one to the new.
  const tc = tin + 0.7, q = $.E.out3($.seg(t, tc, tc + 0.9));
  const nowV = $.lerp(p.was, p.now, q), nowS = money(p.currency, p.decimals > 0 ? nowV : Math.round(nowV), p.decimals);
  const wasS = money(p.currency, p.was, p.decimals), ww = $.measure(wasS, of);
  let price = $.text(nowS, Object.assign({}, pf, { x: cx + pad, y: y, fill: c.fg }));
  const px = cx + pad + $.measure(money(p.currency, p.now, p.decimals), pf) + 26 * k, py = y + pf.size * 0.5 - of.size * 0.5;
  price += $.text(wasS, Object.assign({}, of, { x: px, y: py, fill: c.mute }));
  price += $.strike(t, tc, px - 4 * k, py + of.size * 0.55, px + ww + 4 * k, py + of.size * 0.5, { color: c.red, w: 6 * k });
  s += M.part("price", { at: tin + 0.3, in: "fade" }, price);
  const save = p.was > 0 ? Math.round((1 - p.now / p.was) * 100) : 0;
  if (save > 0) {
    // The saving sits in the card's top-right corner, clear of both prices.
    const st = "-" + save + "%", sz = $.chip.size(st, { size: 34 * k }), sx = cx + cw - pad - sz.w, sy = cy + pad - 4 * k;
    s += M.part("save", { at: tc + 0.9, in: "pop", box: { x: sx, y: sy, w: sz.w, h: sz.h } }, $.chip(st, sx, sy, { size: 34 * k, fill: c.accent, color: $.on(c.accent) }));
  }
  y += pf.size * 1.05 + 30 * k;
  const press = tc + 1.9;
  let btn = $.button(t, $.case(p.cta), cx + pad, y, { size: 38 * k, fill: c.accent, icon: "cart", pressAt: press, done: $.case(p.added || "Added"), anchor: "start" });
  const bx = cx + pad + 160 * k, by = y + 40 * k;
  const glide = $.E.inOut3($.seg(t, press - 0.8, press - 0.05));
  btn += $.cursor($.lerp(W * 0.9, bx, glide), $.lerp(H * 1.05, by, glide), { press: $.bump(t, press, 0.05, 0.2), ripple: $.seg(t, press, press + 0.5) });
  s += M.part("button", { at: tin + 0.5, in: "rise", distance: 20, box: { x: cx + pad, y: y, w: cw - 2 * pad, h: 96 * k } }, btn);
  return s;
}
