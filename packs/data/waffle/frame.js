// A waffle chart: a ten-by-ten grid where each cell is one percent, filling in up to the value, beside the
// number counting up and what it measures.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  const val = Math.max(0, Math.min(100, Math.round(Number(p.value) || 0)));
  const side = A.wide;
  const roomH = A.y + A.h - head.y;
  const gridS = side ? Math.min(roomH, A.w * 0.48) : Math.min(A.w, roomH * 0.62);
  const gx = side ? A.x : W / 2 - gridS / 2, gy = side ? head.y + (roomH - gridS) / 2 : head.y;
  const cell = gridS / 10, inner = cell * 0.82;
  const shape = p.shape || "square";
  const filled = Math.round(val * $.E.inOut2($.seg(t, tin + 0.6, tin + 2.2)));
  let g = "";
  for (let i = 0; i < 100; i++) {
    // Fill from the bottom-left, row by row.
    const col = i % 10, row = 9 - Math.floor(i / 10);
    const x = gx + col * cell + (cell - inner) / 2, y = gy + row * cell + (cell - inner) / 2;
    const on = i < filled;
    const pop = on ? 1 + 0.25 * (1 - $.E.out3($.clamp((filled - i) / 6))) : 1;
    const fill = on ? c.accent : $.rgba(c.fg, 0.1);
    const ox = x + inner / 2, oy = y + inner / 2;
    let m;
    if (shape === "dot") m = $.circle(ox, oy, inner / 2, { fill: fill });
    else if (shape === "person") m = $.icon("user", x, y, inner, { color: fill, fill: true, sw: 2 * k });
    else m = $.rect(x, y, inner, inner, { r: inner * 0.18, fill: fill });
    g += pop !== 1 ? $.g({ transform: $.tf({ s: pop, ox: ox, oy: oy }) }, m) : m;
  }
  s += M.part("grid", { at: tin + 0.3, in: "fade", dur: 0.4, out: "fade" }, g);
  // The number and its label: beside the grid on wide frames, under it otherwise.
  const tx = side ? A.x + gridS + A.w * 0.06 : W / 2, ty = side ? head.y + roomH * 0.28 : gy + gridS + 50 * k;
  const nf = fitFont($, "100%", "display", Math.min(260 * k, side ? A.h * 0.4 : roomH * 0.2), side ? A.w - gridS - A.w * 0.06 : A.w, { ls: -0.05 });
  const anchor = side ? "start" : "middle";
  s += M.text("value", Object.assign({ at: tin + 0.6, in: "rise", distance: 30 }, nf, { x: tx, y: ty, anchor: anchor, fill: c.accent }), filled + "%");
  const lf = Object.assign({}, $.font("text"), { size: (A.tall ? 40 : 36) * k, weight: 600, lh: 1.25 });
  if (p.label) s += M.text("label", Object.assign({ at: tin + 0.8, in: "rise", distance: 16 }, lf, { x: tx, y: ty + nf.size * 1.02, anchor: anchor, fill: c.fg, maxW: side ? A.w - gridS - A.w * 0.06 : A.w }), String(p.label));
  return s;
}
