// A conveyor of cards along a gentle S-curve across the frame: they glide in from one side, grow as they pass the
// middle, and leave on the other, on a loop.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = headOf($, M, t, tin, A);
  s += head.s;
  const n = Math.max(4, Math.min(12, Math.round(p.count)));
  const cards = cardsOf($, n);
  const vert = A.tall;
  const room = { x: A.x, y: head.y, w: A.w, h: A.y + A.h - head.y };
  const cw = vert ? room.w * 0.5 : Math.min(room.w * 0.2, room.h * 0.5), ch = cw * (vert ? 0.7 : 1.25);
  // The path: across the frame (down it on tall frames), bowing in a sine; u runs 0 … 1 along it.
  const P = function (u) {
    if (vert) return [W / 2 + Math.sin(u * Math.PI * 2) * room.w * 0.18, room.y - ch + u * (room.h + ch * 2)];
    return [room.x - cw + u * (room.w + cw * 2), room.y + room.h / 2 + Math.sin(u * Math.PI * 2) * room.h * 0.16];
  };
  const speed = (Number(p.speed) || 1) * 0.07;
  let out = [];
  cards.forEach(function (cd, i) {
    const u = (((i / n) + (t - tin) * speed) % 1 + 1) % 1;
    const mid = 1 - Math.min(1, Math.abs(u - 0.5) * 2);
    const sc = 0.62 + 0.38 * Math.pow(mid, 1.5);
    const q = P(u), q2 = P(Math.min(1, u + 0.01));
    const rot = Math.atan2(q2[1] - q[1], q2[0] - q[0]) * 180 / Math.PI * (vert ? 0 : 0.35);
    out.push({ z: mid, m: $.g({ transform: $.tf({ r: rot, ox: q[0], oy: q[1] }) }, cardAt($, t, cd, q[0] - (cw * sc) / 2, q[1] - (ch * sc) / 2, cw * sc, ch * sc, { r: 0.08, caption: mid > 0.55, loose: true })) });
  });
  out.sort(function (a, b) { return a.z - b.z; });
  const trail = [];
  for (let i = 0; i <= 40; i++) trail.push(P(i / 40));
  s += M.part("path", { at: tin, in: "fade", dur: 0.6, out: "fade", vary: false }, $.path($.smooth(trail), { stroke: $.rgba(c.fg, 0.1), sw: 3 * k, dash: 10 * k + " " + 12 * k }));
  s += M.part("cards", { at: tin + 0.1, in: "fade", dur: 0.5, out: "fade" }, out.map(function (o) { return o.m; }).join(""));
  return s;
}
