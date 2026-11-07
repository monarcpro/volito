// An airport board: each word's letters sit on dark tiles that flip through the alphabet and settle, one after another, as it is said.
const FLAPS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { role: "mono", size: (A.tall ? 62 : A.wide ? 52 : 56) * k * sizeOf(p.size), font: { weight: 700 }, position: p.position, charW: 0.75, width: A.tall ? 0.94 : 0.82, lh: 1.5 });
  if (!C) return "";
  const f = C.font, fr = Math.floor(t * 30);
  // One tile per letter, as wide as a mono letter, so words keep the gaps the line gave them.
  const adv = $.measure("M", f), tw = adv, th = f.size * 1.3;
  let s = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.06);
    if (since < 0) return;
    const chars = Array.from(u.w);
    const ink = u.accent ? c.accent : "#FFFFFF";
    const x0 = u.x;
    chars.forEach(function (ch, i) {
      const x = x0 + i * tw, y = u.y - (th - f.size) / 2;
      const done = since >= 0.08 + i * 0.05;
      const flap = done ? ch : FLAPS.charAt(Math.floor($.hash(Math.floor(fr / 2) * 3.1 + i * 7.7 + j * 1.3) * FLAPS.length));
      const sy = done ? 1 : Math.max(0.15, Math.abs(Math.cos(Math.PI * ((t * 14 + i * 0.3) % 1))));
      s += $.rect(x + adv * 0.04, y, tw - adv * 0.08, th, { r: 4 * k, fill: "#16181C" });
      s += $.g({ transform: $.tf({ sy: sy, ox: x + tw / 2, oy: y + th / 2 }) }, $.text(flap, Object.assign({}, f, { x: x + tw / 2, y: u.y, anchor: "middle", fill: done ? ink : "#C9CED6", within: { x: -1e6, y: -1e6, w: 2e6, h: 2e6 } })));
      s += $.rect(x + adv * 0.04, y + th / 2 - 1, tw - adv * 0.08, 2, { fill: "#000000", op: 0.7 });
    });
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, s));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? captionWords($, $.data, $.beat("in", 0.05)).map(function (w) { return { at: w.s, kind: "click", level: 0.5 }; }) : [];
}
