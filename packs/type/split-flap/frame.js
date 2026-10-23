function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.2);
  let s = ground(M, $, t);
  const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let rows = String(p.text || "").toUpperCase().split("\n").map(function (r) { return r.trim(); }).filter(Boolean).slice(0, 3);
  if (!rows.length) rows.push("HELLO");
  // Tall frames: long rows break between words so the cells stay big.
  if (A.tall || A.square) {
    const max = A.tall ? 8 : 11, out = [];
    rows.forEach(function (r) {
      let cur = "";
      r.split(/\s+/).forEach(function (w) { if (cur && (cur + " " + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; });
      if (cur) out.push(cur);
    });
    rows = out.slice(0, 5);
  }
  const cols = Math.max.apply(null, rows.map(function (r) { return r.length; }));
  // A board is black with white letters whatever the brand; the brand shows in the landing flash.
  const cellFill = "#151517", ink = "#F4F1EA";
  const cw = Math.min((A.w * 0.96) / cols, (A.h * 0.7) / rows.length / 1.36) * 0.94, ch = cw * 1.36, gap = cw * 0.07;
  const bw = cols * (cw + gap) - gap, bh = rows.length * (ch + gap * 2) - gap * 2;
  const x0 = W / 2 - bw / 2, y0 = H / 2 - bh / 2;
  const f = Object.assign({}, $.font("mono"), { size: ch * 0.62, weight: 700 });
  let out = "";
  rows.forEach(function (row, r) {
    const padL = Math.floor((cols - row.length) / 2);
    for (let q = 0; q < cols; q++) {
      const target = row.charAt(q - padL) || " ";
      const x = x0 + q * (cw + gap), y = y0 + r * (ch + gap * 2);
      const start = tin + q * 0.045 + r * 0.12, flips = target === " " ? 0 : 5 + Math.floor($.hash(q * 3.1 + r * 7.7) * 9), fd = 0.065;
      const n = Math.floor((t - start) / fd), fr = ((t - start) / fd) % 1;
      const done = t < start ? false : n >= flips;
      const ch2 = t < start ? " " : done ? target : POOL.charAt(Math.floor($.hash(n * 1.37 + q + r * 9) * POOL.length));
      out += $.rect(x, y, cw, ch, { r: cw * 0.1, fill: cellFill });
      if (ch2 !== " ") out += $.text(ch2, Object.assign({}, f, { x: x + cw / 2, y: y + ch / 2 - f.size * 0.56, anchor: "middle", fill: done && t - start - flips * fd < 0.25 ? c.accent : ink }));
      // The flap falling: a shade over the top half shrinking to the hinge, then over the bottom half growing.
      if (t >= start && !done) {
        const half = ch / 2;
        if (fr < 0.5) out += $.rect(x, y + half * 2 * fr, cw, half * (1 - 2 * fr), { fill: $.rgba(cellFill, 0.85) });
        else out += $.rect(x, y + half, cw, half * (2 * fr - 1), { fill: $.rgba("#000000", 0.35) });
      }
      out += $.rect(x, y + ch / 2 - Math.max(1, cw * 0.018), cw, Math.max(2, cw * 0.036), { fill: $.rgba("#000000", 0.45) });
    }
  });
  s += M.part("board", { at: tin, in: "fade", dur: 0.25 }, out);
  return s;
}
