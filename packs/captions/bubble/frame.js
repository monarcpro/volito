// Speech bubbles: each phrase pops up in a bubble with a tail, its words appearing as they are said; bubbles can alternate sides like a conversation.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 60 : A.wide ? 50 : 54) * k * sizeOf(p.size);
  const font = Object.assign({}, $.font("text"), { weight: 700, size: size });
  const maxW = A.w * (A.tall ? 0.7 : 0.5);
  const g = groupAt(phrases(ws, Math.floor(maxW / (size * 0.56)) * 2, 10), t, 0.8);
  if (!g) return "";
  const side = p.side === "right" ? 1 : p.side === "left" ? -1 : g.k % 2 ? 1 : -1;
  const probe = lineUp($, g.words, font, maxW, 0, 0, 1.22);
  const bw = Math.max.apply(null, probe.widths) + size * 1.2, bh = probe.h + size * 0.9;
  const cy = captionY($, A, p.position);
  const bx = side < 0 ? A.x + A.w * 0.04 : A.x + A.w * 0.96 - bw, by = cy - bh / 2;
  const lay = lineUp($, g.words, font, maxW, bx + bw / 2, by + size * 0.45, 1.22);
  const looks = { light: ["#FFFFFF", "#141414"], dark: ["#141414", "#FFFFFF"], brand: [c.accent, $.on(c.accent)] };
  const look = looks[p.look] || looks.light;
  const r = size * 0.55;
  // The tail hangs from the bubble's lower corner on its side.
  const tx = side < 0 ? bx + r * 1.2 : bx + bw - r * 1.2, ty = by + bh;
  const tail = "M" + (tx - side * size * 0.1) + " " + (ty - 2) + " L" + (tx + side * size * 0.45) + " " + (ty - 2) + " L" + (tx - side * size * 0.35) + " " + (ty + size * 0.62) + " Z";
  let s = $.rect(bx, by, bw, bh, { r: r, fill: look[0] }) + $.path(tail, { fill: look[0] });
  lay.words.forEach(function (u) {
    const since = t - (u.s - 0.03);
    if (since < 0 && p.upcoming !== "dim") return;
    s += $.text(u.w, Object.assign({}, font, { x: u.x, y: u.y, fill: u.accent ? (p.look === "brand" ? c.accent2 : c.accent) : look[1], op: since < 0 ? 0.3 : $.clamp(since / 0.08) }));
  });
  // The bubble pops from its tail.
  const e = settle((t - g.start) / 0.28);
  s = $.g({ op: $.clamp((t - g.start) / 0.06), transform: $.tf({ s: Math.max(0.01, e), ox: tx, oy: ty + size * 0.6 }) }, s);
  s = $.g({ extra: 'filter="url(#mg-md)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  const p = $.data, ws = captionWords($, p, $.beat("in", 0.05));
  const out = [];
  ws.forEach(function (w, i) { if (i === 0 || w.s - ws[i - 1].end > 0.45 || /[.!?]$/.test(ws[i - 1].w)) out.push({ at: w.s - 0.05, kind: "pop", level: 0.55 }); });
  return out;
}
