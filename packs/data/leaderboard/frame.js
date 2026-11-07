// A leaderboard: ranked rows slide in, each with its place, a coloured initials badge, the name, a bar and the
// score counting up, and how many places it moved; the leader gets a crown.
function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k;
  const tin = $.beat("in", 0.15);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = chartHead($, M, t, tin, p.title, A, k);
  s += head.s;
  const rows = (p.rows || []).slice(0, 10).slice().sort(function (a, b) { return (Number(b.score) || 0) - (Number(a.score) || 0); });
  const n = Math.max(1, rows.length);
  const avail = A.y + A.h - head.y;
  const rh = Math.min(avail / n, (A.tall ? 150 : 120) * k);
  const top = head.y + (avail - rh * n) / 2;
  const maxS = Math.max.apply(null, rows.map(function (r) { return Number(r.score) || 0; }).concat([1]));
  const nf = Object.assign({}, $.font("display"), { size: Math.min(44 * k, rh * 0.36) });
  const rf = Object.assign({}, $.font("mono"), { size: Math.min(36 * k, rh * 0.3), weight: 700 });
  const nameW = Math.min(A.w * 0.34, Math.max.apply(null, rows.map(function (r) { return $.measure(String(r.name), nf); })) + 20 * k);
  let out = "";
  rows.forEach(function (r, i) {
    const at = tin + 0.3 + i * 0.12, y = top + i * rh, mid = y + rh / 2;
    const lead = i === 0;
    let m = $.rect(A.x, y + rh * 0.08, A.w, rh * 0.84, { r: rh * 0.2, fill: lead ? $.rgba(c.accent, 0.12) : $.rgba(c.fg, 0.04) });
    m += $.text(String(i + 1), Object.assign({}, rf, { x: A.x + rh * 0.42, y: mid - rf.size * 0.55, anchor: "middle", fill: lead ? c.accent : c.mute }));
    const ar = rh * 0.28, ax = A.x + rh * 0.95;
    m += $.circle(ax, mid, ar, { fill: seriesColor($, i) });
    m += $.text(initials(String(r.name)), Object.assign({}, $.font("text"), { size: ar * 0.8, weight: 700, x: ax, y: mid - ar * 0.45, anchor: "middle", fill: $.on(seriesColor($, i)) }));
    if (lead) m += $.icon("crown", ax - ar * 0.6, mid - ar * 2.05, ar * 1.2, { color: c.accent, fill: true });
    const nx = ax + ar + 22 * k;
    m += $.text(String(r.name), Object.assign({}, nf, { x: nx, y: mid - nf.size * 0.55, fill: c.fg, maxW: nameW }));
    // The score bar and number, counting up together.
    const sc = Number(r.score) || 0, f = $.E.out3($.seg(t, at + 0.15, at + 1.1));
    const valW = $.measure(fmtNum(maxS, 0, "", p.suffix ? " " + p.suffix : ""), rf) + 24 * k;
    const chW = 64 * k;
    const bx = nx + nameW + 20 * k, bw = Math.max(0, A.x + A.w - valW - chW - 30 * k - bx);
    m += $.rect(bx, mid - rh * 0.07, bw, rh * 0.14, { r: rh * 0.07, fill: $.rgba(c.fg, 0.08) });
    m += $.rect(bx, mid - rh * 0.07, bw * (sc / maxS) * f, rh * 0.14, { r: rh * 0.07, fill: lead ? c.accent : $.mix(c.bg, c.accent, 0.55) });
    m += $.text(fmtNum(Math.round(sc * f), 0, "", p.suffix ? " " + p.suffix : ""), Object.assign({}, rf, { x: bx + bw + valW, y: mid - rf.size * 0.55, anchor: "end", fill: c.fg }));
    // Places moved since last time.
    const mv = Number(r.change) || 0;
    if (mv) {
      const up = mv > 0, col = up ? c.green : c.red, cx = A.x + A.w - chW / 2 - 6 * k, sz = rf.size * 0.42;
      m += $.path("M" + $.fx(cx - sz * 1.2) + " " + $.fx(mid + (up ? 0.2 : -0.2) * sz) + "L" + $.fx(cx - sz * 0.6) + " " + $.fx(mid + (up ? -0.7 : 0.7) * sz) + "L" + $.fx(cx) + " " + $.fx(mid + (up ? 0.2 : -0.2) * sz) + "Z", { fill: col });
      m += $.text(String(Math.abs(mv)), Object.assign({}, rf, { size: rf.size * 0.8, x: cx + sz * 0.4, y: mid - rf.size * 0.42, fill: col }));
    }
    out += M.part("rows", { at: at, in: "slide", from: "left", distance: 40, out: "fade", box: { x: A.x, y: y, w: A.w, h: rh } }, m);
  });
  return s + out;
}
