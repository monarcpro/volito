function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($), M = motion($, t);
  const tin = $.beat("in", 0.2);
  let s = ground(M, $, t);
  const lead = $.case(p.lead), end = p.end ? $.case(p.end) : "";
  const words = (p.words || []).map(function (w) { return $.case(String(w)); }).filter(Boolean);
  if (!words.length) words.push("…");
  const tall = A.tall || A.square;
  const base = Object.assign({}, $.font("display"), { ls: -0.03 });
  const pad = 0.28;
  const wid = function (sz, str) { return $.measure(str, Object.assign({}, base, { size: sz })); };
  // One size for every word: the widest must fit with the lead (side by side on wide frames, stacked on tall).
  const widestWord = words.reduce(function (a, w) { return wid(100, w) > wid(100, a) ? w : a; }, words[0]);
  const row = function (sz) { return tall ? Math.max(wid(sz, lead), wid(sz, widestWord) + sz * pad * 2, end ? wid(sz, end) : 0) : wid(sz, lead) + sz * 0.3 + wid(sz, widestWord) + sz * pad * 2 + (end ? sz * 0.3 + wid(sz, end) : 0); };
  let size = Math.min(150 * k, A.h * (tall ? 0.16 : 0.28));
  if (row(size) > A.w * 0.94) size *= (A.w * 0.94) / row(size);
  const f = Object.assign({}, base, { size: size });
  const per = Math.max(0.6, (M.outAt - tin - 0.3) / words.length);
  const rel = t - tin - 0.3, idx = $.clamp(Math.floor(rel / per), 0, words.length - 1), loc = rel - idx * per;
  const sw = $.E.out3($.clamp(loc / 0.4)), cur = words[idx], prev = idx > 0 ? words[idx - 1] : null;
  const bwOf = function (w) { return wid(size, w) + size * pad * 2; };
  const bw = prev && idx > 0 ? $.lerp(bwOf(prev), bwOf(cur), sw) : bwOf(cur), bh = size * 1.32;
  const lw = wid(size, lead), ew = end ? wid(size, end) : 0, gap = size * 0.3;
  let lx, bx, ex, ly, by;
  if (tall) {
    const h = bh * 2.1 + (end ? size * 1.15 : 0);
    ly = H / 2 - h / 2; by = ly + size * 1.25;
    lx = W / 2 - lw / 2; bx = W / 2 - bw / 2; ex = W / 2 - ew / 2;
  } else {
    const total = lw + gap + bw + (end ? gap + ew : 0);
    lx = W / 2 - total / 2; bx = lx + lw + gap; ex = bx + bw + gap;
    by = H / 2 - bh / 2; ly = by + (bh - size) / 2 - size * 0.04;
  }
  s += M.text("lead", Object.assign({ at: tin, in: "rise" }, f, { x: lx, y: ly, fill: c.fg }), lead);
  if (end) s += M.text("lead", Object.assign({ at: tin, in: "rise" }, f, { x: ex, y: tall ? by + bh + size * 0.1 : ly, fill: c.fg }), end);
  // The words roll through the box: the old one up and out, the new one up from below.
  const ty = by + (bh - size) / 2 - size * 0.04, roll = bh;
  let inner = $.text(cur, Object.assign({}, f, { x: bx + bw / 2, y: ty + (idx > 0 ? (1 - sw) * roll : 0), anchor: "middle", fill: $.on(c.accent) }));
  if (prev && sw < 1) inner += $.text(prev, Object.assign({}, f, { x: bx + bw / 2, y: ty - sw * roll, anchor: "middle", fill: $.on(c.accent) }));
  s += M.part("box", { at: tin + 0.2, in: "pop", box: { x: bx, y: by, w: bw, h: bh } }, $.rect(bx, by, bw, bh, { r: Math.min($.style.radius, bh / 2), fill: c.accent }) + $.clip(bx, by, bw, bh, 0, inner));
  return s;
}
