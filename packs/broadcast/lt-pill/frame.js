function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.3 : 1.15);
  const tin = landOn($, p.name, $.beat("in", 0.15));
  const right = p.side === "right";
  const side = right ? "right" : "left";
  const name = $.case(p.name), role = String(p.role || "");
  const maxW = A.w * (A.tall ? 0.92 : 0.5);
  const h = 128 * k, r = h / 2, av = h * 0.38;
  const nf = fitFont($, name, "display", 48 * k, maxW - h - 60 * k);
  const rf = fitFont($, role, "text", 30 * k, maxW - h - 60 * k);
  const w = h + Math.max($.measure(name, nf), role ? $.measure(role, rf) : 0) + 56 * k;
  const y = A.tall ? H * 0.62 : A.square ? H * 0.7 : H * 0.74;
  const x = right ? W - A.x - w : A.x;
  const ax = x + r, ay = y + r;
  const dotCol = p.status === "live" ? c.red : p.status === "online" ? c.green : null;
  const leave = { out: "pop" };
  let s = M.part("pill", Object.assign({ at: tin, in: "pop", origin: side, box: { x: x, y: y, w: w, h: h } }, leave), $.rect(x, y, w, h, { r: r, fill: c.surface, stroke: c.line, sw: 2 * k, shadow: "lg" }));
  s += M.part("avatar", Object.assign({ at: tin + 0.12, in: "pop", box: { x: ax - av, y: ay - av, w: av * 2, h: av * 2 } }, leave), avatar($, "photo", ax, ay, av, { name: p.name, fill: c.accent }));
  if (dotCol) s += M.part("dot", Object.assign({ at: tin + 0.35, in: "pop", idle: p.status === "live" ? "pulse" : "none", box: { x: ax + av * 0.5, y: ay + av * 0.5, w: av * 0.6, h: av * 0.6 } }, leave), $.circle(ax + av * 0.72, ay + av * 0.72, av * 0.24, { fill: dotCol, stroke: c.surface, sw: 4 * k }));
  const tx = x + h + 4 * k;
  const ty = role ? y + h / 2 - (nf.size * 1.08 + rf.size) / 2 : y + (h - nf.size) / 2;
  s += M.text("name", Object.assign({ at: tin + 0.18, in: "rise", distance: 14 }, leave, nf, { x: tx, y: ty, fill: c.fg }), name);
  if (role) s += M.text("role", Object.assign({ at: tin + 0.3, in: "fade", dur: 0.35 }, leave, rf, { x: tx, y: ty + nf.size * 1.08, fill: c.mute }), role);
  return s;
}
