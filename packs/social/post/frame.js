function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.3 : 1.1);
  const tin = $.beat("in", 0.15);
  const cw = Math.min(A.w, A.wide ? 900 * k : A.w), pad = 40 * k, av = 40 * k;
  const nf = fitFont($, p.name, "display", 32 * k, cw * 0.5);
  const mf = { ...$.font("text"), size: 26 * k };
  const tf = { ...$.font("text"), size: 36 * k, lh: 1.32 };
  const lines = $.wrap(String(p.text || ""), cw - pad * 2, tf).slice(0, 7);
  const ch = pad + av * 2 + 24 * k + lines.length * tf.size * 1.32 + 30 * k + 40 * k + pad;
  const x = (W - cw) / 2, y = A.y + (A.h - ch) * (A.tall ? 0.48 : 0.5);
  const leave = { out: "rise", distance: 40 };
  let s = M.part("card", Object.assign({ at: tin, in: "rise", distance: 60, box: { x: x, y: y, w: cw, h: ch } }, leave), $.card(x, y, cw, ch, { shadow: "lg" }));
  const ay = y + pad + av;
  const tx = x + pad + av * 2 + 20 * k;
  const nw = $.measure(String(p.name), nf);
  s += M.part("author", Object.assign({ at: tin + 0.12, in: "fade", dur: 0.3, box: { x: x + pad, y: y + pad, w: cw - pad * 2, h: av * 2 } }, leave),
    avatar($, "photo", x + pad + av, ay, av, { name: p.name, fill: c.accent }),
    $.text(String(p.name), { ...nf, x: tx, y: ay - nf.size * 1.0, fill: c.fg }),
    p.verified ? verified($, tx + nw + nf.size * 0.55, ay - nf.size * 0.45, nf.size * 0.38) : "",
    $.text(String(p.handle || "") + (p.time ? " · " + p.time : ""), { ...mf, x: tx, y: ay + 6 * k, fill: c.mute }));
  s += M.text("text", Object.assign({ at: tin + 0.3, in: "rise", distance: 16, split: "lines", stagger: 0.08 }, leave, tf, { x: x + pad, y: y + pad + av * 2 + 24 * k, fill: c.fg, maxW: cw - pad * 2 }), String(p.text || ""));
  // Counts climb after the words land; the heart pops red as it starts.
  const sy = y + ch - pad - 30 * k, ts = tin + 0.6 + lines.length * 0.08;
  const cnt = function (n) { return $.count(Math.round(n * $.E.out3($.seg(t, ts, ts + 1.6)))); };
  const col = (cw - pad * 2) / 3;
  const statsRow = [["chat", cnt(p.replies)], ["loop", cnt(p.reposts)], ["heart", cnt(p.likes)]];
  let row = "";
  statsRow.forEach(function (st, i) {
    const sx = x + pad + i * col;
    if (st[0] !== "heart") row += $.icon(st[0], sx, sy - 2 * k, 32 * k, { color: c.mute });
    row += $.text(st[1], { ...mf, x: sx + 46 * k, y: sy, fill: st[0] === "heart" && t > ts ? c.red : c.mute });
  });
  s += M.part("stats", Object.assign({ at: ts - 0.2, in: "fade", dur: 0.3, box: { x: x + pad, y: sy - 10 * k, w: cw - pad * 2, h: 50 * k } }, leave), row);
  const hx = x + pad + 2 * col;
  const liked = t > ts;
  s += M.part("heart", Object.assign({ at: ts - 0.2, in: "fade", dur: 0.2, emphasis: [{ fx: "pop", at: ts }], box: { x: hx, y: sy - 4 * k, w: 34 * k, h: 34 * k } }, leave), $.icon("heart", hx, sy - 2 * k, 32 * k, { color: liked ? c.red : c.mute, fill: liked }));
  return s;
}
