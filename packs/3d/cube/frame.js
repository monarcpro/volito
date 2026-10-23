function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const words = (p.words || []).map(function (w) { return $.case(String(w)); });
  const n = Math.max(2, words.length);
  const face = $.font("display");
  const lead = $.case(String(p.lead || ""));
  // A long box that rolls about its horizontal axis: four faces as wide as the longest word.
  const probe = scene3d($, {});
  const box = A.wide ? Math.min(A.h * 0.36, 360 * k) : Math.min(A.w * 0.42, 380 * k);
  const cw = Math.min(A.w * (A.wide && lead ? 0.6 : 0.88), Math.max.apply(null, words.map(function (w) { return probe.measure(w, { face: face, size: box * 0.6 }); })) + box * 0.5);
  const lf = fitFont($, lead, "display", box * 0.5, A.w * 0.9);
  const lw = lead ? $.measure(lead, lf) : 0;
  const stack = !A.wide;
  const cx = stack ? W / 2 : W / 2 + (lw + 30 * k) / 2;
  const cy = A.y + A.h * (stack ? 0.55 : 0.5);
  const S = scene3d($, { camera: { fov: 30, pitch: -6, yaw: -16, x: cx, y: cy }, light: { spec: 0.25 } });
  // A quarter roll for each word after the first, on springs, evenly through the hold.
  const span = Math.max(0.8, $.beat("out", $.dur - 0.45) - tin - 0.8);
  const step = span / n;
  let turn = 0;
  for (let i = 1; i < n; i++) turn += Math.min(1.08, $.spring(Math.max(0, t - (tin + 0.5 + i * step)), 2.2, 7));
  const cube = { rotate: [90 * turn, 0, 0], position: [0, 0, 0] };
  const hw = cw / 2, hh = box / 2, hd = box / 2;
  const quad = function (pts, nrm, col) { return { loops: [pts], n: nrm, color: col, role: "side" }; };
  const faceCol = function (i) { return i % 2 ? c.accent : c.surface; };
  const faces = [
    quad([[-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd]], [0, 0, -1], faceCol(0)),
    quad([[-hw, -hh, hd], [hw, -hh, hd], [hw, -hh, -hd], [-hw, -hh, -hd]], [0, -1, 0], faceCol(1)),
    quad([[hw, -hh, hd], [-hw, -hh, hd], [-hw, hh, hd], [hw, hh, hd]], [0, 0, 1], faceCol(2)),
    quad([[-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd]], [0, 1, 0], faceCol(3)),
    quad([[hw, -hh, -hd], [hw, -hh, hd], [hw, hh, hd], [hw, hh, -hd]], [1, 0, 0], $.mix(c.surface, c.bg, 0.45)),
    quad([[-hw, -hh, hd], [-hw, -hh, -hd], [-hw, hh, -hd], [-hw, hh, hd]], [-1, 0, 0], $.mix(c.surface, c.bg, 0.45)),
  ];
  S.add({ faces: faces }, cube);
  // Word i sits on the face that rolls to the front after i quarter turns: the front face turned back by i quarters.
  words.slice(0, 4).forEach(function (w, i) {
    const size = fit3d(S, w, { face: face }, cw * 0.84, box * 0.56);
    const ink = i % 2 ? $.on(c.accent) : c.fg;
    S.add(S.text(w, { face: face, size: size, depth: 0, color: ink }), { position: [0, 0, -hd - 1.5], parent: { rotate: [-90 * i, 0, 0], parent: cube }, flat: true, decal: true });
  });
  s += M.part("cube", { at: tin, in: "pop", out: "zoom", box: { x: cx - hw, y: cy - hh, w: cw, h: box } }, S.render());
  if (lead) s += M.text("lead", { at: tin + 0.15, in: "rise", distance: 20, out: "fade", ...lf, x: stack ? W / 2 : cx - hw - 40 * k, y: stack ? cy - hh - lf.size * 1.6 : cy - lf.size * 0.55, anchor: stack ? "middle" : "end", fill: c.fg }, lead);
  return s;
}
