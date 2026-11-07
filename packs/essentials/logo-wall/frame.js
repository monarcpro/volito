// "Trusted by" with a wall of wordmarks: each name set as a small logo (a mark and the name in its own face)
// in a grid of cells that pop in one after another.
var FACES = [["Archivo Black", 400], ["Playfair Display", 700, true], ["Space Mono", 700], ["Bricolage Grotesque", 800], ["Syne", 800], ["Fraunces", 900], ["Unbounded", 800], ["Righteous", 400]];
function mark($, i, x, y, s, col) {
  // A simple shape per logo: circle, square, triangle, ring, half disc, diamond, bars, plus.
  const h = s / 2, cx = x + h, cy = y + h;
  switch (i % 8) {
    case 0: return $.circle(cx, cy, h, { fill: col });
    case 1: return $.rect(x, y, s, s, { r: s * 0.22, fill: col });
    case 2: return $.path("M" + cx + " " + y + "L" + (x + s) + " " + (y + s) + "L" + x + " " + (y + s) + "Z", { fill: col });
    case 3: return $.circle(cx, cy, h * 0.78, { stroke: col, sw: s * 0.2 });
    case 4: return $.path("M" + x + " " + cy + "A" + h + " " + h + " 0 0 1 " + (x + s) + " " + cy + "Z", { fill: col });
    case 5: return $.path("M" + cx + " " + y + "L" + (x + s) + " " + cy + "L" + cx + " " + (y + s) + "L" + x + " " + cy + "Z", { fill: col });
    case 6: return $.rect(x, y, s * 0.26, s, { fill: col }) + $.rect(x + s * 0.37, y + s * 0.3, s * 0.26, s * 0.7, { fill: col }) + $.rect(x + s * 0.74, y + s * 0.55, s * 0.26, s * 0.45, { fill: col });
    default: return $.rect(x + s * 0.36, y, s * 0.28, s, { r: 2, fill: col }) + $.rect(x, y + s * 0.36, s, s * 0.28, { r: 2, fill: col });
  }
}
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const names = (p.names || []).map(String).filter(Boolean).slice(0, 12);
  const n = Math.max(1, names.length);
  const cols = A.wide ? Math.min(4, n) : A.tall ? 2 : Math.min(3, n);
  const rows = Math.ceil(n / cols);
  const title = $.case(String(p.title || ""));
  const tf = fitFont($, title, "text", (A.tall ? 44 : 38) * k, A.w, { weight: 600 });
  const gap = 18 * k;
  const cw = (A.w - gap * (cols - 1)) / cols, ch = Math.min(cw * (A.tall ? 0.6 : 0.5), (A.h - tf.size * 2.6) / rows - gap);
  const gridH = rows * ch + (rows - 1) * gap;
  const top = A.y + (A.h - tf.size * 2.4 - gridH) / 2;
  s += M.text("title", Object.assign({ at: tin, in: "rise", distance: 20 }, tf, { x: W / 2, y: top, anchor: "middle", fill: c.mute }), title);
  const gy = top + tf.size * 2.4;
  let cells = "";
  names.forEach(function (name, i) {
    const col = i % cols, row = Math.floor(i / cols);
    // The last row is centred when it is short.
    const inRow = row === rows - 1 ? n - row * cols : cols;
    const x = A.x + (A.w - (inRow * cw + (inRow - 1) * gap)) / 2 + col * (cw + gap), y = gy + row * (ch + gap);
    const fc = FACES[i % FACES.length];
    const ms = ch * 0.3;
    const lf = fitFont($, name, "text", ch * 0.3, cw - ms - 60 * k, { family: fc[0], weight: fc[1], italic: !!fc[2], ls: -0.01 });
    const lw = ms + 14 * k + $.measure(name, lf);
    const lx = x + (cw - lw) / 2, mid = y + ch / 2;
    let m = $.rect(x, y, cw, ch, { r: 18 * k, fill: $.rgba(c.fg, 0.04), stroke: c.line, sw: 1.5 * k });
    const ink = p.mono ? c.fg : seriesInk($, i);
    m += mark($, i, lx, mid - ms / 2, ms, ink);
    m += $.text(name, Object.assign({}, lf, { x: lx + ms + 14 * k, y: mid - lf.size * 0.56, fill: c.fg }));
    cells += M.part("logos", { at: tin + 0.25 + i * 0.08, in: "pop", out: "fade", box: { x: x, y: y, w: cw, h: ch } }, m);
  });
  return s + cells;
}
/** A mark colour from the brand: the accents, then the text colour. */
function seriesInk($, i) { return [$.c.accent, $.c.accent2, $.c.fg][i % 3]; }
