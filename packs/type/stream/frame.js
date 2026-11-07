// An assistant's answer streaming in: the prompt in a bubble, a moment of thinking dots, then the reply arriving
// a few words at a time, each new word fading up, with a caret at the end while it writes.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  let s = ground(M, $, t);
  const w = Math.min(A.w, (A.wide ? 1300 : 1000) * k);
  const x = W / 2 - w / 2;
  const qf = Object.assign({}, $.font("text"), { size: (A.tall ? 40 : 36) * k, weight: 600, lh: 1.3 });
  const rf = Object.assign({}, $.font("text"), { size: (A.tall ? 44 : 40) * k, weight: 500, lh: 1.42 });
  const qLines = $.wrap(String(p.prompt || ""), w * 0.7 - 50 * k, qf).slice(0, 3);
  const qw = Math.max.apply(null, qLines.map(function (l) { return $.measure(l, qf); }).concat([60 * k])) + 50 * k, qh = qLines.length * qf.size * 1.3 + 36 * k;
  const words = String(p.response || "").split(/\s+/).filter(Boolean);
  const rLines = $.wrap(words.join(" "), w - 20 * k, rf);
  const blockH = qh + 50 * k + rLines.length * rf.size * 1.42;
  let y = A.y + Math.max(0, (A.h - blockH) / 2);
  // The prompt, right-aligned in its bubble.
  const qx = x + w - qw;
  let q = $.rect(qx, y, qw, qh, { r: 26 * k, fill: $.rgba(c.accent, 0.14) });
  qLines.forEach(function (l, i) { q += $.text(l, Object.assign({}, qf, { x: qx + 25 * k, y: y + 18 * k + i * qf.size * 1.3, fill: c.fg })); });
  s += M.part("prompt", { at: tin, in: "rise", distance: 30, out: "fade", box: { x: qx, y: y, w: qw, h: qh } }, q);
  y += qh + 50 * k;
  // Thinking, then the words arrive in small bursts.
  const think = tin + 0.5, go = think + 0.8;
  const rate = Math.max(2, Number(p.speed) || 9);
  if (t >= think && t < go) {
    let dots = "";
    for (let i = 0; i < 3; i++) dots += $.circle(x + 20 * k + i * 30 * k, y + rf.size * 0.6, 9 * k, { fill: c.mute, op: 0.35 + 0.65 * $.wave(t, 0.9, i * 0.33) });
    s += dots;
  }
  const shown = t < go ? 0 : Math.min(words.length, Math.floor((t - go) * rate) + 1);
  let i = 0, out = "", caret = null;
  rLines.forEach(function (line, li) {
    let lx = x;
    line.split(" ").forEach(function (wd) {
      if (i < shown) {
        const born = go + i / rate, op = $.clamp((t - born) / 0.25);
        out += $.text(wd, Object.assign({}, rf, { x: lx, y: y + li * rf.size * 1.42, fill: c.fg, op: op }));
        caret = [lx + $.measure(wd, rf) + 8 * k, y + li * rf.size * 1.42];
      }
      lx += $.measure(wd + " ", rf);
      i++;
    });
  });
  s += out;
  // The caret blinks while the reply is being written.
  if (caret && shown < words.length) s += $.rect(caret[0], caret[1] + rf.size * 0.12, rf.size * 0.5, rf.size * 0.95, { r: 3 * k, fill: c.accent, op: 0.9 });
  else if (caret && $.wave(t, 1.1) > 0.5) s += $.rect(caret[0], caret[1] + rf.size * 0.12, rf.size * 0.5, rf.size * 0.95, { r: 3 * k, fill: c.accent, op: 0.9 });
  return s;
}
