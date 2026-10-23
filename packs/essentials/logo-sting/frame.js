function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const word = $.case(p.wordmark);
  const wf = fitFont($, word, "display", Math.min(220 * k, A.h * 0.26), A.w * 0.86, { ls: 0.02 });
  const tag = p.tagline ? String(p.tagline).toUpperCase() : "";
  const tfnt = fitFont($, tag, "mono", 30 * k, A.w * 0.8, { ls: 0.32 });
  const logo = p.logo ? Math.min(220 * k, A.h * 0.22) : 0;
  const total = logo + (logo ? 50 * k : 0) + wf.size + (tag ? 40 * k + tfnt.size : 0);
  const cx = W / 2, cy = H / 2;
  let y = cy - total / 2;
  const tWord = tin + (logo ? 0.55 : 0.3);
  const leave = { out: "push", intensity: 0.06 };

  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H }, glow: [cx, cy] }));
  if (p.burst) {
    let rings = "";
    for (let i = 0; i < 3; i++) {
      const a = tin + i * 0.12;
      const q = $.E.out3($.seg(t, a, a + 0.9));
      if (q > 0 && q < 1) rings += $.circle(cx, cy, (60 + 700 * q) * k, { stroke: i === 1 ? c.accent2 : c.accent, sw: (14 - i * 3) * k * (1 - q), op: 1 - q });
    }
    rings += $.burst(t, tWord, cx, cy, { n: 18, r: Math.max(W, H) * 0.32, colors: [c.accent, c.accent2, c.fg], size: 10 * k });
    s += M.part("rings", { at: tin, in: "none", out: "fade", vary: false }, rings);
  }
  if (logo) {
    s += M.part("logo", Object.assign({ at: tin + 0.15, in: "pop", box: { x: cx - logo / 2, y: y, w: logo, h: logo } }, leave), $.image("logo", cx - logo / 2, y, logo, logo, { fit: "contain" }));
    y += logo + 50 * k;
  }
  const ww = $.measure(word, wf);
  // The wordmark lands letter by letter (word by word in scripts that join), then a light sweeps across it.
  s += M.text("wordmark", Object.assign({ at: tWord, in: "rise", split: "letters", distance: wf.size * 0.6 / k, ease: "spring(2.4, 7)", stagger: Math.min(0.06, 0.5 / Math.max(1, word.length)) }, leave, wf, { x: cx, y: y, anchor: "middle" }), word);
  const sweep = $.seg(t, tWord + 0.5, tWord + 1.2);
  if (sweep > 0 && sweep < 1) {
    const sx = cx - ww / 2 - 200 * k + (ww + 400 * k) * $.E.inOut2(sweep);
    s += $.g({ extra: 'style="mix-blend-mode:screen"' }, $.clip(cx - ww / 2 - 20 * k, y - 10 * k, ww + 40 * k, wf.size * 1.1, 0,
      $.rect(sx - 60 * k, y - 20 * k, 120 * k, wf.size * 1.3, { fill: $.gradient([[0, "#FFFFFF", 0], [0.5, "#FFFFFF", 0.55], [1, "#FFFFFF", 0]], { angle: 90 }), transform: "translate(" + $.fx(sx) + " " + $.fx(y + wf.size / 2) + ") skewX(-18) translate(" + $.fx(-sx) + " " + $.fx(-(y + wf.size / 2)) + ")" })));
  }
  y += wf.size + 40 * k;
  if (tag) {
    // The tagline spaces out as it fades in.
    const tp = M.progress("tagline", { at: tWord + 0.45, in: "fade", dur: 0.65, ease: "out" });
    s += M.text("tagline", Object.assign({ at: tWord + 0.45, in: "fade", dur: 0.65, ease: "out" }, leave, tfnt, { x: cx, y: y, anchor: "middle", fill: c.mute, ls: 0.14 + 0.18 * Math.min(1, tp.in) }), tag);
  }
  return s;
}
