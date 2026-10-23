function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  const hz = H * 0.58, cx = W / 2;
  // Sky: the ground darkening upward, a glow on the horizon, stars.
  let sky = $.rect(0, 0, W, hz, { fill: $.gradient([[0, "#000000", 0.35], [1, c.accent, 0.28]], { angle: 180 }) });
  for (let i = 0; i < 60; i++) {
    const x = $.hash(i * 3.1) * W, y = $.hash(i * 7.3) * hz * 0.85, tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + $.hash(i)) + i));
    sky += $.circle(x, y, (1 + 2 * $.hash(i * 5.5)) * k, { fill: c.fg, op: 0.6 * tw });
  }
  s += M.part("ground", { in: "none", out: "none", vary: false }, sky);
  if (p.sun) {
    const R = Math.min(W, H) * 0.26, sy = hz - R * 0.35, id = $.uid("sun");
    let cuts = "";
    for (let i = 0; i < 6; i++) { const yy = sy + R * (0.05 + i * 0.16) + ((t * 20 * k * p.speed) % (R * 0.16)), hh = R * (0.02 + i * 0.018); cuts += '<rect x="' + (cx - R) + '" y="' + yy + '" width="' + 2 * R + '" height="' + hh + '" fill="#000"/>'; }
    $.def('<mask id="' + id + '" maskUnits="userSpaceOnUse" x="' + (cx - R) + '" y="' + (sy - R) + '" width="' + 2 * R + '" height="' + 2 * R + '"><rect x="' + (cx - R) + '" y="' + (sy - R) + '" width="' + 2 * R + '" height="' + 2 * R + '" fill="#fff"/>' + cuts + "</mask>");
    s += M.part("sun", { in: "rise", distance: 60, box: { x: cx - R, y: sy - R, w: 2 * R, h: 2 * R } }, $.circle(cx, sy, R * 1.35, { fill: $.gradient([[0, c.accent2, 0.35], [1, c.accent2, 0]], { radial: true }) }) + '<g mask="url(#' + id + ')">' + $.circle(cx, sy, R, { fill: $.gradient([c.accent2, c.accent], { angle: 180 }) }) + "</g>");
  }
  // The floor: lines converging on the centre of the horizon; cross lines rushing toward the viewer.
  let floor = $.rect(0, hz, W, H - hz, { fill: $.gradient([[0, c.accent, 0.25], [1, "#000000", 0.4]], { angle: 180 }) });
  const fh = H - hz, sw = 2.5 * k;
  for (let i = -16; i <= 16; i++) floor += $.line(cx + i * W * 0.012, hz, cx + i * W * 0.16, H + fh, { stroke: c.accent, sw: sw, op: 0.8 });
  const ph = (t * 0.55 * p.speed) % 1;
  for (let j = 0; j < 14; j++) {
    const z = (j + 1 - ph) / 14, y = hz + fh * Math.pow(z, 2.6);
    if (y > hz) floor += $.line(0, y, W, y, { stroke: c.accent, sw: sw * (0.4 + z), op: 0.25 + 0.7 * z });
  }
  floor += $.rect(0, hz - 2 * k, W, 4 * k, { fill: c.accent2 });
  s += M.part("floor", { in: "none", out: "none", vary: false }, floor);
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
