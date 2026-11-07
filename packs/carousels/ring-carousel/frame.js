// Cards round a ring seen from just above: the ring swings one card at a time, fast then slow, cards shrink and
// fade as they go round the back, and the one in front is named underneath.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = headOf($, M, t, tin, A);
  s += head.s;
  const n = Math.max(4, Math.min(16, Math.round(p.count)));
  const cards = cardsOf($, n);
  const capH = 80 * k;
  const room = { x: A.x, y: head.y, w: A.w, h: A.y + A.h - head.y - capH };
  const cw = Math.min(room.w * (A.tall ? 0.32 : 0.2), room.h * 0.4), ch = cw * 1.25;
  const R = Math.min(room.w / 2 - cw * 0.4, room.w * 0.4);
  // Seen from above: the ring's back rises as far as the room allows, so it reads as a ring, not a row.
  const tilt = Math.max(0.12, Math.min(0.42, (room.h - ch * 1.05) / (2 * R)));
  const cx = W / 2, cy = room.y + (room.h - ch * 1.05) / 2 + ch * 0.55;
  // The ring turns one card per `slot` seconds with eased swings.
  const slot = Math.max(0.6, Number(p.pace) || 1.1);
  const pos = swings(t, tin + 0.6, slot, 0.45) * (p.direction === "left" ? -1 : 1);
  const list = cards.map(function (cd, i) {
    const a = ((i - pos) / n) * 2 * Math.PI;
    const z = Math.cos(a);
    return { cd: cd, a: a, z: z, x: cx + R * Math.sin(a), y: cy + R * tilt * z, s: 0.42 + 0.58 * ((z + 1) / 2) };
  }).sort(function (a, b) { return a.z - b.z; });
  let ring = $.circle(cx, cy + R * tilt * 0.25, R * 1.02, { stroke: $.rgba(c.fg, 0.08), sw: 2 * k, transform: "translate(" + cx + " " + cy + ") scale(1 " + tilt + ") translate(" + -cx + " " + -cy + ")" });
  list.forEach(function (q, j) {
    const w = cw * q.s, h = ch * q.s, op = 0.35 + 0.65 * ((q.z + 1) / 2);
    const lift = 1 - Math.max(0, q.z);
    ring += $.g({ op: op }, cardAt($, t, q.cd, q.x - w / 2, q.y - h / 2, w, h, { caption: q.z > 0.6, r: 0.07 }) + (q.z > 0.95 ? "" : $.rect(q.x - w / 2, q.y - h / 2, w, h, { r: Math.min(w, h) * 0.07, fill: c.bg, op: lift * 0.25 })));
  });
  s += M.part("ring", { at: tin + 0.2, in: "pop", out: "fade", box: { x: cx - R - cw / 2, y: cy - ch, w: 2 * R + cw, h: ch * 2 } }, ring);
  // The front card's name, swapping as it settles.
  const front = cards[((Math.round(pos) % n) + n) % n];
  const settle = 1 - Math.abs(pos - Math.round(pos)) * 2;
  if (front.title) {
    const lf = fitFont($, $.case(front.title), "display", 48 * k, A.w, { ls: -0.02 });
    // Under the front card (which sits at the ring's near edge).
    s += $.text($.case(front.title), Object.assign({}, lf, { x: cx, y: Math.min(cy + R * tilt + ch / 2 + 20 * k, A.y + A.h - lf.size), anchor: "middle", fill: c.fg, op: $.clamp(settle) * $.fadeIn(t, tin + 0.8, 0.3) }));
  }
  return s;
}
