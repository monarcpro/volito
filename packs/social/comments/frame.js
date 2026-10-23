function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.3 : 1.12);
  const tin = $.beat("in", 0.2);
  const rows = p.items || [];
  const w = Math.min(A.w, A.wide ? 700 * k : A.w);
  const pad = 24 * k, av = 30 * k;
  const nf = { ...$.font("display"), size: 26 * k };
  const tf = { ...$.font("text"), size: 28 * k, lh: 1.3 };
  const meta = { ...$.font("text"), size: 22 * k };
  // Heights first, so the stack can sit at the bottom of the safe area.
  const cards = rows.map(function (r, i) {
    const lines = $.wrap(String(r.text), w - pad * 2 - av * 2 - 20 * k, tf).slice(0, 3);
    return { r: r, lines: lines, h: pad * 2 + nf.size * 1.3 + lines.length * tf.size * 1.3 + meta.size * 1.4, at: tin + i * p.gap };
  });
  const gap = 16 * k;
  const total = cards.reduce(function (a, c2) { return a + c2.h; }, 0) + gap * Math.max(0, cards.length - 1);
  const x = A.wide ? A.x : (W - w) / 2;
  let y = A.wide ? A.y + A.h - total : A.y + A.h * 0.55 - total / 2;
  let s = "";
  cards.forEach(function (cd, i) {
    const r = cd.r;
    let b = $.rect(x, y, w, cd.h, { r: 24 * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: "md" });
    b += avatar($, null, x + pad + av, y + pad + av, av, { name: r.name, fill: nameColor($, r.name) });
    const tx = x + pad + av * 2 + 18 * k;
    b += $.text(String(r.name), { ...nf, x: tx, y: y + pad, fill: c.fg });
    b += $.text((i + 1) * 2 + "m", { ...meta, x: tx + $.measure(String(r.name), nf) + 14 * k, y: y + pad + 3 * k, fill: c.mute });
    // The words type on, line by line.
    let left = Math.max(0, Math.floor((t - cd.at - 0.25) * 42));
    cd.lines.forEach(function (l, j) {
      const n = Math.min(Array.from(l).length, left);
      left -= n;
      if (n > 0) b += $.text(Array.from(l).slice(0, n).join(""), { ...tf, x: tx, y: y + pad + nf.size * 1.35 + j * tf.size * 1.3, fill: c.fg });
    });
    const ly = y + cd.h - pad - meta.size * 0.9;
    const likes = i === 0 ? $.count(Math.round(p.likes * $.E.out3($.seg(t, cd.at + 0.6, cd.at + 1.6)))) : String(Math.round(p.likes / (6 + i * 5)));
    b += $.icon("heart", tx, ly - 2 * k, meta.size * 1.05, { color: i === 0 && t > cd.at + 0.6 ? c.red : c.mute, fill: i === 0 && t > cd.at + 0.6 });
    b += $.text(likes, { ...meta, x: tx + meta.size * 1.5, y: ly, fill: c.mute });
    b += $.text("Reply", { ...meta, x: tx + meta.size * 5.5, y: ly, fill: c.mute });
    s += M.part("items", { at: cd.at, in: "rise", distance: 40, ease: "bouncy", out: "fade", box: { x: x, y: y, w: w, h: cd.h } }, b);
    y += cd.h + gap;
  });
  return s;
}
