// "In this video": the topics as a numbered list with their timestamps, a marker moving down to light the
// current one, the ones before it ticked off.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const rows = (p.rows || []).slice(0, 8);
  const n = Math.max(1, rows.length);
  const title = $.case(String(p.title || ""));
  const tf = fitFont($, title, "display", (A.tall ? 96 : 84) * k, A.w, { ls: -0.03 });
  const listW = Math.min(A.w, 1100 * k);
  const rh = Math.min((A.h - tf.size * 1.6) / n, (A.tall ? 150 : 120) * k);
  const top = A.y + (A.h - tf.size * 1.6 - rh * n) / 2;
  const lx = W / 2 - listW / 2;
  s += M.text("title", Object.assign({ at: tin, in: "rise", distance: 26 }, tf, { x: lx, y: top, fill: c.fg }), title);
  const ly = top + tf.size * 1.6;
  // The marker steps to the current topic once the list is in.
  const cur = Math.max(0, Math.min(n - 1, Math.round(p.current) - 1));
  const stepT = tin + 0.6 + n * 0.08;
  const glide = $.E.inOut3($.seg(t, stepT, stepT + 0.6));
  const my = ly + rh * cur * glide;
  const nf = Object.assign({}, $.font("mono"), { size: Math.min(28 * k, rh * 0.26), weight: 700 });
  const lf = Object.assign({}, $.font("display"), { size: Math.min(46 * k, rh * 0.38) });
  let list = $.rect(lx - 16 * k, my + rh * 0.08, listW + 32 * k, rh * 0.84, { r: rh * 0.2, fill: $.rgba(c.accent, 0.12), op: $.fadeIn(t, stepT, 0.3) });
  rows.forEach(function (r, i) {
    const y = ly + i * rh, mid = y + rh / 2, at = tin + 0.3 + i * 0.08;
    const past = i < cur && glide >= (i + 1) / Math.max(1, cur), lit = i === cur && glide >= 1;
    let m = "";
    const bx = lx + 18 * k, br = rh * 0.22;
    m += $.circle(bx, mid, br, { fill: past ? c.accent : lit ? c.accent : "none", stroke: past || lit ? c.accent : c.line, sw: 3 * k });
    if (past) m += $.path("M" + $.fx(bx - br * 0.45) + " " + $.fx(mid) + "L" + $.fx(bx - br * 0.1) + " " + $.fx(mid + br * 0.35) + "L" + $.fx(bx + br * 0.5) + " " + $.fx(mid - br * 0.35), { stroke: $.on(c.accent), sw: 4 * k });
    else m += $.text(String(i + 1), Object.assign({}, nf, { size: br * 1.1, x: bx, y: mid - br * 0.6, anchor: "middle", fill: lit ? $.on(c.accent) : c.mute }));
    const tsW = $.measure(String(r.time || ""), nf);
    m += $.text(String(r.topic || ""), Object.assign({}, lf, { x: bx + br + 28 * k, y: mid - lf.size * 0.56, fill: past ? c.mute : c.fg, maxW: listW - (br * 2 + 60 * k) - tsW - 40 * k }));
    m += $.text(String(r.time || ""), Object.assign({}, nf, { x: lx + listW, y: mid - nf.size * 0.55, anchor: "end", fill: lit ? c.accent : c.mute }));
    if (i < n - 1) m += $.line(lx, y + rh, lx + listW, y + rh, { stroke: c.line, sw: 1.5 * k });
    list += M.part("rows", { at: at, in: "rise", distance: 20, out: "fade", box: { x: lx, y: y, w: listW, h: rh } }, m);
  });
  return s + list;
}
