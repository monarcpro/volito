// A cover flow: the card in the middle faces you, the ones either side lean away in a stack, and the row steps
// along one card at a time, with a soft reflection on the floor and the centre card's title under it.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const head = headOf($, M, t, tin, A);
  s += head.s;
  const n = Math.max(3, Math.min(12, Math.round(p.count)));
  const cards = cardsOf($, n);
  const capH = 80 * k;
  const room = { y: head.y, h: A.y + A.h - head.y - capH };
  const cw = Math.min(A.w * (A.tall ? 0.6 : 0.3), room.h * 0.62), ch = cw;
  const cx = W / 2, cy = room.y + room.h * 0.42;
  const slot = Math.max(0.6, Number(p.pace) || 1.2);
  const pos = swings(t, tin + 0.6, slot, 0.5) % n;
  const items = cards.map(function (cd, i) {
    let d = i - pos;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return { cd: cd, d: d };
  }).filter(function (q) { return Math.abs(q.d) < (A.tall ? 2.6 : 4.2); }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
  const gap = cw * 0.32;
  let row = "";
  items.forEach(function (q) {
    const a = Math.max(-1, Math.min(1, q.d));
    // Off centre a card is squeezed (it turns away) and sheared, and stacked closer the further out it is.
    const x = cx + (Math.abs(q.d) <= 1 ? q.d * (cw * 0.62) : Math.sign(q.d) * (cw * 0.62 + (Math.abs(q.d) - 1) * gap));
    const sx = 1 - 0.55 * Math.abs(a), sk = -a * 18, sc = 1 - 0.12 * Math.abs(a);
    const w = cw, h = ch;
    const card = cardAt($, t, q.cd, -w / 2, -h / 2, w, h, { r: 0.04, caption: false, loose: true });
    const flip = '<g transform="translate(0 ' + $.fx(h * 1.02) + ') scale(1 -1) translate(0 ' + $.fx(-h * 0.0) + ')" opacity="0.18">' + card + "</g>";
    row += '<g transform="translate(' + $.fx(x) + " " + $.fx(cy) + ") scale(" + $.fx(sx * sc) + " " + $.fx(sc) + ") skewY(" + $.fx(sk) + ')">' + flip + card + "</g>";
  });
  // A floor fade over the reflections.
  row += $.rect(0, cy + ch / 2, W, ch * 0.8, { fill: $.gradient([[0, c.bg, 0], [0.5, c.bg, 0.85], [1, c.bg, 1]], { angle: 180 }) });
  s += M.part("row", { at: tin + 0.2, in: "fade", dur: 0.5, out: "fade" }, row);
  const front = cards[((Math.round(pos) % n) + n) % n];
  const settle = 1 - Math.abs(pos - Math.round(pos)) * 2;
  if (front.title) {
    const lf = fitFont($, $.case(front.title), "display", 50 * k, A.w, { ls: -0.02 });
    s += $.text($.case(front.title), Object.assign({}, lf, { x: cx, y: room.y + room.h + 6 * k, anchor: "middle", fill: c.fg, op: $.clamp(settle) * $.fadeIn(t, tin + 0.8, 0.3) }));
    if (front.tag) s += $.text(front.tag, Object.assign({}, $.font("mono"), { size: 24 * k, x: cx, y: room.y + room.h + 6 * k + lf.size * 1.2, anchor: "middle", fill: c.mute, op: $.clamp(settle) }));
  }
  return s;
}
