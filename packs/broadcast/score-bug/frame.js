function frame(t, $) {
  const p = $.data, c = $.c, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const k = $.k * (A.tall ? 1.3 : 1.15);
  const tin = $.beat("in", 0.1);
  const rowH = 56 * k, sw = 12 * k;
  const nf = { ...$.font("display"), size: 30 * k, ls: 0.04 };
  const sf = { ...$.font("mono"), size: 32 * k, weight: 700 };
  const teamW = Math.max($.measure("WWW", nf), $.measure(String(p.home).toUpperCase(), nf), $.measure(String(p.away).toUpperCase(), nf)) + 30 * k;
  const scoreW = $.measure("888", sf) + 24 * k;
  const w = sw + teamW + scoreW;
  const clockW = $.measure("888:88", sf) + 30 * k;
  const x = A.x, y = A.y;
  const scored = p.goal !== "none" && t >= p.goalAt;
  const hs = p.homeScore + (scored && p.goal === "home" ? 1 : 0), as = p.awayScore + (scored && p.goal === "away" ? 1 : 0);
  const flash = p.goal !== "none" ? $.bump(t, p.goalAt, 0.05, 0.6) : 0;
  // The clock: mm:ss running up or down from its start, or held.
  const m = /^(\d+):(\d\d)$/.exec(String(p.clock || "0:00"));
  let secs = m ? Number(m[1]) * 60 + Number(m[2]) : 0;
  const ran = Math.floor(Math.max(0, t - tin));
  secs = p.clockRuns === "up" ? secs + ran : p.clockRuns === "down" ? Math.max(0, secs - ran) : secs;
  const clock = Math.floor(secs / 60) + ":" + (secs % 60 < 10 ? "0" : "") + (secs % 60);
  const leave = { out: "slide", outFrom: "left", distance: 30 };
  let s = M.part("bug", Object.assign({ at: tin, in: "wipe", from: "left", dur: 0.4, ease: "expo", box: { x: x, y: y, w: w + clockW, h: rowH * 2 } }, leave),
    $.rect(x, y, w, rowH * 2, { fill: c.ink, shadow: "md" }), $.rect(x + w, y, clockW, rowH * 2, { fill: c.surface }));
  const row = function (name, team, score, col, ry, hit) {
    return M.part(name, Object.assign({ at: tin + (name === "home" ? 0.2 : 0.3), in: "slide", from: "left", distance: 20, box: { x: x, y: ry, w: w, h: rowH } }, leave),
      $.rect(x, ry, sw, rowH, { fill: col }),
      $.text(String(team).toUpperCase(), { ...nf, x: x + sw + 16 * k, y: ry + (rowH - nf.size) / 2 - nf.size * 0.03, fill: "#FFFFFF" }),
      hit > 0.01 ? $.rect(x + sw + teamW, ry, scoreW, rowH, { fill: col, op: hit * 0.9 }) : "",
      $.g({ transform: $.tf({ s: 1 + 0.35 * hit, ox: x + sw + teamW + scoreW / 2, oy: ry + rowH / 2 }) }, $.text(String(score), { ...sf, x: x + sw + teamW + scoreW / 2, y: ry + (rowH - sf.size) / 2 - sf.size * 0.05, anchor: "middle", fill: "#FFFFFF" })));
  };
  s += row("home", p.home, hs, p.homeColor, y, p.goal === "home" ? flash : 0);
  s += row("away", p.away, as, p.awayColor, y + rowH, p.goal === "away" ? flash : 0);
  s += M.part("clock", Object.assign({ at: tin + 0.4, in: "fade", dur: 0.3, box: { x: x + w, y: y, w: clockW, h: rowH * 2 } }, leave),
    $.text(String(p.period || "").toUpperCase(), { ...$.font("mono"), size: 22 * k, ls: 0.12, x: x + w + clockW / 2, y: y + rowH * 0.42, anchor: "middle", fill: c.mute }),
    $.text(clock, { ...sf, x: x + w + clockW / 2, y: y + rowH * 1.02, anchor: "middle", fill: c.fg }));
  return s;
}
