// Selecting text: a paragraph on a card, the cursor (an I-beam) drags across a phrase as the highlight grows word
// by word, lets go, and a small toolbar pops over the selection with one action pressed.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const text = String(p.text || "");
  const pick = String(p.select || "").trim();
  const cw = Math.min(A.w, (A.wide ? 1150 : 940) * k), pad = 48 * k;
  const f = { size: (A.tall ? 46 : 40) * k, weight: 500, lh: 1.5 };
  const lines = $.wrap(text, cw - pad * 2, f);
  const lh = f.size * 1.5, ch = pad * 2 + lines.length * lh;
  const cx = W / 2 - cw / 2, cy = A.y + (A.h - ch) / 2 + 40 * k;
  // Lay the words out so the selection can be measured word by word.
  const words = [];
  lines.forEach(function (line, li) {
    let x = cx + pad;
    line.split(" ").forEach(function (w) { const ww = $.measure(w, f); words.push({ w: w, x: x, y: cy + pad + li * lh, ww: ww, line: li }); x += ww + $.measure(" ", f); });
  });
  // Which words the phrase covers (the first place it appears).
  const all = words.map(function (w) { return w.w; });
  const pw = pick.split(/\s+/).filter(Boolean);
  let i0 = -1;
  for (let i = 0; i + pw.length <= all.length && pw.length; i++) if (pw.every(function (q, j) { return all[i + j].replace(/[.,!?;:]/g, "") === q.replace(/[.,!?;:]/g, ""); })) { i0 = i; break; }
  if (i0 < 0) { i0 = Math.min(2, Math.max(0, all.length - 1)); pw.length = Math.min(3, all.length - i0); }
  const i1 = i0 + Math.max(1, pw.length) - 1;
  const t0 = tin + 0.9, t1 = t0 + 0.25 * (i1 - i0 + 1) + 0.3;
  const prog = $.E.inOut2($.seg(t, t0, t1));
  const reach = i0 + (i1 - i0 + 1) * prog;
  let card = $.rect(cx, cy, cw, ch, { r: 22 * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: "lg" });
  // The highlight under the selected words so far.
  words.forEach(function (w, i) {
    if (i < i0 || i >= reach) return;
    const part = Math.min(1, reach - i);
    const next = words[i + 1];
    const extra = i < i1 && next && next.line === w.line ? next.x - (w.x + w.ww) : 0;
    card += $.rect(w.x - 3 * k, w.y - f.size * 0.08, (w.ww + extra) * part + 6 * k, f.size * 1.25, { r: 5 * k, fill: $.rgba(c.accent, 0.3) });
  });
  words.forEach(function (w) { card += $.text(w.w, Object.assign({}, f, { x: w.x, y: w.y, fill: c.fg })); });
  let s = M.part("card", { at: tin, in: "rise", distance: 30, out: "fade", box: { x: cx, y: cy, w: cw, h: ch } }, card);
  // The I-beam: in from below to the start, across with the selection, then up to the toolbar.
  const ws = words[i0], we = words[i1];
  const startPt = [ws.x, ws.y + f.size * 0.55], endPt = [we.x + we.ww, we.y + f.size * 0.55];
  let pos;
  if (t < t0) pos = glide($, t, tin + 0.2, t0 - 0.05, [W * 0.7, H * 0.95], startPt, 0.12);
  else if (t < t1) { const wi = Math.min(i1, Math.floor(reach - 0.001)), wd = words[Math.max(i0, wi)], part = Math.min(1, reach - wi); pos = [wd.x + wd.ww * part, wd.y + f.size * 0.55]; }
  else pos = endPt;
  // The toolbar over the selection once it is made.
  const actions = (p.actions || ["Copy", "Highlight", "Comment"]).map(String).slice(0, 4);
  const pressI = Math.max(0, Math.min(actions.length - 1, Math.round(p.press) - 1));
  if (t > t1 + 0.1) {
    const bf = { size: 26 * k, weight: 600 };
    const bw = actions.map(function (a) { return $.measure(a, bf) + 36 * k; });
    const tw = bw.reduce(function (a, b) { return a + b; }, 0) + 12 * k, th = 60 * k;
    // Above the card, centred over the selection, so it never covers a line of text.
    const tx = Math.max(A.x, Math.min(A.x + A.w - tw, (ws.x + endPt[0]) / 2 - tw / 2)), ty = cy - th - 16 * k;
    let tb = $.rect(tx, ty, tw, th, { r: 14 * k, fill: c.ink, shadow: "md" });
    let x = tx + 6 * k;
    const pressAt = t1 + 0.9;
    actions.forEach(function (a, i) {
      const lit = i === pressI && t > pressAt;
      if (lit) tb += $.rect(x, ty + 6 * k, bw[i], th - 12 * k, { r: 10 * k, fill: c.accent });
      tb += $.text(a, Object.assign({}, bf, { x: x + bw[i] / 2, y: ty + (th - bf.size) / 2 - 1 * k, anchor: "middle", fill: lit ? $.on(c.accent) : "#FFFFFF" }));
      if (i === pressI) pos = glide($, t, t1 + 0.3, pressAt - 0.05, endPt, [x + bw[i] / 2, ty + th / 2], 0.1);
      x += bw[i];
    });
    s += M.part("toolbar", { at: t1 + 0.1, in: "pop", out: "fade", box: { x: tx, y: ty, w: tw, h: th } }, tb);
    s += clickRings($, t, pressAt, pos[0], pos[1], c.accent, 30 * k);
  }
  // An I-beam over text, the arrow once it heads to the toolbar.
  const beam = t < t1 + 0.3
    ? $.path("M" + $.fx(pos[0] - 8 * k) + " " + $.fx(pos[1] - f.size * 0.7) + "H" + $.fx(pos[0] + 8 * k) + "M" + $.fx(pos[0]) + " " + $.fx(pos[1] - f.size * 0.7) + "V" + $.fx(pos[1] + f.size * 0.7) + "M" + $.fx(pos[0] - 8 * k) + " " + $.fx(pos[1] + f.size * 0.7) + "H" + $.fx(pos[0] + 8 * k), { stroke: c.ink, sw: 4 * k })
    : pointer($, pos[0], pos[1], 46 * k, {});
  return s + M.part("cursor", { at: tin + 0.2, in: "fade", dur: 0.2, out: "fade" }, beam);
}
