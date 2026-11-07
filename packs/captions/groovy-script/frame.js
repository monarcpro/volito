// Seventies script: cream words with a stack of orange, gold and teal shadows that pull out as each word bounces in.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const size = (A.tall ? 92 : A.wide ? 74 : 84) * k * sizeOf(p.size);
  const C = captionLines($, A, ws, t, { size: size, font: { family: "Pacifico", weight: 400, ls: 0 }, charW: 0.56, lines: 2, maxWords: 6, lh: 1.28, position: p.position });
  if (!C) return "";
  const brand = p.palette === "brand";
  const stack = [brand ? c.accent : "#FF6B35", "#F7B32B", brand ? c.accent2 : "#2EC4B6"];
  let s = "";
  C.lay.words.forEach(function (u) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    // Shadows back to front, pulled out after the word lands; then the face.
    const d = size * 0.05 * $.E.out3($.clamp((since - 0.04) / 0.3));
    let w = "";
    for (let i = stack.length; i >= 1; i--) w += $.text(u.w, Object.assign({}, C.font, { x: u.x + d * i, y: u.y + d * i, fill: stack[i - 1] }));
    w += $.text(u.w, Object.assign({}, C.font, { x: u.x, y: u.y, fill: u.accent ? "#FFD23F" : "#FFF1D6" }));
    const sc = 1 + 0.3 * (1 - settle(since / 0.22));
    s += $.g({ op: $.clamp(since / 0.08), transform: $.tf({ s: sc, ox: u.x + u.ww / 2, oy: u.y + size * 0.6 }) }, w);
  });
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, groupIn($, C.g, t, s));
}
