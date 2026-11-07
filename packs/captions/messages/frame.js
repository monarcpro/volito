// A chat thread: each phrase arrives as a message bubble at the bottom, taking turns left and right, and the thread slides up to make room.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 50 : A.wide ? 40 : 44) * k * sizeOf(p.size);
  const font = Object.assign({}, $.font("text"), { weight: 600, size: size });
  const maxW = A.w * (A.tall ? 0.62 : 0.42);
  const groups = phrases(ws, Math.floor(maxW / (size * 0.52)) * 2, 12);
  const g = groupAt(groups, t, 1.5);
  if (!g) return "";
  const padX = size * 0.65, padY = size * 0.42, gap = size * 0.5;
  const bottom = H * (A.tall ? 0.8 : 0.88);
  const e = $.E.out3($.clamp((t - g.start) / 0.3));
  const keep = 4;
  // The newest bubble's height pushes the thread up as it arrives.
  const sizes = [];
  for (let a = 0; a < keep && g.k - a >= 0; a++) {
    const L = lineUp($, groups[g.k - a], font, maxW, 0, 0, 1.25);
    sizes.push({ L: L, w: Math.max.apply(null, L.widths) + padX * 2, h: L.h + padY * 2 });
  }
  let y = bottom + (1 - e) * (sizes[0].h + gap);
  const theirs = $.rgba("#FFFFFF", 0.94), mine = c.accent;
  let s = "";
  sizes.forEach(function (b, a) {
    const gi = g.k - a;
    const right = p.sides === "one" ? true : gi % 2 === 1;
    const top = y - b.h;
    y = top - gap;
    const op = a === 0 ? $.clamp((t - g.start) / 0.12) : Math.max(0, 1 - Math.max(0, a - 2 + e) * 0.6);
    if (op <= 0.02) return;
    const bx = right ? A.x + A.w - b.w : A.x;
    const fill = right ? mine : theirs, ink = right ? $.on(mine) : "#111111";
    let m = $.rect(bx, top, b.w, b.h, { r: Math.min(size * 0.9, b.h / 2), fill: fill });
    const lay = lineUp($, groups[gi], font, maxW, bx + b.w / 2, top + padY, 1.25);
    lay.words.forEach(function (u) {
      if (a === 0 && t < u.s - 0.05 && p.upcoming !== "dim") return;
      m += $.text(u.w, Object.assign({}, font, { x: u.x, y: u.y, fill: u.accent ? (right ? $.on(mine) : c.accent) : ink, op: a === 0 && t < u.s - 0.05 ? 0.35 : 1 }));
    });
    const pop = a === 0 ? settle((t - g.start) / 0.26) : 1;
    s += $.g({ op: op, transform: $.tf({ s: Math.max(0.01, pop), ox: right ? bx + b.w : bx, oy: top + b.h }) }, m);
  });
  s = $.g({ extra: 'filter="url(#mg-md)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  const ws = captionWords($, $.data, $.beat("in", 0.05));
  return phrases(ws, 30, 12).map(function (g, i) { return { at: g[0].s - 0.05, kind: i % 2 ? "ding" : "pop", level: 0.45 }; });
}
