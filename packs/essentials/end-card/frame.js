function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const title = $.case(p.title);
  const hf = fitFont($, title, "display", Math.min(110 * k, A.h * 0.1), A.w, { ls: -0.03 });
  const slotF = Object.assign({}, $.font("text"), { size: 32 * k });
  // Two 16:9 slots side by side on wide frames, stacked on tall ones.
  const stack = !A.wide;
  const sw = stack ? Math.min(A.w, (A.h * (A.tall ? 0.62 : 0.72)) / 2 * (16 / 9) - 40 * k) : (A.w - 60 * k) / 2;
  const sh = (sw * 9) / 16;
  const labelH = slotF.size * 2.6;
  const headH = hf.size * 1.3;
  const footH = 130 * k;
  const gridH = stack ? 2 * (sh + labelH) + 30 * k : sh + labelH;
  const top = A.y + (A.h - headH - gridH - footH) / 2;
  const left = stack ? (W - sw) / 2 : A.x;

  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  s += M.text("title", Object.assign({ at: tin, in: "rise", distance: 26 }, hf, { x: W / 2, y: top, anchor: "middle" }), title);
  [[p.first, p.firstImage ? "firstImage" : ""], [p.second, p.secondImage ? "secondImage" : ""]].forEach(function (slot, i) {
    const sx = stack ? left : left + i * (sw + 60 * k);
    const sy = top + headH + (stack ? i * (sh + labelH + 30 * k) : 0);
    const ccx = sx + sw / 2, ccy = sy + sh / 2;
    let el = $.rect(sx, sy, sw, sh, { r: $.style.radius * 0.6, fill: $.rgba(c.fg, 0.06), stroke: $.rgba(c.fg, 0.22), sw: 3 * k, dash: slot[1] ? null : 14 * k + " " + 10 * k });
    if (slot[1]) el += $.image(slot[1], sx, sy, sw, sh, { r: $.style.radius * 0.6 });
    else {
      const pr = Math.min(sw, sh) * 0.14 * (1 + 0.06 * $.wave(t, 1.6, i * 0.3));
      el += $.circle(ccx, ccy, pr, { fill: c.accent, shadow: "md" }) + $.icon("play", ccx - pr * 0.42, ccy - pr * 0.5, pr, { color: $.on(c.accent), fill: true });
    }
    $.wrap($.case(slot[0] || ""), sw, slotF).slice(0, 2).forEach(function (line, j) { el += $.text(line, Object.assign({}, slotF, { x: sx, y: sy + sh + 18 * k + j * slotF.size * 1.2 })); });
    s += M.part("slots", { at: tin + 0.25 + i * 0.15, in: "rise", distance: 40, box: { x: sx, y: sy, w: sw, h: sh + labelH } }, el);
  });
  // The footer: the button presses, the handle beside it.
  const fy = top + headH + gridH + 40 * k;
  const press = tin + 1.3;
  const b1 = $.button.size($.case(p.button), { size: 34 * k, icon: "bell" }), b2 = $.button.size($.case(p.done), { size: 34 * k, icon: "check" });
  const btn = { w: Math.max(b1.w, b2.w), h: b1.h };
  const hfnt = Object.assign({}, $.font("mono"), { size: 30 * k });
  const hw = p.handle ? $.measure(p.handle, hfnt) + 36 * k : 0;
  const fx = W / 2 - (btn.w + hw) / 2;
  s += M.part("footer", { at: tin + 0.6, in: "rise", distance: 24, box: { x: fx, y: fy, w: btn.w + hw, h: btn.h } },
    $.button(t, $.case(p.button), fx, fy, { size: 34 * k, icon: "bell", pressAt: press, done: $.case(p.done) }),
    p.handle ? $.text(p.handle, Object.assign({}, hfnt, { x: fx + btn.w + 36 * k, y: fy + btn.h / 2 - hfnt.size * 0.55, fill: c.mute })) : "");
  return s;
}
