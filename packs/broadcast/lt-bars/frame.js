function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.2 : 1);
  const tin = $.beat("in", 0.15);
  const right = p.side === "right";
  const side = right ? "right" : "left", other = right ? "left" : "right";
  const name = $.case(p.name), role = String(p.role || "").toUpperCase();
  const tName = landOn($, p.name, tin);
  const tRole = landOn($, p.role, tName + 0.3, tName);
  const maxW = A.w * (A.tall ? 0.9 : 0.6);
  const nf = fitFont($, name, "display", 78 * k, maxW - 80 * k, { ls: -0.01 });
  const rf = fitFont($, role, "mono", 30 * k, maxW - 80 * k, { ls: 0.12 });
  const pad = 34 * k;
  const nw = $.measure(name, nf) + pad * 2, nh = nf.size * 1.34;
  const rw = role ? $.measure(role, rf) + pad * 1.6 : 0, rh = rf.size * 1.95;
  const y = A.tall ? H * 0.6 : A.square ? H * 0.66 : H * 0.7;
  const x = right ? W - A.x - nw : A.x;
  const inset = 36 * k;
  const rx = right ? W - A.x - inset - rw : A.x + inset;
  const leave = { out: "wipe", outFrom: side, outDur: 0.35 };
  let s = M.part("scrim", { at: tin - 0.1, in: "fade", dur: 0.4, out: "fade", vary: false }, $.scrim(0, y - 240 * k, W, H - y + 240 * k, { to: "bottom", a: 0.4 }));
  s += M.part("nameBar", Object.assign({ at: tin, in: "wipe", from: side, dur: 0.45, ease: "expo", box: { x: x, y: y, w: nw, h: nh } }, leave), $.rect(x, y, nw, nh, { fill: c.surface, shadow: "md" }));
  s += $.clip(x, y, nw, nh, 0, M.text("name", Object.assign({ at: tName + 0.18, in: "rise", distance: 40 }, leave, nf, { x: right ? x + nw - pad : x + pad, y: y + (nh - nf.size) / 2 - nf.size * 0.02, anchor: right ? "end" : "start", fill: c.fg }), name));
  if (role) {
    s += M.part("roleBar", Object.assign({ at: tRole, in: "wipe", from: other, dur: 0.4, ease: "expo", box: { x: rx, y: y + nh, w: rw, h: rh } }, leave), $.rect(rx, y + nh, rw, rh, { fill: c.accent }));
    s += $.clip(rx, y + nh, rw, rh, 0, M.text("role", Object.assign({ at: tRole + 0.15, in: "rise", distance: 24 }, leave, rf, { x: rx + rw / 2, y: y + nh + (rh - rf.size) / 2 - rf.size * 0.05, anchor: "middle", fill: $.on(c.accent) }), role));
  }
  return s;
}
