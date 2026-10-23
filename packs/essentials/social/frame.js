var PLATFORMS = {
  youtube: { icon: "play", line: "YouTube" },
  instagram: { icon: "camera", line: "Instagram" },
  tiktok: { icon: "reel", line: "TikTok" },
  x: { icon: "x", line: "X" },
  linkedin: { icon: "users", line: "LinkedIn" },
  threads: { icon: "chat", line: "Threads" },
  website: { icon: "globe", line: "Website" },
};

function frame(t, $) {
  const p = $.data, c = $.c, k = $.k * 1.05, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  const pl = PLATFORMS[p.platform] || PLATFORMS.instagram;
  const hf = fitFont($, p.handle, "display", 40 * k, A.w * 0.5);
  const lf = Object.assign({}, $.font("mono"), { size: 20 * k, ls: 0.14 });
  const hasBtn = !!String(p.action || "").trim();
  const b1 = hasBtn ? $.button.size($.case(p.action), { size: 26 * k }) : { w: 0, h: 0 };
  const b2 = hasBtn ? $.button.size($.case(p.done || p.action), { size: 26 * k, icon: "check" }) : { w: 0, h: 0 };
  const bw = Math.max(b1.w, b2.w);
  const ph = 112 * k;
  const pw = ph + Math.max($.measure(p.handle, hf), $.measure(pl.line.toUpperCase(), lf)) + 34 * k + (hasBtn ? bw + 30 * k : 10 * k);
  const corner = p.corner;
  const x = corner === "bottom-center" ? (W - pw) / 2 : corner.indexOf("left") >= 0 ? A.x : W - A.x - pw;
  const y = corner.indexOf("top") === 0 ? A.y : A.y + A.h - ph;
  const side = corner.indexOf("right") >= 0 ? "right" : corner === "bottom-center" ? "down" : "left";
  const press = landOn($, p.action, tin + 0.9, tin);
  // Every part leaves the way the pill came in, off its own side.
  const leave = { out: "slide", outFrom: side, distance: 50 };

  let s = M.part("pill", Object.assign({ at: tin, in: "slide", from: side, box: { x: x, y: y, w: pw, h: ph } }, leave), $.rect(x, y, pw, ph, { r: ph / 2, fill: c.surface, stroke: c.line, sw: 2 * k, shadow: "lg" }));
  s += M.part("icon", Object.assign({ at: tin + 0.1, in: "spin", intensity: 0.12, box: { x: x + ph * 0.14, y: y + ph * 0.14, w: ph * 0.72, h: ph * 0.72 } }, leave),
    $.circle(x + ph / 2, y + ph / 2, ph * 0.36, { fill: c.accent }) +
    $.icon(pl.icon, x + ph / 2 - ph * 0.17, y + ph / 2 - ph * 0.17, ph * 0.34, { color: $.on(c.accent), sw: 2.4 }));
  s += M.part("handle", Object.assign({ at: tin + 0.2, in: "slide", from: "right", distance: 8, box: { x: x + ph, y: y + ph * 0.2, w: pw - ph, h: ph * 0.6 } }, leave),
    $.text(p.handle, Object.assign({}, hf, { x: x + ph + 4 * k, y: y + ph * 0.2 })) +
    $.text(pl.line.toUpperCase(), Object.assign({}, lf, { x: x + ph + 6 * k, y: y + ph * 0.2 + hf.size * 1.08, fill: c.mute })));
  if (hasBtn) s += M.part("button", Object.assign({ at: tin + 0.35, in: "pop", box: { x: x + pw - 22 * k - bw, y: y + (ph - b1.h) / 2, w: bw, h: b1.h } }, leave),
    $.button(t, $.case(p.action), x + pw - 22 * k - bw, y + (ph - b1.h) / 2, { size: 26 * k, pressAt: press, done: $.case(p.done || p.action) }));
  return s;
}
