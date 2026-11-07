// Bold words filled with moving diagonal stripes in the brand's two accents, edged in white, each popping in on its time.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 96 : A.wide ? 78 : 86) * k * sizeOf(p.size), font: { ls: 0 }, position: p.position, lines: 2, maxWords: 5, charW: 0.66, lh: 1.1 });
  if (!C) return "";
  const f = C.font;
  const band = f.size * ({ thin: 0.12, standard: 0.2, wide: 0.32 }[p.stripes] || 0.2);
  const pid = $.uid("cst");
  const shift = (t * f.size * 0.8) % (band * 2);
  $.def('<pattern id="' + pid + '" width="' + band * 2 + '" height="' + band * 2 + '" patternUnits="userSpaceOnUse" patternTransform="rotate(-35) translate(' + shift + ' 0)"><rect width="' + band * 2 + '" height="' + band * 2 + '" fill="' + c.accent + '"/><rect width="' + band + '" height="' + band * 2 + '" fill="' + c.accent2 + '"/></pattern>');
  let s = "";
  C.lay.words.forEach(function (u) {
    const since = t - (u.s - 0.03);
    if (since < 0) return;
    const sc = 1 + 0.3 * (1 - settle(since / 0.22));
    const word = $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: u.accent ? "#FFFFFF" : "url(#" + pid + ")", stroke: "#FFFFFF", sw: f.size * 0.07, op: $.clamp(since / 0.05) }));
    s += $.g({ transform: $.tf({ s: sc, ox: u.x + u.ww / 2, oy: u.y + f.size / 2 }) }, word);
  });
  s = $.g({ extra: 'filter="url(#mg-md)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.2, outDur: 0.18, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? wordCues(captionWords($, $.data, $.beat("in", 0.05))) : [];
}
