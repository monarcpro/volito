// An exploded stack: isometric plates, one per layer of a system, start as a single stack, spread apart with a
// numbered label on a leader line beside each, light up one after another, then close back into one block.
function isoFace($, ox, oy, S, inner) {
  // The plate's top face: local (x, y) in 0…S mapped onto the isometric rhombus whose back corner is (ox, oy).
  return '<g transform="matrix(0.866 0.5 -0.866 0.5 ' + $.fx(ox) + " " + $.fx(oy) + ')">' + inner + "</g>";
}
function glyph($, kind, S, col, acc) {
  const sw = S * 0.012;
  switch (kind % 5) {
    case 0: // an app window: a bar and three panes
      return $.rect(S * 0.14, S * 0.16, S * 0.72, S * 0.12, { r: S * 0.02, stroke: col, sw: sw }) + $.rect(S * 0.14, S * 0.34, S * 0.3, S * 0.5, { r: S * 0.02, stroke: col, sw: sw }) + $.rect(S * 0.5, S * 0.34, S * 0.36, S * 0.22, { r: S * 0.02, stroke: acc, sw: sw }) + $.rect(S * 0.5, S * 0.62, S * 0.36, S * 0.22, { r: S * 0.02, stroke: col, sw: sw });
    case 1: // requests: parallel lines of different lengths
      let l = "";
      for (let i = 0; i < 5; i++) l += $.line(S * 0.16, S * (0.2 + i * 0.15), S * (0.45 + 0.4 * ((i * 37) % 10) / 10), S * (0.2 + i * 0.15), { stroke: i === 1 ? acc : col, sw: sw * 1.4 });
      return l;
    case 2: // services: a grid of blocks
      let g = "";
      for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) g += $.rect(S * (0.15 + q * 0.25), S * (0.15 + r * 0.25), S * 0.18, S * 0.18, { r: S * 0.02, fill: r === 1 && q === 1 ? acc : col, op: r === 1 && q === 1 ? 0.9 : 0.35 });
      return g;
    case 3: // storage: discs
      return $.circle(S * 0.32, S * 0.5, S * 0.17, { stroke: col, sw: sw }) + $.circle(S * 0.68, S * 0.5, S * 0.17, { stroke: acc, sw: sw }) + $.circle(S * 0.5, S * 0.5, S * 0.06, { fill: col, op: 0.5 });
    default: // a network: nodes and links
      const pts = [[0.25, 0.3], [0.7, 0.25], [0.5, 0.55], [0.3, 0.75], [0.75, 0.72]];
      let n = $.line(S * 0.25, S * 0.3, S * 0.5, S * 0.55, { stroke: col, sw: sw }) + $.line(S * 0.7, S * 0.25, S * 0.5, S * 0.55, { stroke: col, sw: sw }) + $.line(S * 0.5, S * 0.55, S * 0.3, S * 0.75, { stroke: col, sw: sw }) + $.line(S * 0.5, S * 0.55, S * 0.75, S * 0.72, { stroke: acc, sw: sw });
      pts.forEach(function (q, i) { n += $.circle(S * q[0], S * q[1], S * 0.05, { fill: i === 2 ? acc : col }); });
      return n;
  }
}
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const layers = (p.layers || []).slice(0, 6).map(function (r) { return typeof r === "string" ? r : String(r.label || ""); });
  const n = Math.max(1, layers.length);
  let top = A.y;
  if (p.title) {
    const tf = fitFont($, $.case(String(p.title)), "display", (A.tall ? 84 : 72) * k, A.w, { ls: -0.03 });
    s += M.text("title", Object.assign({ at: tin, in: "rise", distance: 24 }, tf, { x: A.x, y: A.y, fill: c.fg }), $.case(String(p.title)));
    top += tf.size * 1.5;
  }
  // Sizes: plate side S, thickness, and the spread between plates when exploded.
  const roomH = A.y + A.h - top;
  const labelW = A.tall ? A.w * 0.42 : A.w * 0.34;
  let S = Math.min((A.w - labelW) / 1.9, roomH / (1.0 + n * 0.42));
  const thick = S * 0.06, spread = Math.min(S * 0.42, (roomH - S * 1.0 - thick) / Math.max(1, n - 1));
  // Explode, hold, collapse.
  const open = $.E.inOut3($.seg(t, tin + 0.5, tin + 1.4)) - $.E.inOut3($.seg(t, $.dur - 1.5, $.dur - 0.7));
  const gap = thick * 1.25 + (spread - thick * 1.25) * Math.max(0, open);
  const cx = A.tall ? A.x + (A.w - labelW) / 2 + S * 0.05 : A.x + (A.w - labelW) * 0.5;
  const stackH = S * 1.0 + thick + gap * (n - 1);
  const oy0 = top + (roomH - stackH) / 2;
  // The plate lit now: each in turn while the stack is open.
  const holdA = tin + 1.5, holdB = $.dur - 1.6;
  const lit = t >= holdA && t < holdB ? Math.floor(((t - holdA) / Math.max(0.01, holdB - holdA)) * n) : -1;
  let stack = $.circle(cx, oy0 + gap * (n - 1) + S * 0.5 + thick + S * 0.06, S * 0.9, { fill: $.gradient([[0, "#000000", 0.18], [1, "#000000", 0]], { radial: true }), transform: "translate(" + cx + " " + (oy0 + gap * (n - 1) + S * 0.56) + ") scale(1 0.42) translate(" + -cx + " " + -(oy0 + gap * (n - 1) + S * 0.56) + ")" });
  const side = $.mix(c.surface, c.fg, 0.1), side2 = $.mix(c.surface, c.fg, 0.18);
  const labels = [];
  // Draw bottom plate first so upper plates sit over it.
  for (let i = n - 1; i >= 0; i--) {
    const oy = oy0 + i * gap, ox = cx;
    const R = [ox + S * 0.866, oy + S * 0.5], F = [ox, oy + S], L = [ox - S * 0.866, oy + S * 0.5];
    const on = i === lit;
    let pl = $.path("M" + L[0] + " " + L[1] + "L" + F[0] + " " + F[1] + "L" + F[0] + " " + (F[1] + thick) + "L" + L[0] + " " + (L[1] + thick) + "Z", { fill: side });
    pl += $.path("M" + F[0] + " " + F[1] + "L" + R[0] + " " + R[1] + "L" + R[0] + " " + (R[1] + thick) + "L" + F[0] + " " + (F[1] + thick) + "Z", { fill: side2 });
    pl += isoFace($, ox, oy, S, $.rect(0, 0, S, S, { fill: on ? $.mix(c.surface, c.accent, 0.12) : c.surface, stroke: on ? c.accent : c.line, sw: S * 0.008 }) + glyph($, i, S, $.rgba(c.fg, 0.55), c.accent));
    stack += pl;
    labels.push({ i: i, y: R[1], x: R[0] });
  }
  s += M.part("stack", { at: tin + 0.1, in: "rise", distance: 40, out: "fade", box: { x: cx - S, y: oy0, w: 2 * S, h: stackH } }, stack);
  // Labels: a leader from each plate's right corner, the number and the name.
  const nf = Object.assign({}, $.font("mono"), { size: (A.tall ? 26 : 22) * k, weight: 700 });
  const lf = fitFont($, layers.reduce(function (a, b) { return b.length > a.length ? b : a; }, ""), "display", (A.tall ? 46 : 40) * k, labelW - 120 * k, { ls: -0.01 });
  const lx = cx + S * 0.866 + 70 * k;
  let lab = "";
  labels.forEach(function (q) {
    const a = $.clamp((open - 0.55) / 0.3) * $.fadeIn(t, tin + 0.9 + q.i * 0.12, 0.3);
    if (a <= 0) return;
    const on = q.i === lit;
    lab += $.g({ op: a }, $.line(q.x + 10 * k, q.y, lx - 16 * k, q.y, { stroke: on ? c.accent : c.line, sw: 2 * k }) + $.circle(lx - 16 * k, q.y, 5 * k, { fill: on ? c.accent : c.mute }) +
      $.text((q.i + 1 < 10 ? "0" : "") + (q.i + 1), Object.assign({}, nf, { x: lx, y: q.y - nf.size * 0.55, fill: on ? c.accent : c.mute })) +
      $.text(layers[q.i], Object.assign({}, lf, { x: lx + nf.size * 2.2, y: q.y - lf.size * 0.56, fill: c.fg })));
  });
  s += M.part("labels", { at: tin + 0.9, in: "none", out: "fade" }, lab);
  return s;
}
