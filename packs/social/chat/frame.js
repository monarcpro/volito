function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.3 : 1.1);
  const tin = $.beat("in", 0.2);
  const msgs = p.messages || [];
  const w = Math.min(A.w, A.wide ? 760 * k : A.w);
  const x = (W - w) / 2;
  const tf = { ...$.font("text"), size: 30 * k, lh: 1.28 };
  const bp = 22 * k, maxB = w * 0.74, gap = 14 * k;
  // Each bubble's lines and time: theirs wait 0.7 s behind typing dots.
  let at = tin + 0.5;
  const bubbles = msgs.map(function (m) {
    const mine = /^me$/i.test(String(m.who).trim());
    const lines = $.wrap(String(m.text), maxB - bp * 2, tf).slice(0, 4);
    const bw = Math.max.apply(null, lines.map(function (l) { return $.measure(l, tf); })) + bp * 2;
    const bh = lines.length * tf.size * 1.28 + bp * 1.4;
    const b = { mine: mine, lines: lines, w: bw, h: bh, typing: mine ? null : at, at: mine ? at : at + 0.7 };
    at = b.at + p.gap;
    return b;
  });
  const hh = 96 * k;
  // The thread scrolls up when it outgrows the space under the header.
  const room = A.h - hh - 20 * k;
  let used = 0;
  const shown = bubbles.filter(function (b) { return t >= b.at; });
  shown.forEach(function (b) { used += b.h + gap; });
  const typingNow = bubbles.some(function (b) { return b.typing !== null && t >= b.typing && t < b.at; });
  if (typingNow) used += 70 * k + gap;
  const scroll = Math.max(0, used - room);
  const top = A.y + hh + 20 * k;
  let s = M.part("header", { at: tin, in: "drop", distance: 30, out: "fade", vary: false, box: { x: x, y: A.y, w: w, h: hh } },
    $.rect(x, A.y, w, hh, { r: 24 * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: "md" }),
    avatar($, null, x + 30 * k + 28 * k, A.y + hh / 2, 28 * k, { name: p.contact, fill: c.accent }),
    $.text(String(p.contact), { ...$.font("display"), size: 30 * k, x: x + 30 * k + 72 * k, y: A.y + hh / 2 - 17 * k, fill: c.fg }));
  let y = top - scroll;
  let body = "";
  bubbles.forEach(function (b, i) {
    if (b.typing !== null && t >= b.typing && t < b.at) {
      const dx = x, dw = 120 * k, dh = 66 * k;
      let dots = $.rect(dx, y, dw, dh, { r: dh / 2, fill: c.surface, stroke: c.line, sw: 1.5 * k });
      for (let d = 0; d < 3; d++) dots += $.circle(dx + dw * (0.3 + d * 0.2), y + dh / 2 - 6 * k * Math.max(0, Math.sin((t - b.typing) * 9 - d * 0.9)), 8 * k, { fill: c.mute });
      body += M.part("typing", { at: b.typing, in: "pop", origin: "left", out: "none", box: { x: dx, y: y, w: dw, h: dh } }, dots);
    }
    if (t < b.at) return;
    const bx = b.mine ? x + w - b.w : x;
    let bub = $.rect(bx, y, b.w, b.h, { r: 28 * k, fill: b.mine ? c.accent : c.surface, stroke: b.mine ? "none" : c.line, sw: 1.5 * k });
    b.lines.forEach(function (l, j) { bub += $.text(l, { ...tf, x: bx + bp, y: y + bp * 0.7 + j * tf.size * 1.28, fill: b.mine ? $.on(c.accent) : c.fg }); });
    body += M.part("messages", { at: b.at, in: "pop", origin: b.mine ? "bottom-right" : "bottom-left", ease: "bouncy", out: "fade", box: { x: bx, y: y, w: b.w, h: b.h } }, bub);
    y += b.h + gap;
  });
  return s + $.clip(x - 20 * k, top, w + 40 * k, A.y + A.h - top, 0, body);
}
