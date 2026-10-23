function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  // A 16:9 frame has room for a bigger card; a 9:16 one is seen on a phone.
  const k = $.k * (A.wide ? 1.2 : A.tall ? 1.3 : 1.1);
  const press = landOn($, p.button, Math.min(tin + 1.1, M.outAt - 0.8), tin);
  const name = $.case(p.channel);
  const nf = fitFont($, name, "display", 42 * k, 430 * k);
  const cw = Math.max(560 * k, 160 * k + $.measure(name, nf) + 60 * k), ch = 300 * k;
  const pos = p.position === "auto" ? (A.wide ? "bottom-right" : "center") : p.position;
  const x = pos === "center" ? (W - cw) / 2 : pos === "bottom-left" ? A.x : W - A.x - cw;
  const y = pos === "center" ? (A.tall ? H * 0.58 : (H - ch) / 2) : A.y + A.h - ch;

  let card = $.card(x, y, cw, ch, { shadow: "lg" });
  if (p.avatar) card += $.image("avatar", x + 38 * k, y + 40 * k, 80 * k, 80 * k, { r: 40 * k });
  else {
    card += $.circle(x + 78 * k, y + 80 * k, 40 * k, { fill: c.accent });
    card += $.icon("play", x + 60 * k, y + 62 * k, 36 * k, { color: $.on(c.accent), fill: true });
  }
  card += $.text(name, Object.assign({}, nf, { x: x + 140 * k, y: y + 46 * k }));
  if (p.detail) card += $.text(p.detail, Object.assign({}, $.font("mono"), { size: 24 * k, x: x + 140 * k, y: y + 98 * k, fill: c.mute }));
  const bx = x + 44 * k, by = y + 168 * k;
  card += $.button(t, $.case(p.button), bx, by, { size: 36 * k, icon: p.bell ? "bell" : undefined, pressAt: press, done: $.case(p.done) });
  if (p.bell) {
    const ring = $.bump(t, press + 0.15, 0.05, 0.6);
    const bellX = x + cw - 92 * k, bellY = y + 176 * k;
    card += $.g({ transform: $.tf({ r: Math.sin((t - press) * 40) * 18 * ring, ox: bellX + 28 * k, oy: bellY }) }, $.icon("bell", bellX, bellY, 56 * k, { color: ring > 0.05 ? c.accent : c.mute }));
  }
  let s = M.part("card", { at: tin, in: "rise", distance: 70, out: "rise", box: { x: x, y: y, w: cw, h: ch } }, card);
  // The cursor glides in from below and presses the button.
  if (p.cursor && t > press - 0.8 && t < press + 0.9) {
    const glide = $.E.inOut3($.seg(t, press - 0.75, press - 0.04));
    const px = $.lerp(x + cw + 180 * k, bx + 150 * k, glide), py = $.lerp(Math.min(H, y + ch + 220 * k), by + 52 * k, glide);
    s += M.part("cursor", { at: press - 0.8, in: "fade", dur: 0.2, outAt: press + 0.6, out: "fade", outDur: 0.3 }, $.cursor(px, py, { press: $.bump(t, press, 0.05, 0.2), scale: 2 * k }));
  }
  return s;
}
