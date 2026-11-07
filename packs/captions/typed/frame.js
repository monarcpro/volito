// Typed as it is said: each word's letters land across its spoken time, with a caret that blinks while the voice rests.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const role = p.face === "text" ? "text" : "mono";
  const C = captionLines($, A, ws, t, { role: role, size: (A.tall ? 62 : A.wide ? 52 : 56) * k * sizeOf(p.size), position: p.position, charW: role === "mono" ? 0.62 : 0.55, lh: 1.3 });
  if (!C) return "";
  const f = C.font;
  let s = "", caret = null;
  C.lay.words.forEach(function (u) {
    const since = t - u.s;
    if (since < 0) return;
    const chars = Array.from(u.w);
    const span = Math.max(0.08, Math.min(u.e - u.s, 0.07 * chars.length + 0.04));
    const n = Math.min(chars.length, Math.floor((since / span) * chars.length) + 1);
    const shown = chars.slice(0, n).join("");
    s += $.text(shown, Object.assign({}, f, { x: u.x, y: u.y, fill: u.accent ? c.accent : "#FFFFFF" }));
    caret = { x: u.x + $.measure(shown, f) + f.size * 0.06, y: u.y, typing: n < chars.length };
  });
  if (caret) {
    const on = caret.typing || Math.floor(t * 2.2) % 2 === 0;
    if (on) s += $.rect(caret.x, caret.y + f.size * 0.02, Math.max(3, f.size * 0.09), f.size * 0.98, { fill: c.accent });
  }
  let box = "";
  if (p.ground === "box") {
    C.lay.widths.forEach(function (w, li) {
      const y = C.lay.words.find(function (u) { return u.line === li; }).y;
      box += $.rect(W / 2 - w / 2 - f.size * 0.4, y - f.size * 0.2, w + f.size * 0.8 + f.size * 0.2, f.size * 1.4, { r: f.size * 0.12, fill: "#000000", op: 0.62 });
    });
  }
  s = groupIn($, C.g, t, box + s);
  if (p.ground !== "box") s = $.g({ extra: 'filter="url(#mg-sm)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  const ws = captionWords($, $.data, $.beat("in", 0.05));
  return $.data.ticks ? ws.map(function (w) { return { at: w.s, kind: "type", level: 0.55 }; }) : [];
}
