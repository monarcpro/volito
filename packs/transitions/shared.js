// Transitions cover the frame by the cut (the midpoint, or the "cut" beat) and uncover after it: cut your
// two clips there. Everything is transparent at the first and last frame.
function cutAt($) { return $.clamp($.beat("cut", $.dur / 2), 0.1, $.dur - 0.1); }
/** Progress before and after the cut: cover 0→1, then uncover 0→1. */
function phases($, t) {
  const mid = cutAt($);
  return { mid: mid, cover: $.clamp(t / mid), uncover: $.clamp((t - mid) / ($.dur - mid)), before: t < mid };
}
/** The paints: lead (the edge that arrives first), lead2, and cover (what fills the frame at the cut). */
function paints($, scheme) {
  const c = $.c;
  if (scheme === "accent") return { lead: c.accent2, lead2: c.bg, cover: c.accent };
  if (scheme === "black") return { lead: c.accent, lead2: c.accent2, cover: "#0A0A0C" };
  if (scheme === "white") return { lead: c.accent, lead2: c.accent2, cover: "#FFFFFF" };
  return { lead: c.accent, lead2: c.accent2, cover: c.bg };
}
/** The word shown while the frame is covered (on the cover colour). */
function cutWord(M, $, t, label, bg) {
  if (!label) return "";
  const mid = cutAt($), k = $.k, W = $.W, H = $.H, after = $.dur - mid;
  const str = $.case(label);
  const f = fitFont($, str, "display", 150 * k, Math.min(W, H * 1.4) * 0.74, { ls: -0.03 });
  return M.text("label", Object.assign({ at: Math.max(0, mid - Math.min(0.3, mid * 0.5)), in: "pop", outAt: mid + after * 0.25, out: "fade", outDur: after * 0.3 }, f, { x: W / 2, y: H / 2 - f.size * 0.55, anchor: "middle", fill: $.on(bg) }), str);
}
/** The whole frame with a hole cut in it (hole: path data). */
function frameWithHole($, hole, fill) {
  return $.path("M0 0H" + $.W + "V" + $.H + "H0Z" + hole, { fill: fill, extra: 'fill-rule="evenodd"' });
}
/** A closed shape as path data: circle, diamond, star or square, radius r about (cx, cy). */
function shapePath(shape, cx, cy, r) {
  if (r <= 0.01) return "";
  if (shape === "diamond") return "M" + cx + " " + (cy - r) + "L" + (cx + r) + " " + cy + "L" + cx + " " + (cy + r) + "L" + (cx - r) + " " + cy + "Z";
  if (shape === "square") return "M" + (cx - r) + " " + (cy - r) + "H" + (cx + r) + "V" + (cy + r) + "H" + (cx - r) + "Z";
  if (shape === "star") {
    let d = "";
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.5 : r;
      d += (i ? "L" : "M") + (cx + rr * Math.cos(a)) + " " + (cy + rr * Math.sin(a));
    }
    return d + "Z";
  }
  return "M" + (cx + r) + " " + cy + "A" + r + " " + r + " 0 1 0 " + (cx - r) + " " + cy + "A" + r + " " + r + " 0 1 0 " + (cx + r) + " " + cy + "Z";
}
/** A wobbly closed blob through n points (radius r, lumps seeded), as smooth path data. */
function blobPath(cx, cy, r, seed, t) {
  const n = 48, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const q = 1 + 0.1 * Math.sin(3 * a + seed) + 0.06 * Math.sin(7 * a + seed * 2.3 + t * 2) + 0.035 * Math.sin(13 * a + seed * 4.1 - t * 3);
    pts.push([cx + Math.cos(a) * r * q, cy + Math.sin(a) * r * q]);
  }
  let d = "M" + ((pts[0][0] + pts[n - 1][0]) / 2) + " " + ((pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q2 = pts[(i + 1) % n];
    d += "Q" + p[0] + " " + p[1] + " " + (p[0] + q2[0]) / 2 + " " + (p[1] + q2[1]) / 2;
  }
  return d + "Z";
}
