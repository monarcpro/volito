function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.05);
  const ws = captionWords($, p, tin);
  if (!ws.length) return "";
  const scale = { small: 0.82, medium: 1, large: 1.22 }[p.size] || 1;
  const font = Object.assign({}, $.font("display"), { ls: -0.01, size: (A.tall ? 76 : A.wide ? 64 : 70) * k * scale });
  const maxW = A.w * (A.tall ? 0.92 : 0.78);
  const two = p.lines !== "one";
  const perLine = Math.max(8, Math.floor(maxW / (font.size * 0.58)));
  const g = groupAt(phrases(ws, perLine * (two ? 2 : 1), two ? 10 : 5), t, 0.7);
  if (!g) return "";
  const lh = 1.18;
  const probe = lineUp($, g.words, font, maxW, W / 2, 0, lh);
  const lay = lineUp($, g.words, font, maxW, W / 2, captionY($, A, p.position) - probe.h / 2, lh);
  // The word being said: the last one whose time has come.
  let ci = -1;
  lay.words.forEach(function (u, j) { if (t >= u.s - 0.02) ci = j; });
  const ink = "#FFFFFF";
  const padX = font.size * 0.2, padY = font.size * 0.1;
  const box = function (u) { return { x: u.x - padX, y: u.y - padY, w: u.ww + padX * 2, h: font.size + padY * 2 }; };
  let s = "";
  if (p.ground === "box") {
    lay.widths.forEach(function (w, li) {
      const y = lay.words.find(function (u) { return u.line === li; }).y;
      s += $.rect(W / 2 - w / 2 - font.size * 0.42, y - font.size * 0.2, w + font.size * 0.84, font.size * 1.4, { r: font.size * 0.24, fill: "#000000", op: 0.58 });
    });
  }
  // The highlight under the word being said slides over from the word before it on the same line.
  if (p.look === "pill" && ci >= 0) {
    const cur = lay.words[ci], prev = lay.words[ci - 1];
    const b = box(cur);
    const e = $.E.out3($.clamp((t - cur.s + 0.02) / 0.13));
    const a = prev && prev.line === cur.line ? box(prev) : { x: b.x + b.w * 0.2, y: b.y + b.h * 0.1, w: b.w * 0.6, h: b.h * 0.8 };
    const r = { x: $.lerp(a.x, b.x, e), y: $.lerp(a.y, b.y, e), w: $.lerp(a.w, b.w, e), h: $.lerp(a.h, b.h, e) };
    s += $.rect(r.x, r.y, r.w, r.h, { r: r.h * 0.26, fill: c.accent });
  }
  lay.words.forEach(function (u, j) {
    const said = j <= ci, isCur = j === ci;
    let fill = u.accent ? (p.look === "pill" ? c.accent2 : c.accent) : ink;
    let op = said ? 1 : p.upcoming === "hidden" ? 0 : 0.42;
    if (isCur && p.look === "pill") fill = $.on(c.accent);
    else if (isCur && p.look === "color") fill = u.accent ? c.accent2 : c.accent;
    if (op <= 0) return;
    const lift = isCur ? 1 + 0.07 * (1 - $.E.out3($.clamp((t - u.s + 0.02) / 0.16))) : 1;
    const word = $.text(u.w, Object.assign({}, font, { x: u.x, y: u.y, fill: fill, op: op }));
    s += lift === 1 ? word : $.g({ transform: $.tf({ s: lift, ox: u.x + u.ww / 2, oy: u.y + font.size / 2 }) }, word);
    if (isCur && p.look === "underline") {
      const e = $.E.out3($.clamp((t - u.s + 0.02) / 0.14));
      s += $.rect(u.x, u.y + font.size * 1.04, u.ww * e, font.size * 0.09, { r: font.size * 0.045, fill: c.accent });
    }
  });
  // Each group rises in as it starts; words over footage get a soft shadow to read on anything.
  const ein = $.E.out3($.clamp((t - g.start) / 0.16));
  s = $.g({ op: $.clamp((t - g.start) / 0.08), transform: $.tf({ y: (1 - ein) * 14 * k }) }, s);
  if (p.ground !== "box") s = $.g({ extra: 'filter="url(#mg-sm)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? wordCues(captionWords($, $.data, $.beat("in", 0.05))) : [];
}
