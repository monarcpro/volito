// Cards orbiting a title on a tilted ellipse: they pass behind the words and swing round in front, larger and
// brighter when near, each tilting a little with its path.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const n = Math.max(3, Math.min(10, Math.round(p.count)));
  const cards = cardsOf($, n);
  const cx = W / 2, cy = A.y + A.h / 2;
  const cw = Math.min(A.w * (A.tall ? 0.3 : 0.15), A.h * 0.22), ch = cw * 1.2;
  const rx = A.w * (A.tall ? 0.4 : 0.42) - cw * 0.3, ry = A.h / 2 - ch * 0.55;
  const speed = (Number(p.speed) || 1) * 0.35;
  const ang0 = (t - tin) * speed;
  const items = cards.map(function (cd, i) {
    const a = ang0 + (i / n) * 2 * Math.PI;
    const z = Math.sin(a);
    // Behind the title at the top of the orbit, in front of it at the bottom: clear of the words either way.
    return { cd: cd, x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), z: z, s: 0.55 + 0.45 * ((z + 1) / 2), r: -Math.cos(a) * 8 };
  });
  const draw = function (q) {
    const w = cw * q.s, h = ch * q.s;
    return $.g({ op: 0.45 + 0.55 * ((q.z + 1) / 2), transform: $.tf({ r: q.r, ox: q.x, oy: q.y }) }, cardAt($, t, q.cd, q.x - w / 2, q.y - h / 2, w, h, { r: 0.08 }));
  };
  const back = items.filter(function (q) { return q.z < 0; }).sort(function (a, b) { return a.z - b.z; }).map(draw).join("");
  const front = items.filter(function (q) { return q.z >= 0; }).sort(function (a, b) { return a.z - b.z; }).map(draw).join("");
  s += M.part("cards", { at: tin, in: "fade", dur: 0.5, out: "fade" }, back);
  // The title sits between the two halves of the orbit.
  const title = $.case(String(p.title || ""));
  if (title) {
    const tf = fitLines($, title, Object.assign({}, $.font("display"), { ls: -0.03 }), A.w * (A.tall ? 0.8 : 0.5), (A.tall ? 130 : 120) * k, 50 * k, 3);
    const top = cy - (tf.lines.length * tf.size * 1.04) / 2;
    tf.lines.forEach(function (l, i) { s += M.text("title", Object.assign({ at: tin + 0.15 + i * 0.08, in: "rise", distance: 30 }, tf.font, { x: cx, y: top + i * tf.size * 1.04, anchor: "middle", fill: c.fg, shadow: "sm" }), l); });
  }
  s += M.part("cards", { at: tin, in: "fade", dur: 0.5, out: "fade" }, front);
  return s;
}
