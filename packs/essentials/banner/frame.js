function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.15 : 1);
  const tin = $.beat("in", 0.1);
  const label = String(p.label || "").toUpperCase();
  const lf = Object.assign({}, $.font("display"), { size: 40 * k, ls: 0.06 });
  const hf = fitFont($, $.case(p.headline), "display", 48 * k, A.w * (A.wide ? 0.74 : 0.92) - 60 * k);
  const tf = Object.assign({}, $.font("mono"), { size: 26 * k, ls: 0.04 });
  const hasTicker = !!String(p.ticker || "").trim();
  const bh = 96 * k, th = hasTicker ? 52 * k : 0;
  // On 9:16 the label sits on its own row above the headline (the strap is too narrow for both).
  const stack = !A.wide;
  const lw = $.measure(label, lf) + (p.live ? 70 * k : 46 * k);
  const x = stack ? A.x : A.x * 0.6;
  const w = W - 2 * x;
  const yH = (stack ? H * 0.64 : H * 0.78) + (stack ? 70 * k : 0);
  const yL = stack ? yH - 70 * k : yH;
  const hx = stack ? x : x + lw;
  const bw = w - (hx - x);
  const leave = { out: "rise", distance: 30, outDur: 0.35 };

  // The headline bar wipes out from behind the label; the ticker strip under it.
  let s = M.part("bar", Object.assign({ at: tin + 0.18, in: "wipe", from: "left", dur: 0.45, box: { x: hx, y: yH, w: bw, h: bh + th } }, leave),
    $.rect(hx, yH, bw, bh, { fill: c.surface, shadow: "md" }),
    hasTicker ? $.rect(hx, yH + bh, bw, th, { fill: c.ink }) : "");
  s += $.clip(hx, yH, bw, bh, 0, M.text("headline", Object.assign({ at: tin + 0.35, in: "rise", distance: 24 }, leave, hf, { x: hx + 30 * k, y: yH + (bh - hf.size) / 2 - hf.size * 0.04, within: { x: hx, y: yH, w: bw, h: bh } }), $.case(p.headline)));
  if (hasTicker) {
    const items = String(p.ticker).replace(/\s+/g, " ").trim();
    const loop = items + "   ·   ";
    const lw2 = $.measure(loop, tf);
    const off = (Math.max(0, t - tin - 0.35) * p.speed * k) % lw2;
    let run = "";
    for (let i = 0; i < Math.ceil((w + lw2) / lw2) + 1; i++) run += loop;
    s += $.clip(hx, yH + bh, bw, th, 0, M.part("ticker", Object.assign({ at: tin + 0.55, in: "fade", dur: 0.3, box: { x: hx, y: yH + bh, w: bw, h: th } }, leave),
      $.text(run, Object.assign({}, tf, { x: hx + 30 * k - off, y: yH + bh + (th - tf.size) / 2 - tf.size * 0.06, fill: "#FFFFFF", within: { x: -1e6, y: 0, w: 2e6, h: H } }))));
  }
  // The label block slams in with a jolt.
  const lh = stack ? 70 * k : bh;
  let lb = $.rect(x, yL, lw, lh, { fill: c.accent, shadow: "md" });
  if (p.live) lb += $.circle(x + 30 * k, yL + lh / 2, 9 * k, { fill: $.on(c.accent), op: 0.55 + 0.45 * $.wave(t, 1.1) });
  lb += $.text(label, Object.assign({}, lf, { x: x + (p.live ? 52 * k : 23 * k), y: yL + (lh - lf.size) / 2 - lf.size * 0.03, fill: $.on(c.accent) }));
  s += M.part("label", Object.assign({ at: tin, in: "slam", intensity: 0.12, emphasis: [{ fx: "shake", at: tin + 0.08 }], box: { x: x, y: yL, w: lw, h: lh }, origin: "left" }, leave), lb);
  return s;
}
