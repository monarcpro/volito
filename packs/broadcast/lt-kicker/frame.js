function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.2 : 1);
  const tin = $.beat("in", 0.15);
  const right = p.side === "right";
  const side = right ? "right" : "left";
  const anchor = right ? "end" : "start";
  const name = $.case(p.name), role = String(p.role || ""), kick = String(p.kicker || "").toUpperCase();
  const tName = landOn($, p.name, tin + 0.15);
  const maxW = A.w * (A.tall ? 0.92 : 0.62);
  const nf = fitFont($, name, "display", 92 * k, maxW, { ls: -0.02 });
  const rf = fitFont($, role, "text", 34 * k, maxW);
  const nw = $.measure(name, nf);
  const kf = { ...$.font("mono"), size: 26 * k, ls: 0.14 };
  const chip = kick ? { w: $.measure(kick, kf) + 30 * k, h: kf.size * 1.75 } : { w: 0, h: 0 };
  const total = chip.h + 18 * k + nf.size * 1.05 + 22 * k + rf.size * 1.3;
  const y = (A.tall ? H * 0.62 : A.square ? H * 0.68 : H * 0.72) - total / 2 + 40 * k;
  const x = right ? W - A.x : A.x;
  const leave = { out: "slide", outFrom: side, distance: 24 };
  let s = M.part("scrim", { at: tin - 0.1, in: "fade", dur: 0.45, out: "fade", vary: false }, $.scrim(0, y - 220 * k, W, H - y + 220 * k, { to: "bottom", a: 0.55 }));
  let yy = y;
  if (kick) {
    const cx = right ? x - chip.w : x;
    s += M.part("kicker", Object.assign({ at: tin, in: "pop", origin: side, box: { x: cx, y: yy, w: chip.w, h: chip.h } }, leave), $.rect(cx, yy, chip.w, chip.h, { r: chip.h * 0.18, fill: c.accent }) + $.text(kick, { ...kf, x: cx + chip.w / 2, y: yy + (chip.h - kf.size) / 2 - kf.size * 0.06, anchor: "middle", fill: $.on(c.accent) }));
    yy += chip.h + 18 * k;
  }
  s += M.text("name", Object.assign({ at: tName, in: "rise", distance: 30, split: "words", stagger: 0.07 }, leave, nf, { x: x, y: yy, anchor: anchor, fill: "#FFFFFF", shadow: "md" }), name);
  yy += nf.size * 1.05;
  const rx = right ? x - nw : x;
  s += M.part("rule", Object.assign({ at: tName + 0.3, in: "grow-x", origin: side, dur: 0.45, ease: "expo", box: { x: rx, y: yy, w: nw, h: 6 * k } }, leave), $.rect(rx, yy, nw, 6 * k, { r: 3 * k, fill: c.accent }));
  yy += 22 * k;
  if (role) s += M.text("role", Object.assign({ at: tName + 0.5, in: "fade", dur: 0.4 }, leave, rf, { x: x, y: yy, anchor: anchor, fill: "rgba(255,255,255,0.85)", shadow: "sm" }), role);
  return s;
}
