// A calendar heatmap: weeks across, days down, each cell shaded by how busy that day was, filling in week by week,
// with the total above and a Less … More key beneath.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  // The total: a big number counting up, its label beside or under it.
  const nf = Object.assign({}, $.font("display"), { size: (A.tall ? 150 : 120) * k, ls: -0.04 });
  const lf = Object.assign({}, $.font("text"), { size: (A.tall ? 36 : 32) * k, weight: 500 });
  const total = Number(p.total) || 0;
  s += M.text("total", Object.assign({ at: tin + 0.2, in: "rise", distance: 30 }, nf, { x: A.x, y: head.y - 10 * k, fill: c.accent }), $.counter(t, tin + 0.2, tin + 1.4, total, { dec: 0 }));
  s += M.text("total", Object.assign({ at: tin + 0.35, in: "fade", dur: 0.4 }, lf, { x: A.x, y: head.y - 10 * k + nf.size * 1.02, fill: c.mute, maxW: A.w }), String(p.label || ""));
  // The grid: as many weeks as fit, seven days a week, under the total.
  // Wide: weeks across, days down. Tall: days across, the most recent weeks down, as many as fit.
  const turn = A.tall;
  const dayW = turn ? 0 : 46 * k, dayH = turn ? 40 * k : 0;
  const gx = A.x + dayW, gy = head.y + nf.size * 1.05 + lf.size * 1.4 + 40 * k + dayH;
  const room = { w: A.w - dayW, h: A.y + A.h - gy - 70 * k };
  const gap = 0.18;
  let weeks = Math.max(4, Math.min(53, Math.round(p.weeks)));
  let cell;
  if (turn) {
    cell = Math.min(room.w / (7 * (1 + gap)), 120 * k);
    weeks = Math.max(3, Math.min(weeks, Math.floor(room.h / (cell * (1 + gap)))));
    cell = Math.min(cell, room.h / (weeks * (1 + gap)));
  } else {
    cell = Math.min(room.w / (weeks * (1 + gap)), room.h / (7 * (1 + gap)), 64 * k);
    if (cell < 14 * k) { weeks = Math.max(4, Math.floor(room.w / (14 * k * (1 + gap)))); cell = room.w / (weeks * (1 + gap)); }
  }
  const step = cell * (1 + gap), r = cell * 0.22;
  const gridW = turn ? 7 * step : weeks * step;
  const ox = turn ? gx + (room.w - gridW) / 2 : gx;
  const levels = [$.rgba(c.fg, 0.07), $.mix($.mix(c.bg, c.accent, 0.2), c.accent, 0), $.mix(c.bg, c.accent, 0.45), $.mix(c.bg, c.accent, 0.72), c.accent];
  const seed = Number(p.seed) || 1;
  let cells = "";
  for (let w = 0; w < weeks; w++) {
    const at = tin + 0.5 + (w / weeks) * 1.6;
    const f = $.E.outBack($.seg(t, at, at + 0.35));
    if (f <= 0) continue;
    for (let d = 0; d < 7; d++) {
      // Busier on weekdays and later in the range: a fixed pattern from the seed.
      const v = $.hash(seed * 97.3 + w * 7.1 + d * 1.37) * (d === 0 || d === 6 ? 0.6 : 1) * (0.55 + 0.45 * (w / weeks)) + 0.08 * $.hash(seed + w);
      const lvl = v < 0.18 ? 0 : v < 0.38 ? 1 : v < 0.56 ? 2 : v < 0.74 ? 3 : 4;
      const cx = ox + (turn ? d : w) * step + cell / 2, cy = gy + (turn ? w : d) * step + cell / 2, sz = cell * Math.max(0, f);
      cells += $.rect(cx - sz / 2, cy - sz / 2, sz, sz, { r: r, fill: levels[lvl] });
    }
  }
  s += M.part("cells", { at: tin + 0.5, in: "none", out: "fade" }, cells);
  // Day names down the left, and the key under the grid.
  const df = Object.assign({}, $.font("mono"), { size: Math.min(20 * k, cell * 0.55), fill: c.mute });
  let side = "";
  if (turn) ["M", "T", "W", "T", "F", "S", "S"].forEach(function (dn, i) { side += $.text(dn, Object.assign({}, df, { x: ox + i * step + cell / 2, y: gy - dayH, anchor: "middle" })); });
  else ["Mon", "Wed", "Fri"].forEach(function (dn, i) { side += $.text(dn, Object.assign({}, df, { x: A.x, y: gy + (1 + i * 2) * step + (cell - df.size) / 2 })); });
  const ky = gy + (turn ? weeks : 7) * step + 24 * k, kc = Math.min(cell, 26 * k);
  const kx = ox + gridW - cell * 0.18 - 5 * kc * 1.25 - $.measure("More", df) - 12 * k;
  side += $.text("Less", Object.assign({}, df, { x: kx - 12 * k, y: ky + (kc - df.size) / 2, anchor: "end" }));
  levels.forEach(function (col, i) { side += $.rect(kx + i * kc * 1.25, ky, kc, kc, { r: kc * 0.22, fill: col }); });
  side += $.text("More", Object.assign({}, df, { x: kx + 5 * kc * 1.25 + 4 * k, y: ky + (kc - df.size) / 2 }));
  s += M.part("key", { at: tin + 0.6, in: "fade", dur: 0.5, out: "fade" }, side);
  return s;
}
