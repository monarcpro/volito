// MONARC Cursors — helpers this pack's items share. Places are percentages of the frame (0–100).

/** A point on the frame from percentages. */
function at$($, x, y) { return [($.W * Math.max(0, Math.min(100, Number(x) || 0))) / 100, ($.H * Math.max(0, Math.min(100, Number(y) || 0))) / 100]; }

/** The pointer: an arrow with its tip at (x, y), filled, outlined, squashed a little while pressed (0–1). */
function pointer($, x, y, size, o) {
  o = o || {};
  const sz = size * (1 - 0.12 * (o.press || 0));
  const d = "M0 0 L0 " + $.fx(sz) + " L" + $.fx(sz * 0.27) + " " + $.fx(sz * 0.76) + " L" + $.fx(sz * 0.47) + " " + $.fx(sz * 1.18) + " L" + $.fx(sz * 0.62) + " " + $.fx(sz * 1.1) + " L" + $.fx(sz * 0.43) + " " + $.fx(sz * 0.7) + " L" + $.fx(sz * 0.76) + " " + $.fx(sz * 0.7) + " Z";
  // A soft shadow as an offset, translucent copy (a filter shadow on a path draws a box round it).
  return '<g transform="translate(' + $.fx(x) + " " + $.fx(y) + ')">' + '<g transform="translate(' + $.fx(size * 0.05) + " " + $.fx(size * 0.08) + ')">' + $.path(d, { fill: "#000000", op: 0.22 }) + "</g>" + $.path(d, { fill: o.fill || $.c.ink, stroke: o.stroke || "#FFFFFF", sw: size * 0.06 }) + "</g>";
}

/** A name tag beside a pointer: a pill in the colour with a white dot (or a drawn tick), the name, and optional text after it. */
function nameTag($, x, y, name, col, size, rest, tick) {
  const nf = { size: size, weight: 700 }, rf = { size: size, weight: 500 };
  const nw = $.measure(name, nf), rw = rest ? $.measure(rest, rf) : 0;
  const padX = size * 0.65, dot = size * 0.32, h = size * 1.75;
  const w = padX + dot * 2 + size * 0.45 + nw + (rest ? size * 0.5 + rw : 0) + padX;
  let m = $.rect(x, y, w, h, { r: h / 2, fill: col, shadow: "sm" });
  if (tick) m += $.path("M" + $.fx(x + padX) + " " + $.fx(y + h / 2) + "L" + $.fx(x + padX + dot * 0.75) + " " + $.fx(y + h / 2 + dot * 0.7) + "L" + $.fx(x + padX + dot * 2) + " " + $.fx(y + h / 2 - dot * 0.75), { stroke: "#FFFFFF", sw: size * 0.16 });
  else m += $.circle(x + padX + dot, y + h / 2, dot, { fill: "#FFFFFF" });
  const tx = x + padX + dot * 2 + size * 0.45, ink = $.on(col);
  m += $.text(name, Object.assign({}, nf, { x: tx, y: y + (h - size) / 2 - size * 0.05, fill: ink }));
  if (rest) m += $.text(rest, Object.assign({}, rf, { x: tx + nw + size * 0.5, y: y + (h - size) / 2 - size * 0.05, fill: ink, op: 0.88 }));
  return { m: m, w: w, h: h };
}

/** A click: two rings spreading out from (x, y) from `at`. */
function clickRings($, t, at, x, y, col, r) {
  let s = "";
  for (let i = 0; i < 2; i++) {
    const q = $.clamp((t - at - i * 0.16) / 0.55);
    if (q > 0 && q < 1) s += $.circle(x, y, r * (0.3 + 1.6 * q), { stroke: col, sw: r * 0.12 * (1 - q), op: 1 - q });
  }
  return s;
}

/** Eased travel from a to b over [t0, t1], bowing sideways by `bend` of the distance. */
function glide($, t, t0, t1, a, b, bend) {
  const u = $.E.inOut3($.seg(t, t0, t1));
  const mx = (a[0] + b[0]) / 2 + (b[1] - a[1]) * (bend || 0.2), my = (a[1] + b[1]) / 2 - (b[0] - a[0]) * (bend || 0.2);
  return [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * mx + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * my + u * u * b[1]];
}

/** A colour per person, from the brand's accents and fixed hues. */
function personColor($, i) { return [$.c.accent, "#7C5CFF", "#22C55E", "#F59E0B", "#EC4899", "#06B6D4"][i % 6]; }
