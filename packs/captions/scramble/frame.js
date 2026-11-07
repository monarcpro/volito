// Each word arrives as scrambled characters that settle, letter by letter, into the word as it is said.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\";

function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const role = p.face === "display" ? "display" : "mono";
  const C = captionLines($, A, ws, t, { role: role, size: (A.tall ? 70 : A.wide ? 58 : 64) * k * sizeOf(p.size), position: p.position, charW: role === "mono" ? 0.62 : 0.58, lh: 1.22 });
  if (!C) return "";
  const f = C.font, frameNo = Math.floor(t * 30);
  let s = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.04);
    if (since < 0) return;
    const chars = Array.from(u.w);
    const step = Math.min(0.045, Math.max(0.02, (u.e - u.s) / Math.max(1, chars.length)));
    chars.forEach(function (ch, i) {
      const x = u.x + $.measure(chars.slice(0, i).join(""), f);
      const settled = since >= 0.06 + i * step;
      const g = settled || /\s|[.,!?]/.test(ch) ? ch : GLYPHS.charAt(Math.floor($.hash(frameNo * 3.7 + i * 11.3 + j * 5.1) * GLYPHS.length));
      s += $.text(g, Object.assign({}, f, { x: x, y: u.y, fill: settled ? (u.accent ? c.accent : "#FFFFFF") : c.accent, op: settled ? 1 : 0.85, within: { x: -1e6, y: -1e6, w: 2e6, h: 2e6 } }));
    });
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, s));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  const ws = captionWords($, $.data, $.beat("in", 0.05));
  return $.data.ticks ? ws.map(function (w) { return { at: w.s, kind: "type", level: 0.5 }; }) : [];
}
