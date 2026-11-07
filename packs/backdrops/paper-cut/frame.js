// Paper-cut hills: layers of cut paper from pale to the accent, each with a soft shadow on the one behind,
// drifting at their own depth so the scene has parallax; a paper sun sits low in the sky.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  let s = M.part("ground", { in: "none", out: "none", vary: false }, plain($, t));
  const n = Math.max(2, Math.min(7, Math.round(p.layers)));
  const sp = Number(p.speed) || 1;
  // The sun first, behind every layer.
  let g = $.circle(W * 0.68, H * (0.34 + 0.02 * Math.sin(t * 0.3)), Math.min(W, H) * 0.12, { fill: $.mix(c.bg, c.accent2, 0.55) });
  for (let i = 0; i < n; i++) {
    const f = i / Math.max(1, n - 1);
    const top = H * (0.42 + 0.42 * f);
    const col = $.mix($.mix(c.bg, c.accent2, 0.25), c.accent, f);
    // Each layer slides sideways in a slow loop; nearer layers travel further.
    const dx = Math.sin(t * 0.18 * sp + i) * W * 0.04 * (0.4 + f);
    const pts = [];
    for (let x = -W * 0.1; x <= W * 1.1; x += W / 36) {
      const y = top + H * 0.06 * (Math.sin((x + dx) / W * 6.283 * (0.9 + i * 0.35) + i * 2.1) * 0.7 + Math.sin((x + dx) / W * 6.283 * (2.3 + i * 0.2) + i) * 0.3);
      pts.push([x, y]);
    }
    const d = $.smooth(pts) + "L" + W * 1.1 + " " + (H + 20) + "L" + -W * 0.1 + " " + (H + 20) + "Z";
    g += $.path(d, { fill: "#000000", op: 0.12, transform: "translate(0 " + -10 * k + ")", extra: 'filter="url(#mg-md)"' });
    g += $.path(d, { fill: col });
  }
  s += M.part("layers", { in: "fade", out: "none", dur: 0.6, vary: false }, g);
  if (p.vignette) s += vignetteOf($, 0.4);
  return s;
}
