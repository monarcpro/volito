function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.05);
  const left = p.align === "left";
  const x = left ? A.x : W / 2;
  const anchor = left ? "start" : "middle";
  const title = $.case(p.title);
  const tTitle = landOn($, p.title, tin + 0.3);
  // The title as big as fits: one line when it can, up to three.
  const fit = fitLines($, title, Object.assign({}, $.font("display"), { ls: -0.035 }), A.w * (left ? 0.86 : 0.94), Math.min(230 * k, A.h * 0.34), 70 * k, 3);
  const lh = fit.size * 1.02;
  const sub = p.subtitle ? $.case(p.subtitle) : "";
  const subF = Object.assign({}, $.font("text"), { size: Math.max(34 * k, Math.min(52 * k, fit.size * 0.26)) });
  const subLines = sub ? $.wrap(sub, A.w * 0.8, subF) : [];
  const kick = p.kicker ? $.case(p.kicker) : "";
  const chip = kick ? $.chip.size(kick, { size: 30 * k }) : { w: 0, h: 0 };
  const chipH = kick ? chip.h + 40 * k : 0;
  const total = chipH + fit.lines.length * lh + (subLines.length ? 50 * k + subLines.length * subF.size * 1.25 : 0);
  let y = H / 2 - total / 2;

  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H }, glow: [W * 0.72, H * 0.3] }));
  if (p.number) {
    const nf = Object.assign({}, $.font("display"), { size: Math.min(H * 0.62, W * 0.5) });
    const nx = (left ? W * 0.78 : W / 2) + ($.wave(t, 6) - 0.5) * 40 * k;
    const nw = $.measure(String(p.number), nf);
    s += M.part("number", { at: tin, in: "drop", distance: 90, box: { x: nx - nw / 2, y: H / 2 - nf.size * 0.55, w: nw, h: nf.size } },
      $.text(String(p.number), Object.assign({}, nf, { x: nx, y: H / 2 - nf.size * 0.55, anchor: "middle", fill: "none", stroke: $.rgba(c.fg, 0.13), sw: 3 * k })));
  }
  if (kick) {
    s += M.part("kicker", { at: tin + 0.14, in: "rise", distance: 18, box: { x: left ? x : x - chip.w / 2, y: y, w: chip.w, h: chip.h } }, $.chip(kick, x, y, { size: 30 * k, anchor: anchor, dot: true }));
    y += chipH;
  }
  // Each line built letter by letter (word by word in scripts that join), rising on a spring.
  fit.lines.forEach(function (line, i) {
    s += M.text("title", Object.assign({ at: tTitle + i * 0.16, in: "rise", split: "letters", distance: fit.size * 0.6 / k, ease: "spring(2.4, 7)", stagger: Math.min(0.04, 0.45 / Math.max(1, line.length)) }, fit.font, { x: x, y: y + i * lh, anchor: anchor }), line);
  });
  const lastLine = fit.lines[fit.lines.length - 1];
  const lastW = $.measure(lastLine, fit.font);
  const uy = y + (fit.lines.length - 1) * lh + fit.size * 1.0;
  const ux = left ? x : x - lastW / 2;
  // The underline draws on once the last letter has landed.
  const tUnder = tTitle + (fit.lines.length - 1) * 0.16 + Math.min(0.04, 0.45 / Math.max(1, lastLine.length)) * lastLine.length + 0.15;
  const sw = Math.max(8 * k, fit.size * 0.07);
  s += M.part("underline", { at: tUnder, in: "wipe", from: "left", dur: 0.4, box: { x: ux - sw, y: uy - 14 * k, w: lastW + sw * 2, h: 28 * k } }, $.underline(1, 0, ux, uy, lastW, { sw: sw, dur: 0.01 }));
  y += fit.lines.length * lh + 50 * k;
  if (subLines.length) s += M.text("subtitle", Object.assign({ at: tUnder + 0.1, in: "rise", distance: 20, split: "lines", stagger: 0.08 }, subF, { x: x, y: y, anchor: anchor, fill: c.mute, lh: 1.25, maxW: A.w * 0.8 }), sub);
  return s;
}
