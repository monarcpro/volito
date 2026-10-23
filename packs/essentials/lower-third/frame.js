function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  // A 9:16 frame is seen on a phone: the plate reads bigger there.
  const k = $.k * (A.tall ? 1.2 : 1);
  const tin = $.beat("in", 0.15);
  const right = p.side === "right";
  const side = right ? "right" : "left";
  const name = $.case(p.name), role = String(p.role).toUpperCase();
  const tName = landOn($, p.name, tin);
  const tRole = landOn($, p.role, tName + 0.45, tName);
  // Sizes: the name in the display face, the role as a tracked-out mono label — both cut to fit the safe width.
  const maxW = A.w * (A.tall ? 0.86 : 0.62);
  const nf = fitFont($, name, "display", 88 * k, maxW - 100 * k, { ls: -0.02 });
  const rf = fitFont($, role, "mono", 30 * k, maxW - 100 * k, { ls: 0.14 });
  const pad = 46 * k;
  const w = Math.max($.measure(name, nf), $.measure(role, rf) + 38 * k) + pad * 2;
  const h = nf.size * 1.06 + rf.size * 1.25 + pad * 1.35;
  const y = A.tall ? H * 0.6 : A.square ? H * 0.66 : H * 0.7;
  const x = right ? W - A.x - w : A.x;
  const plate = p.look !== "minimal";
  const tx = right ? x + w - pad - 10 * k : x + pad + 10 * k;
  const anchor = right ? "end" : "start";
  // Everything leaves the way it came: back to its side.
  const leave = { out: "slide", outFrom: side, distance: 30 };

  let s = M.part("scrim", { at: tin - 0.1, in: "fade", dur: 0.45, out: "fade", vary: false },
    $.scrim(0, y - 260 * k, W, H - y + 260 * k, { to: "bottom", a: plate ? 0.45 : 0.62 }));
  s += M.part("spine", Object.assign({ at: tin, in: "grow-y", origin: "top", ease: "expo", dur: 0.45, box: { x: right ? x + w - 10 * k : x, y: y, w: 10 * k, h: h } }, leave),
    $.rect(right ? x + w - 10 * k : x, y, 10 * k, h, { r: 5 * k, fill: c.accent }));
  if (plate) s += M.part("plate", Object.assign({ at: tin + 0.06, in: "wipe", from: side, dur: 0.5, box: { x: right ? x : x + 10 * k, y: y, w: w - 10 * k, h: h } }, leave),
    $.card(right ? x : x + 10 * k, y, w - 10 * k, h, { r: $.style.radius * 0.4, shadow: "md" }));
  s += M.text("name", Object.assign({ at: tName + 0.16, in: "rise", distance: 26 }, leave, nf, { x: tx, y: y + pad * 0.62, anchor: anchor, fill: plate ? c.fg : "#FFFFFF" }), name);
  const ry = y + pad * 0.62 + nf.size * 1.06;
  const rw = $.measure(role, rf) + 26 * k;
  s += M.part("role", Object.assign({ at: tRole, in: "slide", from: side, distance: 10, box: { x: right ? tx - rw : tx, y: ry, w: rw, h: rf.size } }, leave),
    $.circle(right ? tx - 7 * k : tx + 7 * k, ry + rf.size * 0.62, 7 * k, { fill: c.accent }),
    $.text(role, Object.assign({}, rf, { x: right ? tx - 26 * k : tx + 26 * k, y: ry, anchor: anchor, fill: plate ? c.mute : "rgba(255,255,255,0.78)" })));
  return s;
}
