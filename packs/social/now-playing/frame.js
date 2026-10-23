function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.3 : 1.1);
  const tin = $.beat("in", 0.15);
  const cw = Math.min(A.w, 680 * k), pad = 28 * k, art = 150 * k;
  const ch = art + pad * 2 + 70 * k;
  const pos = p.position === "auto" ? (A.wide ? "bottom-left" : "center") : p.position;
  const x = pos === "center" ? (W - cw) / 2 : pos === "bottom-left" ? A.x : W - A.x - cw;
  const y = pos === "center" ? A.y + (A.h - ch) * 0.6 : A.y + A.h - ch;
  const leave = { out: "slide", outFrom: pos === "bottom-right" ? "right" : "left", distance: 40 };
  let s = M.part("card", Object.assign({ at: tin, in: "slide", from: pos === "bottom-right" ? "right" : "left", distance: 60, box: { x: x, y: y, w: cw, h: ch } }, leave), $.card(x, y, cw, ch, { shadow: "lg" }));
  // The cover: the picture, or a gradient in the brand's accents with a disc on it.
  let cover;
  if ($.media.cover) cover = $.image("cover", x + pad, y + pad, art, art, { r: 18 * k });
  else {
    const gid = $.uid("np");
    $.def('<linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c.accent + '"/><stop offset="1" stop-color="' + c.accent2 + '"/></linearGradient>');
    cover = $.rect(x + pad, y + pad, art, art, { r: 18 * k, fill: "url(#" + gid + ")" }) + $.circle(x + pad + art / 2, y + pad + art / 2, art * 0.3, { fill: "rgba(0,0,0,0.25)" }) + $.circle(x + pad + art / 2, y + pad + art / 2, art * 0.06, { fill: "#FFFFFF", op: 0.8 });
  }
  s += M.part("cover", Object.assign({ at: tin + 0.1, in: "pop", box: { x: x + pad, y: y + pad, w: art, h: art } }, leave), cover);
  const tx = x + pad + art + 26 * k;
  const tw = cw - (tx - x) - pad;
  const nf = fitFont($, p.title, "display", 38 * k, tw - 80 * k);
  const af = fitFont($, p.artist, "text", 28 * k, tw);
  s += M.part("title", Object.assign({ at: tin + 0.2, in: "rise", distance: 14, box: { x: tx, y: y + pad, w: tw, h: art * 0.7 } }, leave),
    $.text(String(p.title), { ...nf, x: tx, y: y + pad + 10 * k, fill: c.fg }),
    $.text(String(p.artist), { ...af, x: tx, y: y + pad + 10 * k + nf.size * 1.25, fill: c.mute }));
  // An equaliser beside the title: bars bouncing at fixed, different rates.
  let eq = "";
  for (let i = 0; i < 4; i++) {
    const hgt = (0.3 + 0.7 * Math.abs(Math.sin(t * (5 + i * 1.7) + i * 1.3))) * 34 * k;
    eq += $.rect(x + cw - pad - (4 - i) * 12 * k, y + pad + 44 * k - hgt, 7 * k, hgt, { r: 3 * k, fill: c.accent });
  }
  s += M.part("eq", Object.assign({ at: tin + 0.3, in: "fade", dur: 0.3, box: { x: x + cw - pad - 50 * k, y: y + pad, w: 50 * k, h: 48 * k } }, leave), eq);
  // Progress: from `start` of the song, moving in real time.
  const m = /^(\d+):(\d\d)$/.exec(String(p.length || "3:00"));
  const len = m ? Number(m[1]) * 60 + Number(m[2]) : 180;
  const now = Math.min(len, p.start * len + Math.max(0, t - tin));
  const fmt = function (v) { v = Math.floor(v); return Math.floor(v / 60) + ":" + (v % 60 < 10 ? "0" : "") + (v % 60); };
  const py = y + pad + art + 30 * k, pw = cw - pad * 2;
  const mf = { ...$.font("mono"), size: 20 * k };
  s += M.part("progress", Object.assign({ at: tin + 0.35, in: "grow-x", origin: "left", dur: 0.4, box: { x: x + pad, y: py - 6 * k, w: pw, h: 40 * k } }, leave),
    $.rect(x + pad, py, pw, 8 * k, { r: 4 * k, fill: $.rgba(c.fg, 0.15) }),
    $.rect(x + pad, py, pw * now / len, 8 * k, { r: 4 * k, fill: c.accent }),
    $.circle(x + pad + pw * now / len, py + 4 * k, 10 * k, { fill: c.fg }),
    $.text(fmt(now), { ...mf, x: x + pad, y: py + 18 * k, fill: c.mute }),
    $.text("-" + fmt(len - now), { ...mf, x: x + pad + pw, y: py + 18 * k, anchor: "end", fill: c.mute }));
  return s;
}
