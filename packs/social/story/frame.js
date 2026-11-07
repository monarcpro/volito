// A story's frame: progress segments along the top (the current one filling), the poster's badge, name and time,
// a caption sticker and the reply bar — laid out in a 9:16 column, over your footage.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const M = motion($, t);
  const A = safeArea($);
  const tin = $.beat("in", 0.1);
  // A 9:16 column: the whole frame on 9:16, centred on wider ones.
  const cw = Math.min(W, H * 9 / 16), cx0 = (W - cw) / 2;
  const k = cw / 1080;
  const m0 = 36 * k, top = Math.max(A.tall ? A.y * 0.4 : 30 * $.k, 36 * k);
  const n = Math.max(1, Math.min(8, Math.round(p.segments))), cur = Math.max(1, Math.min(n, Math.round(p.current)));
  const segG = 10 * k, segW = (cw - m0 * 2 - segG * (n - 1)) / n, segH = 8 * k;
  let s = "";
  if (cw < W - 2) s += $.rect(cx0, 0, cw, H, { stroke: $.rgba("#FFFFFF", 0.35), sw: 3 * $.k, r: 24 * $.k });
  let bar = "";
  for (let i = 0; i < n; i++) {
    const x = cx0 + m0 + i * (segW + segG);
    const f = i + 1 < cur ? 1 : i + 1 === cur ? $.seg(t, tin + 0.2, $.dur - 0.3) : 0;
    bar += $.rect(x, top, segW, segH, { r: segH / 2, fill: $.rgba("#FFFFFF", 0.4) });
    if (f > 0) bar += $.rect(x, top, segW * f, segH, { r: segH / 2, fill: "#FFFFFF" });
  }
  s += M.part("segments", { at: tin, in: "fade", dur: 0.3, out: "fade" }, bar);
  // The poster: a ring badge with initials, name and time.
  const ar = 52 * k, ax = cx0 + m0 + ar, ay = top + segH + 34 * k + ar;
  const nf = Object.assign({}, $.font("display"), { size: 46 * k }), tf = Object.assign({}, $.font("text"), { size: 38 * k, weight: 500 });
  let who = $.circle(ax, ay, ar + 5 * k, { stroke: c.accent, sw: 5 * k }) + $.circle(ax, ay, ar, { fill: nameColor($, p.name) });
  who += $.text(initials(String(p.name || "")), Object.assign({}, $.font("text"), { size: ar * 0.8, weight: 700, x: ax, y: ay - ar * 0.45, anchor: "middle", fill: $.on(nameColor($, p.name)) }));
  who += $.text(String(p.name || ""), Object.assign({}, nf, { x: ax + ar + 22 * k, y: ay - nf.size * 0.55, fill: "#FFFFFF", shadow: "sm" }));
  who += $.text(String(p.time || ""), Object.assign({}, tf, { x: ax + ar + 34 * k + $.measure(String(p.name || ""), nf), y: ay - tf.size * 0.5, fill: $.rgba("#FFFFFF", 0.75), shadow: "sm" }));
  s += M.part("poster", { at: tin + 0.1, in: "slide", from: "left", distance: 30, out: "fade", box: { x: ax - ar, y: ay - ar, w: cw * 0.7, h: ar * 2 } }, who);
  // The caption sticker: a tilted label in the middle third.
  if (p.caption) {
    const sf = Object.assign({}, $.font("display"), { size: 64 * k });
    const lines = $.wrap($.case(String(p.caption)), cw * 0.72, sf).slice(0, 3);
    const lw = Math.max.apply(null, lines.map(function (l) { return $.measure(l, sf); })) + 60 * k, lh = lines.length * sf.size * 1.15 + 40 * k;
    const sx = cx0 + cw / 2 - lw / 2, sy = H * 0.5 - lh / 2;
    let st = $.rect(sx, sy, lw, lh, { r: 22 * k, fill: "#FFFFFF", shadow: "md" });
    lines.forEach(function (l, i) { st += $.text(l, Object.assign({}, sf, { x: cx0 + cw / 2, y: sy + 20 * k + i * sf.size * 1.15, anchor: "middle", fill: c.accent })); });
    s += M.part("sticker", { at: tin + 0.4, in: "pop", ease: "bouncy", out: "fade", box: { x: sx, y: sy, w: lw, h: lh } }, $.g({ transform: $.tf({ r: -4, ox: cx0 + cw / 2, oy: H * 0.5 }) }, st));
  }
  // The reply bar along the bottom.
  if (p.reply !== false) {
    const rh = 92 * k, ry = H - (A.tall ? H - (A.y + A.h) : 40 * $.k) - rh;
    const rf = Object.assign({}, $.font("text"), { size: 30 * k, weight: 500 });
    let rb = $.rect(cx0 + m0, ry, cw - m0 * 2 - rh - 20 * k, rh, { r: rh / 2, stroke: $.rgba("#FFFFFF", 0.8), sw: 3 * k, fill: $.rgba("#000000", 0.15) });
    rb += $.text("Send message", Object.assign({}, rf, { x: cx0 + m0 + 36 * k, y: ry + (rh - rf.size) / 2 - 2 * k, fill: $.rgba("#FFFFFF", 0.85) }));
    rb += $.icon("heart", cx0 + cw - m0 - rh + 10 * k, ry + rh * 0.2, rh * 0.6, { color: "#FFFFFF", sw: 2.4 });
    s += M.part("reply", { at: tin + 0.3, in: "rise", distance: 30, out: "fade", box: { x: cx0 + m0, y: ry, w: cw - m0 * 2, h: rh } }, rb);
  }
  return s;
}
