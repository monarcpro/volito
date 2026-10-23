function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  const rows = p.rows || [];
  const n = rows.length;
  const room = A.y + A.h - head.y;
  const gap = 40 * k;
  const sh = Math.min((A.tall ? 200 : 130) * k, (room - gap * (n - 1)) / n);
  const maxW = A.wide ? A.w * 0.6 : A.w * 0.9, minW = maxW * 0.22;
  const top = rows[0] ? rows[0].value || 1 : 1;
  const cx = A.wide ? A.x + maxW / 2 + 20 * k : W / 2;
  let y = head.y + Math.max(0, (room - (n * sh + (n - 1) * gap)) / 2);
  const lf = { ...$.font("display"), size: Math.min(38 * k, sh * 0.3) };
  const vf = { ...$.font("mono"), size: Math.min(32 * k, sh * 0.26), weight: 700 };
  rows.forEach(function (r, i) {
    const at = tin + 0.4 + i * 0.25;
    const w1 = minW + (maxW - minW) * Math.sqrt(r.value / top);
    const next = rows[i + 1];
    const w2 = next ? minW + (maxW - minW) * Math.sqrt(next.value / top) : w1 * 0.92;
    const d = "M" + $.fx(cx - w1 / 2) + " " + $.fx(y) + "L" + $.fx(cx + w1 / 2) + " " + $.fx(y) + "L" + $.fx(cx + w2 / 2) + " " + $.fx(y + sh) + "L" + $.fx(cx - w2 / 2) + " " + $.fx(y + sh) + "Z";
    // Deeper stages mix toward the ground; their words take whichever ink reads on them.
    const col = $.mix(seriesColor($, 0), c.bg, i * (0.4 / Math.max(1, n - 1)));
    let st = $.path(d, { fill: col });
    const labelInside = A.wide;
    const val = fmtNum(r.value * $.E.out3($.seg(t, at, at + 0.8)), p.decimals, p.prefix, p.suffix);
    if (labelInside) {
      st += $.text(String(r.label), { ...lf, x: cx, y: y + sh / 2 - lf.size * 0.85, anchor: "middle", fill: $.on(col) });
      st += $.text(val, { ...vf, x: cx, y: y + sh / 2 + lf.size * 0.25, anchor: "middle", fill: $.on(col) });
    } else {
      // The label and its final count, sized to fit the stage's narrow end.
      const line = String(r.label) + "  " + fmtNum(r.value, p.decimals, p.prefix, p.suffix);
      const ff = fitFont($, line, "display", Math.min(lf.size, sh * 0.28), w2 * 0.86);
      st += $.text(String(r.label) + "  " + val, { ...ff, x: cx, y: y + sh / 2 - ff.size * 0.55, anchor: "middle", fill: $.on(col) });
    }
    s += M.part("stages", { at: at, in: "drop", distance: 30, ease: "bouncy", out: "fade", box: { x: cx - w1 / 2, y: y, w: w1, h: sh } }, st);
    if (next) {
      const rate = Math.round((next.value / (r.value || 1)) * 1000) / 10;
      const rx = A.wide ? cx + maxW / 2 + 60 * k : cx;
      const ry = y + sh + gap / 2;
      s += M.part("rates", { at: at + 0.3, in: "fade", dur: 0.3, out: "fade", box: { x: rx - 80 * k, y: ry - 20 * k, w: 160 * k, h: 40 * k } },
        A.wide ? $.text("↓ " + rate + "%", { ...vf, x: rx, y: ry - vf.size * 0.55, fill: c.mute }) : $.text(rate + "% carry on", { ...$.font("mono"), size: 22 * k, x: rx, y: ry - 11 * k, anchor: "middle", fill: c.mute }));
    }
    y += sh + gap;
  });
  return s;
}
