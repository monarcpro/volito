// Key numbers as tiles: each label, its value counting up, a change chip (up in green, down in red) and a small
// trend line. Four across on wide frames, two by two on square ones, stacked on tall ones.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  const rows = (p.rows || []).slice(0, 8);
  const n = Math.max(1, rows.length);
  const cols = A.wide ? Math.min(n, 4) : A.tall ? 1 : 2;
  const lines = Math.ceil(n / cols);
  const gap = 28 * k;
  const tw = (A.w - gap * (cols - 1)) / cols;
  const th = Math.min((A.y + A.h - head.y - gap * (lines - 1)) / lines, A.tall ? 300 * k : 420 * k);
  const top = head.y + Math.max(0, (A.y + A.h - head.y - (th * lines + gap * (lines - 1))) / 2);
  let tiles = "";
  rows.forEach(function (r, i) {
    const col = i % cols, row = Math.floor(i / cols);
    const x = A.x + col * (tw + gap), y = top + row * (th + gap);
    const at = tin + 0.3 + i * 0.12;
    const pad = Math.min(36 * k, tw * 0.09);
    const lf = Object.assign({}, $.font("text"), { size: Math.min(30 * k, th * 0.12), weight: 600 });
    const val = Number(r.value) || 0, d = Number(r.delta) || 0;
    const big = fitFont($, fmtNum(val, 0, "", r.suffix || ""), "display", Math.min(th * 0.34, 130 * k), tw * (A.tall ? 0.5 : 0.9) - pad * 2, { ls: -0.03 });
    let m = $.rect(x, y, tw, th, { r: 22 * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: "sm" });
    m += $.text(String(r.label), Object.assign({}, lf, { x: x + pad, y: y + pad, fill: c.mute, maxW: tw - pad * 2 }));
    const dec = val < 10 && val % 1 ? 1 : 0;
    m += $.text($.counter(t, at + 0.1, at + 1.2, val, { dec: dec, suffix: r.suffix || "" }), Object.assign({}, big, { x: x + pad, y: y + pad + lf.size * 1.5, fill: c.fg }));
    // The change: an arrow and a percentage on a chip, green up, red down.
    const up = d >= 0, chipCol = up ? c.green : c.red;
    const cf = Object.assign({}, $.font("mono"), { size: Math.min(24 * k, th * 0.1), weight: 700 });
    const ctext = (up ? "+" : "−") + Math.abs(d) + "%";
    const cw = $.measure(ctext, cf) + cf.size * 2.2, chh = cf.size * 1.7;
    const cy = y + th - pad - chh;
    m += $.rect(x + pad, cy, cw, chh, { r: chh / 2, fill: $.rgba(chipCol, 0.14) });
    m += $.path("M" + $.fx(x + pad + cf.size * 0.5) + " " + $.fx(cy + chh / 2 + (up ? 0.25 : -0.25) * cf.size) + "L" + $.fx(x + pad + cf.size * 0.85) + " " + $.fx(cy + chh / 2 + (up ? -0.3 : 0.3) * cf.size) + "L" + $.fx(x + pad + cf.size * 1.2) + " " + $.fx(cy + chh / 2 + (up ? 0.25 : -0.25) * cf.size) + "Z", { fill: chipCol });
    m += $.text(ctext, Object.assign({}, cf, { x: x + pad + cf.size * 1.5, y: cy + (chh - cf.size) / 2, fill: chipCol }));
    // A small trend line in the tile's corner, rising or falling with the change.
    const sx = x + tw - pad - Math.min(tw * 0.42, 220 * k), sx1 = x + tw - pad, sy0 = cy - th * 0.05, sh = Math.min(th * 0.28, 90 * k);
    const pts = [];
    for (let j = 0; j <= 9; j++) {
      const trend = up ? j / 9 : 1 - j / 9;
      pts.push([sx + (sx1 - sx) * (j / 9), sy0 + chh - sh * (0.15 + 0.7 * trend + 0.15 * ($.hash(i * 13 + j) - 0.5))]);
    }
    m += $.path($.smooth(pts), { stroke: up ? c.accent : c.red, sw: 4 * k, draw: $.E.out3($.seg(t, at + 0.4, at + 1.3)) });
    tiles += M.part("tiles", { at: at, in: "rise", distance: 30, out: "fade", box: { x: x, y: y, w: tw, h: th } }, m);
  });
  return s + tiles;
}
