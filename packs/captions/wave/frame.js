// Letters rise into place one after another as each word is said, and the line keeps riding a gentle wave.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 80 : A.wide ? 66 : 72) * k * sizeOf(p.size), font: { ls: 0 }, position: p.position, lh: 1.24 });
  if (!C) return "";
  const f = C.font;
  const amp = ({ calm: 0.035, standard: 0.07, big: 0.13 }[p.wave] || 0.07) * f.size;
  let s = "";
  C.lay.words.forEach(function (u) {
    const since = t - (u.s - 0.04);
    if (since < 0) return;
    const chars = Array.from(u.w);
    const fill = u.accent ? c.accent : "#FFFFFF";
    chars.forEach(function (ch, i) {
      const x = u.x + $.measure(chars.slice(0, i).join(""), f);
      const ls = since - i * 0.028;
      if (ls < 0) return;
      const rise = (1 - settle(ls / 0.3)) * f.size * 0.55;
      const swell = Math.sin(t * 4.2 - (x / f.size) * 0.85) * amp * $.clamp(ls / 0.4);
      s += $.text(ch, Object.assign({}, f, { x: x, y: u.y + rise + swell, fill: fill, op: $.clamp(ls / 0.08) }));
    });
  });
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, s));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? wordCues(captionWords($, $.data, $.beat("in", 0.05))) : [];
}
