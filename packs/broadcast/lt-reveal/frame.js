function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.2 : 1);
  const tin = landOn($, p.name, $.beat("in", 0.15));
  const right = p.side === "right";
  const name = $.case(p.name), role = String(p.role || "");
  const maxW = A.w * (A.tall ? 0.92 : 0.66);
  const nf = fitFont($, name, "display", 104 * k, maxW, { ls: -0.02 });
  const rf = fitFont($, role, "text", 36 * k, maxW);
  const nw = $.measure(name, nf);
  const y = A.tall ? H * 0.6 : A.square ? H * 0.64 : H * 0.68;
  const x = right ? W - A.x - nw : A.x;
  // The sweep runs across the name; the name shows behind its trailing edge.
  const sw = Math.max(26 * k, nf.size * 0.32), sh = nf.size * 1.16;
  const run = $.E.inOut3($.seg(t, tin, tin + 0.7));
  const lead = right ? x + nw + sw - (nw + sw * 2) * run : x - sw + (nw + sw * 2) * run;
  const shown = right ? { x: lead, w: x + nw + 20 * k - lead } : { x: x - 20 * k, w: lead - x + 20 * k };
  let s = M.part("scrim", { at: tin - 0.1, in: "fade", dur: 0.45, out: "fade", vary: false }, $.scrim(0, y - 280 * k, W, H - y + 280 * k, { to: "bottom", a: 0.55 }));
  if (t >= tin && shown.w > 0) s += $.clip(shown.x, y - sh, Math.max(0, shown.w), sh * 2.2, 0, M.text("name", { at: tin, in: "none", out: "fade", ...nf, x: x, y: y, fill: "#FFFFFF", shadow: "md" }, name));
  if (run > 0 && run < 1) s += M.part("sweep", { at: tin, in: "none", out: "none", vary: false }, $.rect(right ? lead : lead - sw, y - sh * 0.08, sw, sh, { fill: c.accent }));
  if (role) s += M.text("role", { at: tin + 0.55, in: "rise", distance: 18, ...rf, x: right ? x + nw : x, y: y + nf.size * 1.12, anchor: right ? "end" : "start", fill: "rgba(255,255,255,0.82)", shadow: "sm" }, role);
  return s;
}
