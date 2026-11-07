// Bold white words with the key word in a dark script on a lavender paint swash that sweeps in behind it.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const L = lockupAt($, t, A, 6);
  if (!L) return "";
  const size = (A.tall ? 74 : A.wide ? 60 : 68) * k * sizeOf(p.size);
  const paint = p.palette === "brand" ? c.accent : "#C9B6FF", dark = p.palette === "brand" ? $.on(c.accent) : "#1B1433";
  const fontFor = function (w) { return w.i === L.key.i ? { family: "Dancing Script", weight: 700, ls: 0, size: size * 1.3, pad: size * 0.2 } : { family: "Outfit", weight: 700, ls: -0.01, size: size }; };
  const lay = lineUpMixed($, L.g.words, fontFor, A.w * 0.86, W / 2, captionY($, A, p.position), 1.32);
  let swash = "", s = "";
  lay.forEach(function (u) {
    const since = t - (u.s - 0.03);
    const isKey = u.i === L.key.i;
    if (isKey) {
      // Three brush passes, the middle one wide, each a slightly bent stroke behind the word.
      const sw = since + 0.08;
      if (sw > 0) {
        // The round brush ends reach a third of the size past the path, so it starts and stops inside the word.
        const x0 = u.x + u.size * 0.12, x1 = Math.max(x0 + 1, u.x + u.ww - u.size * 0.12), yc = u.y + u.size * 0.6;
        const stroke = function (dy, w, delay, op) {
          const e = $.E.out3($.clamp((sw - delay) / 0.26));
          const d = "M" + x0 + " " + (yc + dy + u.size * 0.06) + " C" + (x0 + (x1 - x0) * 0.3) + " " + (yc + dy - u.size * 0.04) + " " + (x0 + (x1 - x0) * 0.7) + " " + (yc + dy + u.size * 0.05) + " " + x1 + " " + (yc + dy - u.size * 0.05);
          return e > 0 ? $.path(d, { stroke: paint, sw: u.size * w, draw: e, op: op }) : "";
        };
        swash += stroke(0, 0.62, 0, 1) + stroke(-u.size * 0.27, 0.16, 0.05, 0.8) + stroke(u.size * 0.27, 0.14, 0.08, 0.75);
      }
    }
    if (since < 0) return;
    const e = $.E.out3($.clamp(since / 0.28));
    s += $.text(u.w, Object.assign({}, u.font, { x: u.x, y: u.y + (1 - e) * u.size * 0.22, fill: isKey ? dark : "#FFFFFF", op: $.clamp(since / 0.18) }));
  });
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, groupIn($, L.g, t, $.g({ extra: 'filter="url(#mg-sm)"' }, swash + s)));
}
