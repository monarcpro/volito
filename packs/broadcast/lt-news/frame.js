function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.2 : 1);
  const tin = landOn($, p.headline, $.beat("in", 0.15));
  const head = $.case(p.headline), sub = String(p.sub || ""), tag = String(p.tag || "").toUpperCase();
  const maxW = A.w * (A.tall ? 0.94 : 0.72);
  const hf = fitFont($, head, "display", 64 * k, maxW - 50 * k, { ls: -0.01 });
  const sf = fitFont($, sub, "text", 38 * k, maxW - 40 * k);
  const tf = { ...$.font("mono"), size: 28 * k, ls: 0.16 };
  const pad = 24 * k, sh = 9 * k;
  const hw = $.measure(head, hf) + pad * 2, hh = hf.size * 1.36;
  const sw = sub ? $.measure(sub, sf) + pad * 1.6 : 0, shh = sf.size * 1.6;
  const tw = tag ? $.measure(tag, tf) + pad * 1.4 : 0, th = tf.size * 1.8;
  const blockH = (tag ? th : 0) + hh + (sub ? shh : 0);
  const y0 = (A.tall ? H * 0.64 : A.square ? H * 0.7 : H * 0.74) - blockH / 2;
  const x = A.x;
  let y = y0;
  let s = "";
  if (tag) {
    s += M.part("tag", { at: tin, in: "pop", origin: "bottom-left", out: "fade", box: { x: x, y: y, w: tw, h: th } }, $.rect(x, y, tw, th, { fill: c.ink }) + $.text(tag, { ...tf, x: x + tw / 2, y: y + (th - tf.size) / 2 - tf.size * 0.05, anchor: "middle", fill: "#FFFFFF" }));
    y += th;
  }
  s += M.part("headline", { at: tin + 0.1, in: "wipe", from: "left", dur: 0.45, ease: "expo", out: "wipe", outFrom: "right", box: { x: x, y: y, w: hw + sh, h: hh + sh } },
    $.rect(x + sh, y + sh, hw, hh, { fill: c.accent }), $.rect(x, y, hw, hh, { fill: "#FFFFFF" }), $.text(head, { ...hf, x: x + pad, y: y + (hh - hf.size) / 2 - hf.size * 0.03, fill: "#111318" }));
  if (sub) s += M.part("sub", { at: tin + 0.4, in: "wipe", from: "left", dur: 0.4, ease: "expo", out: "wipe", outFrom: "right", box: { x: x, y: y + hh, w: sw, h: shh } },
    $.rect(x, y + hh, sw, shh, { fill: c.accent }), $.text(sub, { ...sf, x: x + pad * 0.8, y: y + hh + (shh - sf.size) / 2 - sf.size * 0.06, fill: $.on(c.accent) }));
  return s;
}
