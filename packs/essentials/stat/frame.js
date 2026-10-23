function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const tNum = landOn($, String(p.value), tin + 0.15);
  const tLabel = landOn($, p.label, tNum + 0.55, tNum);
  const dec = Math.max(0, Math.min(3, Math.round(p.decimals)));
  // The widest the counter gets (what $.counter draws at the end), so the size never jumps.
  const final = (p.prefix || "") + (dec ? Number(p.value).toFixed(dec) : String(Math.round(Number(p.value))).replace(/\B(?=(\d{3})+(?!\d))/g, ",")) + (p.suffix || "");
  const chart = p.chart;
  const side = chart !== "none" && A.wide;
  // The number takes the room it owns: the left half beside a chart on 16:9, the width otherwise.
  const room = side ? A.w * 0.5 : A.w * 0.9;
  const big = fitFont($, final, "display", Math.min(340 * k, A.h * (chart !== "none" && !side ? 0.26 : 0.42)), room, { ls: -0.05 });
  const label = $.case(p.label);
  const lf = fitFont($, label, "text", Math.max(40 * k, big.size * 0.2), room);
  const cf = Object.assign({}, $.font("mono"), { size: 26 * k, ls: 0.06 });
  const blockH = big.size * 1.02 + lf.size * 1.3 + (p.context ? cf.size * 2.2 : 0);
  const chartH = chart === "none" || side ? 0 : A.h * 0.34;
  const top = A.y + (A.h - blockH - chartH - (chartH ? 60 * k : 0)) / 2;
  const x = side ? A.x + A.w * 0.02 : W / 2;
  const anchor = side ? "start" : "middle";

  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  // The number counts up over the time its entrance takes (at least 0.9 s).
  const np = M.progress("number", { at: tNum, in: "rise", distance: 40, dur: 0.9 });
  const counting = $.counter(t, np.at, np.at + Math.max(0.9, np.end - np.at), Number(p.value), { dec: dec, prefix: p.prefix || "", suffix: p.suffix || "" });
  s += M.text("number", Object.assign({ at: tNum, in: "rise", distance: 40 }, big, { x: x, y: top, anchor: anchor, fill: c.accent }), counting);
  s += M.text("label", Object.assign({ at: tLabel, in: "rise", distance: 20 }, lf, { x: x, y: top + big.size * 1.04, anchor: anchor }), label);
  if (p.context) s += M.text("context", Object.assign({ at: tLabel + 0.25, in: "fade", dur: 0.4 }, cf, { x: x, y: top + big.size * 1.04 + lf.size * 1.45, anchor: anchor, fill: c.mute, maxW: room }), p.context);

  // The chart: beside the number on 16:9, under it elsewhere.
  const box = side ? { x: A.x + A.w * 0.58, y: A.y + A.h * 0.12, w: A.w * 0.4, h: A.h * 0.76 } : { x: W / 2 - Math.min(A.w * 0.8, chartH * 1.6) / 2, y: top + blockH + 60 * k, w: Math.min(A.w * 0.8, chartH * 1.6), h: chartH };
  if (chart === "ring") {
    const r = Math.min(box.w, box.h) * 0.4, cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const fill = Math.max(0, Math.min(1, Number(p.value) / (Number(p.max) || 100)));
    s += M.part("chart", { at: tNum - 0.05, in: "pop", box: { x: cx - r * 1.1, y: cy - r * 1.1, w: r * 2.2, h: r * 2.2 } },
      $.ring(cx, cy, r, fill * $.E.out3($.seg(t, tNum, tNum + 0.9)), { sw: r * 0.16 }),
      $.text(Math.round(fill * 100) + "%", Object.assign({}, $.font("mono"), { size: r * 0.34, x: cx, y: cy - r * 0.2, anchor: "middle", fill: c.fg, op: $.fadeIn(t, tNum + 0.6, 0.3) })));
  } else if (chart === "bars") {
    const v = Number(p.value) || 1;
    const series = Array.isArray(p.series) && p.series.length >= 2 ? p.series.map(Number) : [v * 0.34, v * 0.52, v * 0.71, v];
    s += M.part("chart", { at: tNum - 0.1, in: "fade", dur: 0.2, box: box },
      $.bars(t, tNum + 0.05, box.x, box.y, box.w, box.h, series, { highlight: series.length - 1, stagger: 0.1 }),
      $.line(box.x - 10 * k, box.y + box.h, box.x + box.w + 10 * k, box.y + box.h, { stroke: c.line, sw: 3 * k, p: $.E.out3($.seg(t, tNum - 0.1, tNum + 0.4)) }));
  }
  return s;
}
