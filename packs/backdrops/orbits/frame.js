// Orbits: tilted rings round a glowing core, small planets travelling along them at their own speeds, the far
// side of each ring dimmer so it reads as depth.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  const n = Math.max(2, Math.min(8, Math.round(p.rings)));
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.46, tilt = 0.32, rot = -0.28;
  const sp = Number(p.speed) || 1;
  const P = function (rx, a) { const x = rx * Math.cos(a), y = rx * tilt * Math.sin(a); return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; };
  const ring = function (rx, from, to, col, op, sw) {
    const pts = [];
    for (let i = 0; i <= 48; i++) pts.push(P(rx, from + (to - from) * i / 48));
    return $.path($.smooth(pts), { stroke: col, sw: sw, op: op });
  };
  let back = "", front = "", planetsBack = "", planetsFront = "";
  for (let i = 0; i < n; i++) {
    const rx = R * (0.32 + 0.68 * (i + 1) / n), col = i % 2 ? c.accent2 : c.accent;
    // The far half (behind the core) dim, the near half bright.
    back += ring(rx, Math.PI, 2 * Math.PI, c.fg, 0.14, 2 * k);
    front += ring(rx, 0, Math.PI, c.fg, 0.32, 2.5 * k);
    const a = ((t * sp * 0.6) / (0.6 + i * 0.35) + $.hash(i * 3.1) * 6.283) % (2 * Math.PI);
    const q = P(rx, a), near = Math.sin(a) > 0;
    const pr = (9 + 7 * $.hash(i * 5.7)) * k * (near ? 1.15 : 0.85);
    const pl = $.circle(q[0], q[1], pr, { fill: col }) + $.circle(q[0], q[1], pr * 2.4, { fill: col, op: 0.12 });
    if (near) planetsFront += pl; else planetsBack += pl;
  }
  const core = $.circle(cx, cy, R * 0.16, { fill: $.gradient([[0, c.accent, 1], [1, c.accent2, 1]], { angle: 135 }) }) + $.circle(cx, cy, R * 0.28, { fill: $.gradient([[0, c.accent, 0.35], [1, c.accent, 0]], { radial: true }) });
  s += M.part("orbits", { in: "fade", out: "none", dur: 0.6, vary: false }, back + planetsBack + core + front + planetsFront);
  if (p.vignette) s += vignetteOf($, 0.5);
  return s;
}
