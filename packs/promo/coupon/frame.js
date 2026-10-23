function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = "";
  const tw = Math.min(A.w * 0.94, 1200 * k), th = Math.min(A.h * 0.42, tw * 0.36), x = W / 2 - tw / 2, y = H / 2 - th / 2;
  const stub = tw * 0.42, n = 22 * k, r = Math.min(24 * k, th * 0.08);
  // The ticket: rounded corners, a half-round notch top and bottom at the tear line.
  const sx = x + stub;
  const d = "M" + (x + r) + " " + y + "H" + (sx - n) + "A" + n + " " + n + " 0 0 0 " + (sx + n) + " " + y + "H" + (x + tw - r) + "Q" + (x + tw) + " " + y + " " + (x + tw) + " " + (y + r) + "V" + (y + th - r) + "Q" + (x + tw) + " " + (y + th) + " " + (x + tw - r) + " " + (y + th) + "H" + (sx + n) + "A" + n + " " + n + " 0 0 0 " + (sx - n) + " " + (y + th) + "H" + (x + r) + "Q" + x + " " + (y + th) + " " + x + " " + (y + th - r) + "V" + (y + r) + "Q" + x + " " + y + " " + (x + r) + " " + y + "Z";
  let tk = shapeFill($, d, c.surface) + $.clip(x, y, stub, th, 0, $.path(d, { fill: c.accent }));
  tk += $.line(sx, y + n + 8 * k, sx, y + th - n - 8 * k, { stroke: $.rgba(c.fg, 0.35), sw: 3 * k, dash: 10 * k + " " + 10 * k, cap: "butt" });
  const deal = $.case(p.deal), df = fitFont($, deal, "display", th * 0.36, stub * 0.84, { ls: -0.03 });
  const nf = fitFont($, p.note, "text", Math.max(26 * k, th * 0.1), stub * 0.84, {});
  tk += $.text(deal, Object.assign({}, df, { x: x + stub / 2, y: y + th / 2 - df.size * 0.72, anchor: "middle", fill: $.on(c.accent) }));
  if (p.note) tk += $.text(p.note, Object.assign({}, nf, { x: x + stub / 2, y: y + th / 2 + df.size * 0.38, anchor: "middle", fill: $.rgba($.on(c.accent), 0.8) }));
  s += M.part("ticket", { at: tin, in: "stretch", box: { x: x, y: y, w: tw, h: th } }, tk);
  // The code in a dashed box on the right.
  const code = String(p.code || "").toUpperCase(), cf = fitFont($, code, "mono", th * 0.22, (tw - stub) * 0.7, { ls: 0.08 });
  const lf = Object.assign({}, $.font("text"), { size: Math.max(24 * k, th * 0.085) });
  const rx = sx + (tw - stub) / 2, bw = $.measure(code, cf) + 70 * k, bh = cf.size * 1.7, by = y + th / 2 - bh / 2 + lf.size * 0.6;
  const copyAt = tin + 1.5;
  const lit = t >= copyAt;
  let cd = $.text("Use code", Object.assign({}, lf, { x: rx, y: by - lf.size * 1.6, anchor: "middle", fill: c.mute }));
  cd += $.rect(rx - bw / 2, by, bw, bh, { r: 12 * k, fill: lit ? $.rgba(c.accent, 0.14) : "none", stroke: c.accent, sw: 4 * k, dash: 14 * k + " " + 9 * k });
  cd += $.text(code, Object.assign({}, cf, { x: rx, y: by + (bh - cf.size) / 2 - cf.size * 0.06, anchor: "middle", fill: c.fg }));
  const glide = $.E.inOut3($.seg(t, copyAt - 0.7, copyAt - 0.05));
  cd += $.cursor($.lerp(x + tw + 60 * k, rx + bw * 0.2, glide), $.lerp(y + th + 80 * k, by + bh * 0.6, glide), { press: $.bump(t, copyAt, 0.05, 0.2), ripple: $.seg(t, copyAt, copyAt + 0.5) });
  s += M.part("code", { at: tin + 0.4, in: "fade" }, cd);
  if (p.copied) {
    const ct = $.case(p.copied), co = { size: 28 * k, fill: c.green, color: $.on(c.green), anchor: "middle", icon: "check" }, cz = $.chip.size(ct, co);
    s += M.part("copied", { at: copyAt + 0.1, in: "pop", box: { x: rx - cz.w / 2, y: by + bh + 18 * k, w: cz.w, h: cz.h } }, $.chip(ct, rx, by + bh + 18 * k, co));
  }
  return s;
}
