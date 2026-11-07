// Words set round a circle, turning slowly, a second smaller ring turning the other way inside it, and a big
// word (or the brand's mark) in the centre.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const cx = W / 2, cy = A.y + A.h / 2;
  const R = Math.min(A.w, A.h) * 0.44;
  const speed = (Number(p.speed) || 1) * 14;
  // One ring of text: each letter placed and turned along the circle; the phrase repeats to fill it.
  const ring = function (str, r, size, dir, col, phase) {
    const f = Object.assign({}, $.font("mono"), { size: size, weight: 700 });
    const unit = (str.toUpperCase() + "  ·  ");
    const ulen = $.measure(unit, f) + unit.length * size * 0.12;
    const reps = Math.max(1, Math.round((2 * Math.PI * r) / ulen));
    const text = unit.repeat(reps);
    const step = (2 * Math.PI) / text.length;
    let g = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === " ") continue;
      const a = i * step + ((dir * (t - tin) * speed + phase) * Math.PI) / 180;
      const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
      g += $.g({ transform: "translate(" + $.fx(x) + " " + $.fx(y) + ") rotate(" + $.fx((a * 180) / Math.PI) + ")" }, $.text(ch, Object.assign({}, f, { x: 0, y: -size * 0.45, anchor: "middle", fill: col })));
    }
    return g;
  };
  const outer = String(p.text || ""), inner = String(p.inner || "");
  s += M.part("rings", { at: tin, in: "pop", out: "fade", box: { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R } },
    $.circle(cx, cy, R + R * 0.08, { stroke: c.line, sw: 2 * k }) + ring(outer, R, R * 0.085, 1, c.fg, 0) +
    (inner ? $.circle(cx, cy, R * 0.66, { stroke: c.line, sw: 2 * k }) + ring(inner, R * 0.58, R * 0.07, -1, c.accent, 40) : ""));
  const word = $.case(String(p.center || ""));
  if (word) {
    const wf = fitFont($, word, "display", R * 0.42, R * (inner ? 0.86 : 1.3), { ls: -0.03 });
    s += M.text("center", Object.assign({ at: tin + 0.2, in: "pop" }, wf, { x: cx, y: cy - wf.size * 0.55, anchor: "middle", fill: c.accent }), word);
  } else s += M.part("center", { at: tin + 0.2, in: "pop", box: { x: cx - R * 0.2, y: cy - R * 0.2, w: R * 0.4, h: R * 0.4 } }, $.circle(cx, cy, R * 0.16, { fill: c.accent }) + $.icon("sparkle", cx - R * 0.09, cy - R * 0.09, R * 0.18, { color: $.on(c.accent), fill: true }));
  return s;
}
