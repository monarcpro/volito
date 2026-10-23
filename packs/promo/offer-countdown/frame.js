function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = "";
  const start = (p.hours * 3600 + p.minutes * 60 + 17) - Math.max(0, t - tin);
  const left = Math.max(0, start);
  const parts = p.days ? [[Math.floor(left / 86400), "days"], [Math.floor(left / 3600) % 24, "hrs"], [Math.floor(left / 60) % 60, "min"], [Math.floor(left) % 60, "sec"]] : [[Math.floor(left / 3600), "hrs"], [Math.floor(left / 60) % 60, "min"], [Math.floor(left) % 60, "sec"]];
  const n = parts.length, lab = $.case(p.label);
  const tileW = Math.min(A.w * 0.9 / (n * 1.25), 190 * k), tileH = tileW * 1.05, gap = tileW * 0.25;
  const lf = Object.assign({}, $.font("display"), { size: tileW * 0.3 }), df = Object.assign({}, $.font("mono"), { size: tileW * 0.58, weight: 700 }), uf = Object.assign({}, $.font("text"), { size: tileW * 0.16 });
  const rowW = n * tileW + (n - 1) * gap, pw = Math.max(rowW, $.measure(lab, lf)) + 80 * k, ph = 40 * k + lf.size * 1.3 + tileH + uf.size * 1.8 + 30 * k;
  const px = W / 2 - pw / 2, py = A.y + A.h - ph;
  s += M.part("panel", { at: tin, in: "rise", distance: 40, box: { x: px, y: py, w: pw, h: ph } }, $.card(px, py, pw, ph, { t: t }) + $.text(lab, Object.assign({}, lf, { x: W / 2, y: py + 34 * k, anchor: "middle", fill: c.fg })));
  const ty = py + 34 * k + lf.size * 1.3;
  let digits = "";
  parts.forEach(function (q, i) {
    const x = W / 2 - rowW / 2 + i * (tileW + gap), last = i === n - 1;
    const v = String(q[0]).padStart(2, "0");
    // The seconds roll: the new value drops in over the first quarter of each second.
    const fr = (start % 1 + 1) % 1, roll = last ? $.E.out3($.clamp((1 - fr) / 0.25)) : 1;
    let inner = $.text(v, Object.assign({}, df, { x: x + tileW / 2, y: ty + (tileH - df.size) / 2 - df.size * 0.08 - (1 - roll) * tileH * 0.5, anchor: "middle", fill: last ? $.on(c.accent) : c.fg, op: roll }));
    digits += $.rect(x, ty, tileW, tileH, { r: 14 * k, fill: last ? c.accent : $.rgba(c.fg, 0.08) }) + $.clip(x, ty, tileW, tileH, 14 * k, inner);
    digits += $.text(q[1], Object.assign({}, uf, { x: x + tileW / 2, y: ty + tileH + uf.size * 0.5, anchor: "middle", fill: c.mute }));
    if (i < n - 1) digits += $.text(":", Object.assign({}, df, { x: x + tileW + gap / 2, y: ty + (tileH - df.size) / 2 - df.size * 0.1, anchor: "middle", fill: c.mute }));
  });
  s += M.part("digits", { at: tin + 0.25, in: "rise", split: "none", distance: 20, box: { x: W / 2 - rowW / 2, y: ty, w: rowW, h: tileH } }, digits);
  return s;
}
