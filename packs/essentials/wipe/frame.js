function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const mid = $.dur / 2;
  // 0 → 1 covering until the midpoint, 1 → 2 uncovering after it.
  const cover = $.E.inOut3($.seg(t, 0, mid));
  const uncover = $.E.inOut3($.seg(t, mid, $.dur));
  const colors = [c.accent, c.accent2, c.ink];
  const dir = p.direction;
  const horiz = dir === "right" || dir === "left";
  const sign = dir === "right" || dir === "down" ? 1 : -1;
  const L = horiz ? W : H;
  let s = "";
  if (p.shape === "circle") {
    const R = Math.hypot(W, H) * 0.56;
    const cx = W / 2, cy = H / 2;
    if (t < mid) s += $.circle(cx, cy, R * cover, { fill: c.accent }) + $.circle(cx, cy, R * Math.max(0, cover * 1.12 - 0.12), { fill: c.ink });
    else s += $.path("M0 0H" + W + "V" + H + "H0Z M" + (cx + R * uncover) + " " + cy + "A" + R * uncover + " " + R * uncover + " 0 1 0 " + (cx - R * uncover) + " " + cy + "A" + R * uncover + " " + R * uncover + " 0 1 0 " + (cx + R * uncover) + " " + cy + "Z", { fill: c.ink, extra: 'fill-rule="evenodd"' });
  } else if (p.shape === "diagonal") {
    const skew = 0.35 * (horiz ? H : W);
    const pos = t < mid ? -L - skew + (L + skew) * cover : (L + skew) * uncover;
    [[c.accent, -0.12], [c.accent2, -0.06], [c.ink, 0]].forEach(function (lay) {
      const a = pos + (t < mid ? lay[1] : -lay[1] * 0.5) * L;
      const d = horiz
        ? "M" + a + " 0H" + (a + L + skew) + "L" + (a + L) + " " + H + "H" + (a - skew) + "Z"
        : "M0 " + a + "V" + (a + L + skew) + "L" + W + " " + (a + L) + "V" + (a - skew) + "Z";
      s += $.path(d, { fill: lay[0], transform: sign < 0 ? (horiz ? "translate(" + W + " 0) scale(-1 1)" : "translate(0 " + H + ") scale(1 -1)") : undefined });
    });
  } else {
    const n = Math.max(2, Math.round(p.bars));
    const band = (horiz ? H : W) / n;
    for (let i = 0; i < n; i++) {
      const lag = (i / (n - 1)) * 0.35;
      const ci = $.E.inOut3($.clamp(($.seg(t, 0, mid) - lag) / (1 - lag)));
      const ui = $.E.inOut3($.clamp(($.seg(t, mid, $.dur) - lag) / (1 - lag)));
      const len = L * (t < mid ? ci : 1 - ui);
      const start = t < mid ? (sign > 0 ? 0 : L - len) : sign > 0 ? L - len : 0;
      s += horiz ? $.rect(start, i * band - 1, len, band + 2, { fill: colors[i % colors.length] }) : $.rect(i * band - 1, start, band + 2, len, { fill: colors[i % colors.length] });
    }
  }
  // The panels are the transition; they move only when the creator says so.
  s = M.part("panels", { in: "none", out: "none", vary: false }, s);
  if (p.label) {
    const lf = fitFont($, $.case(p.label), "display", 150 * k, W * 0.8, { ls: -0.03 });
    s += M.text("label", Object.assign({ at: mid - mid * 0.5, in: "pop", outAt: mid + mid * 0.25, out: "fade", outDur: mid * 0.3 }, lf, { x: W / 2, y: H / 2 - lf.size * 0.55, anchor: "middle", fill: c.paper }), $.case(p.label));
  }
  return s;
}
