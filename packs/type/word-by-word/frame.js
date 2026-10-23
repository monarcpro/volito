function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.2);
  let s = ground(M, $, t);
  const ws = markedWords($.case(p.text));
  if (!ws.length) return s;
  const pace = Math.max(0.15, Math.min(p.pace, (M.outAt - tin) / ws.length));
  const i = $.clamp(Math.floor((t - tin) / pace), 0, ws.length - 1), loc = t - tin - i * pace;
  if (t < tin) return s;
  const w = ws[i], grounds = [null, c.accent, c.fg, null, c.accent2];
  const g = w.marked ? c.accent : grounds[i % grounds.length];
  let fr = g ? $.rect(0, 0, W, H, { fill: g }) : "";
  const ink = g ? $.on(g) : c.fg;
  const font = w.marked ? Object.assign({}, $.font("accent")) : Object.assign({}, $.font("display"), { ls: -0.035 });
  const f = fitFont($, w.word, w.marked ? "accent" : "display", Math.min(A.h * 0.5, (w.marked ? 340 : 280) * k), A.w * 0.94, { ls: w.marked ? -0.01 : -0.035 });
  const pop = 1 + 0.22 * (1 - $.E.out3($.clamp(loc / 0.14))), rot = (i % 2 ? 1 : -1) * 2.5 * (1 - $.E.out3($.clamp(loc / 0.2)));
  fr += '<g transform="translate(' + W / 2 + " " + H / 2 + ") rotate(" + rot + ") scale(" + pop + ") translate(" + -W / 2 + " " + -H / 2 + ')">' + $.text(w.word, Object.assign({}, f, { x: W / 2, y: H / 2 - f.size * 0.56, anchor: "middle", fill: ink })) + "</g>";
  s += M.part("words", { at: tin, in: "none" }, fr);
  return s;
}
