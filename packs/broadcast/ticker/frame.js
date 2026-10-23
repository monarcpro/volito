function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.15 : 1);
  const tin = $.beat("in", 0.1);
  const bh = 74 * k;
  const top = p.position === "top";
  const y = top ? A.y * 0.6 : A.tall ? A.y + A.h - bh : H - bh - H * 0.05;
  const label = String(p.label || "").toUpperCase();
  const lf = { ...$.font("display"), size: 32 * k, ls: 0.06 };
  const lw = label ? $.measure(label, lf) + 56 * k : 0;
  const tf = { ...$.font("text"), size: 32 * k };
  const items = (p.items || []).map(function (s) { return String(s); }).filter(Boolean);
  const loop = items.length ? items.join("   •   ") + "   •   " : "";
  const loopW = loop ? $.measure(loop, tf) : 1;
  const leave = { out: "slide", outFrom: top ? "up" : "down", distance: 40 };
  let s = M.part("bar", Object.assign({ at: tin, in: "slide", from: top ? "up" : "down", distance: 40, box: { x: 0, y: y, w: W, h: bh } }, leave), $.rect(0, y, W, bh, { fill: c.ink }), $.rect(0, top ? y + bh - 4 * k : y, W, 4 * k, { fill: c.accent }));
  // The crawl: copies of the loop, moving left at `speed` from when the bar lands.
  const run = Math.max(0, t - tin - 0.3) * p.speed * k;
  const off = run % loopW;
  let row = "";
  const x0 = lw + 30 * k - off;
  for (let i = 0; x0 + i * loopW < W + loopW && i < 40; i++) row += $.text(loop, { ...tf, x: x0 + i * loopW, y: y + (bh - tf.size) / 2 - tf.size * 0.04, fill: "#FFFFFF", within: { x: -1e6, y: 0, w: 2e6, h: H } });
  s += $.clip(lw, y, W - lw, bh, 0, M.part("items", Object.assign({ at: tin + 0.3, in: "fade", dur: 0.4 }, leave), row));
  if (label) s += M.part("label", Object.assign({ at: tin + 0.1, in: "wipe", from: "left", dur: 0.4, ease: "expo", box: { x: 0, y: y, w: lw, h: bh } }, leave), $.rect(0, y, lw, bh, { fill: c.accent }), $.text(label, { ...lf, x: lw / 2, y: y + (bh - lf.size) / 2 - lf.size * 0.03, anchor: "middle", fill: $.on(c.accent) }));
  return s;
}
