function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const raw = $.case(String(p.text || ""));
  const plain = raw.replace(/\*/g, "");
  const face = $.font("display");
  const fit = fitLines($, plain, Object.assign({}, face, { ls: -0.03 }), A.w * 0.94, Math.min(150 * k, A.h * 0.16), 52 * k, A.tall ? 5 : 3);
  const lh = 1.12;
  const blockH = fit.size * (1 + (fit.lines.length - 1) * lh);
  const y = p.position === "top" ? A.y : p.position === "bottom" ? A.y + A.h - blockH : H / 2 - blockH / 2;
  // Words, each with its time (on the voice when there is a transcript, else one every `pace`) and whether it is starred.
  const timed = $.sync(markedRows(raw, fit.lines), tin).reduce(function (a, row) { return a.concat(row); }, []);
  const at = timed.map(function (w, i) { return $.words.length ? w.at : tin + i * p.pace; });
  const hl = timed.map(function (w) { return w.hl; });
  const font = Object.assign({}, fit.font, { x: W / 2, y: y, anchor: "middle", lh: lh, maxW: A.w * 0.94 });
  const lay = M.layout(plain, font, "words");
  const onFootage = p.ground !== "panel";
  let s = "";
  if (p.ground === "panel") s += M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  else if (p.ground === "scrim") {
    const to = p.position === "top" ? "top" : "bottom";
    s += M.part("ground", { at: tin - 0.1, in: "fade", dur: 0.4, out: "fade", vary: false }, p.position === "center" ? $.rect(0, 0, W, H, { fill: "#000000", op: 0.38 }) : $.scrim(0, to === "top" ? 0 : y - 200 * k, W, to === "top" ? y + blockH + 200 * k : H - y + 200 * k, { to: to, a: 0.62 }));
  }
  // The marker: one swipe behind each run of starred words, once the run's last word is said.
  let i = 0;
  while (i < lay.units.length) {
    if (!hl[i]) { i++; continue; }
    let j = i;
    while (j + 1 < lay.units.length && hl[j + 1] && lay.units[j + 1].line === lay.units[i].line) j++;
    const a = lay.units[i], b = lay.units[j];
    const box = { x: a.x - fit.size * 0.1, y: a.y + fit.size * 0.18, w: b.x + b.w - a.x + fit.size * 0.2, h: fit.size * 0.86 };
    s += M.part("marker", { at: (at[j] || tin) + 0.08, in: "grow-x", origin: "left", ease: "out", dur: 0.32, box: box }, $.rect(box.x, box.y, box.w, box.h, { r: fit.size * 0.14, fill: c.accent, transform: $.tf({ r: -1.2, ox: box.x, oy: box.y + box.h / 2 }) }));
    i = j + 1;
  }
  s += M.text("words", Object.assign({ split: "words", in: "rise", distance: fit.size * 0.4 / k, ease: "spring(2.4, 7.5)", unitAt: function (u) { return at[u.index] != null ? at[u.index] : tin; }, fillFor: function () { return onFootage ? "#FFFFFF" : c.fg; } }, font), plain);
  if (p.ground === "none") s = $.g({ extra: 'filter="url(#mg-md)"' }, s);
  return s;
}
