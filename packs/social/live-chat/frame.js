// A live chat over the stream: messages arrive one after another at the bottom and push the earlier ones up,
// each name in its own colour; a LIVE header with the viewer count tops the panel.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.3 : 1.1);
  const tin = $.beat("in", 0.15);
  const msgs = (p.messages || []).slice(0, 12);
  const pw = A.wide ? Math.min(A.w * 0.36, 620 * $.k) : A.w;
  const px = A.wide ? A.x + A.w - pw : A.x;
  const ph = A.wide ? A.h : A.h * 0.5;
  const py = A.wide ? A.y : A.y + A.h - ph;
  const pad = 24 * k;
  const nf = Object.assign({}, $.font("text"), { size: 26 * k, weight: 700 }), mf = Object.assign({}, $.font("text"), { size: 26 * k, weight: 500, lh: 1.3 });
  // The header: a red LIVE chip and the viewer count.
  const hh = 60 * k;
  let s = $.rect(px, py, pw, ph, { r: 24 * k, fill: $.rgba(c.ink, 0.55) });
  s += $.chip("LIVE", px + pad, py + (hh - 36 * k) / 2 + 6 * k, { size: 22 * k, fill: c.red, color: "#FFFFFF", dot: true });
  s += $.icon("eye", px + pad + 110 * k, py + hh / 2 - 12 * k, 26 * k, { color: "#FFFFFF", sw: 2.2 });
  s += $.text(String(p.viewers || ""), Object.assign({}, nf, { x: px + pad + 146 * k, y: py + hh / 2 - nf.size * 0.5, fill: "#FFFFFF" }));
  s += $.line(px + pad, py + hh + 6 * k, px + pw - pad, py + hh + 6 * k, { stroke: $.rgba("#FFFFFF", 0.15), sw: 2 * k });
  let out = M.part("panel", { at: tin, in: "fade", dur: 0.4, out: "fade" }, s);
  // The messages: one every `gap` seconds; the newest at the bottom, the stack scrolling up as they come.
  const gap = Math.max(0.3, (($.beat("out", $.dur - 0.45) - tin - 0.6) / Math.max(1, msgs.length)));
  const lay = msgs.map(function (mm) {
    const name = String(mm.name || ""), text = String(mm.text || "");
    const lines = $.wrap(name + "  " + text, pw - pad * 2, mf).slice(0, 3);
    return { name: name, text: text, lines: lines, h: lines.length * mf.size * 1.3 + 18 * k };
  });
  const bottom = py + ph - pad;
  const clip = $.uid();
  $.def('<clipPath id="' + clip + '"><rect x="' + px + '" y="' + (py + hh + 14 * k) + '" width="' + pw + '" height="' + (ph - hh - 14 * k) + '"/></clipPath>');
  let list = "";
  let shown = 0;
  lay.forEach(function (_, i) { if (t >= tin + 0.6 + i * gap) shown = i + 1; });
  // Total height of what is shown, with the newest easing up from below.
  let y = bottom;
  for (let i = shown - 1; i >= 0; i--) {
    const at = tin + 0.6 + i * gap, e = $.E.out3($.seg(t, at, at + 0.25));
    const L = lay[i];
    y -= L.h * (i === shown - 1 ? e : 1);
    const col = nameColor($, L.name);
    let m = "";
    L.lines.forEach(function (line, j) {
      if (j === 0 && line.indexOf(L.name) === 0) {
        m += $.text(L.name, Object.assign({}, nf, { x: px + pad, y: y + j * mf.size * 1.3, fill: col }));
        m += $.text(line.slice(L.name.length), Object.assign({}, mf, { x: px + pad + $.measure(L.name, nf), y: y + j * mf.size * 1.3, fill: "#FFFFFF" }));
      } else m += $.text(line, Object.assign({}, mf, { x: px + pad, y: y + j * mf.size * 1.3, fill: "#FFFFFF" }));
    });
    list += $.g({ op: i === shown - 1 ? e : 1 }, m);
  }
  out += M.part("messages", { at: tin + 0.5, in: "none", out: "fade" }, '<g clip-path="url(#' + clip + ')">' + list + "</g>");
  return out;
}
