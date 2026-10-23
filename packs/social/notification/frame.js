function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.3 : 1.15);
  const tin = landOn($, p.title, $.beat("in", 0.15));
  const desk = p.look === "desktop";
  const w = desk ? Math.min(A.w * 0.42, 720 * k) : Math.min(A.w, A.wide ? 760 * k : A.w);
  const pad = 26 * k, ic = 64 * k;
  const af = { ...$.font("text"), size: 22 * k, ls: 0.06 };
  const tf = fitFont($, p.title, "display", 32 * k, w - pad * 2 - ic - 20 * k);
  const mf = { ...$.font("text"), size: 27 * k, lh: 1.3 };
  const lines = $.wrap(String(p.message || ""), w - pad * 2 - ic - 20 * k, mf).slice(0, 3);
  const h = pad * 2 + af.size * 1.6 + tf.size * 1.25 + lines.length * mf.size * 1.3;
  const x = desk ? W - A.x - w : (W - w) / 2;
  const y = desk ? A.y : A.y * (A.tall ? 0.55 : 0.8);
  let b = $.rect(x, y, w, h, { r: (desk ? 18 : 34) * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: "lg" });
  b += appIcon($, p.icon, x + pad, y + pad, ic, { fill: c.accent });
  const tx = x + pad + ic + 20 * k;
  b += $.text(String(p.app || "").toUpperCase(), { ...af, x: tx, y: y + pad - 2 * k, fill: c.mute });
  b += $.text(String(p.time || ""), { ...af, x: x + w - pad, y: y + pad - 2 * k, anchor: "end", fill: c.mute });
  let yy = y + pad + af.size * 1.6;
  b += $.text(String(p.title), { ...tf, x: tx, y: yy, fill: c.fg });
  yy += tf.size * 1.25;
  lines.forEach(function (l, i) { b += $.text(l, { ...mf, x: tx, y: yy + i * mf.size * 1.3, fill: c.fg, op: 0.82 }); });
  return M.part("banner", { at: tin, in: desk ? "slide" : "drop", from: desk ? "right" : "up", distance: desk ? 60 : 90, ease: "bouncy", out: desk ? "slide" : "drop", outFrom: desk ? "right" : "up", box: { x: x, y: y, w: w, h: h } }, b);
}
