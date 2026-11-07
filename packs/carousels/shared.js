// MONARC Carousels — helpers this pack's items share. A card shows its picture when one is given
// (image1 … image8), else a designed tile in the brand's colours with its title.

/** The cards to show: the list's titles, each with its picture prop when that slot has one. */
function cardsOf($, n) {
  const list = ($.data.cards || []).map(function (r) { return typeof r === "string" ? { title: r } : r; });
  const out = [];
  const count = Math.max(1, n || list.length);
  for (let i = 0; i < count; i++) {
    const r = list[i % Math.max(1, list.length)] || { title: "" };
    const slot = "image" + ((i % 8) + 1);
    out.push({ title: String(r.title || ""), tag: String(r.tag || ""), image: $.data[slot] ? slot : "", i: i });
  }
  return out;
}

/** A tile colour for card i, from the brand: the accents, blends of them, and the text colour. */
function tileColor($, i) {
  const c = $.c;
  const list = [c.accent, c.accent2, $.mix(c.accent, c.accent2, 0.5), $.mix(c.accent, c.fg, 0.35), $.mix(c.accent2, c.fg, 0.3), $.mix(c.accent, c.bg, 0.35)];
  return list[i % list.length];
}

/** Text on a card that travels off the frame on purpose (a conveyor, a flow) is not "cut off". */
var ANYWHERE = { x: -1e5, y: -1e5, w: 2e5, h: 2e5 };

/** One card at (x, y, w, h): its picture, or a tile with a soft pattern, its number and title. o.loose: text may leave the frame. */
function cardAt($, t, card, x, y, w, h, o) {
  o = o || {};
  const within = o.loose ? { within: ANYWHERE } : {};
  const r = Math.min(w, h) * (o.r == null ? 0.08 : o.r);
  let m = "";
  if (card.image) {
    m += $.image(card.image, x, y, w, h, { r: r, fit: "cover" });
    if (card.title && o.caption !== false) {
      m += $.rect(x, y + h * 0.62, w, h * 0.38, { r: r, fill: $.gradient([[0, "#000000", 0], [1, "#000000", 0.6]], { angle: 180 }) });
      m += $.text(card.title, Object.assign({ x: x + w * 0.07, y: y + h - w * 0.07 - Math.min(w * 0.09, h * 0.1), size: Math.min(w * 0.09, h * 0.1), weight: 700, fill: "#FFFFFF", maxW: w * 0.86 }, within));
    }
  } else {
    const col = tileColor($, card.i), ink = $.on(col);
    m += $.rect(x, y, w, h, { r: r, fill: $.gradient([col, $.mix(col, ink === "#FFFFFF" || ink === $.c.paper ? "#000000" : "#FFFFFF", 0.18)], { angle: 135 }) });
    m += $.clip(x, y, w, h, r, $.pattern(t, card.i % 2 ? "dots" : "stripes", { box: { x: x, y: y, w: w, h: h }, color: ink, a: 0.1, scale: Math.max(0.4, w / 400) }));
    const num = (card.i + 1 < 10 ? "0" : "") + (card.i + 1);
    m += $.text(num, Object.assign({}, $.font("display"), { size: Math.min(w, h) * 0.34, x: x + w * 0.07, y: y + h * 0.06, fill: ink, op: 0.28 }, within));
    if (card.title && o.caption !== false) {
      const tf = fitFont($, card.title, "display", Math.min(w * 0.12, h * 0.12), w * 0.86, { ls: -0.02 });
      m += $.text(card.title, Object.assign({}, tf, { x: x + w * 0.07, y: y + h - w * 0.07 - tf.size, fill: ink }, within));
    }
  }
  if (o.stroke) m += $.rect(x, y, w, h, { r: r, stroke: o.stroke, sw: o.sw || 2 });
  return m;
}

/** A heading at the top of the safe area (or nothing): { s, y } with y below it. */
function headOf($, M, t, at, A) {
  const title = String($.data.title || "");
  if (!title) return { s: "", y: A.y };
  const tf = fitFont($, $.case(title), "display", (A.tall ? 92 : 80) * $.k, A.w, { ls: -0.03 });
  return { s: M.text("title", Object.assign({ at: at, in: "rise", distance: 26 }, tf, { x: $.W / 2, y: A.y, anchor: "middle", fill: $.c.fg }), $.case(title)), y: A.y + tf.size * 1.3 };
}

/** Position along a loop of n stops, with fast-slow-fast swings: each step eases, then holds `hold` of its slot. */
function swings(t, start, slot, hold) {
  const u = Math.max(0, t - start) / slot, k = Math.floor(u), f = u - k;
  const move = Math.min(1, f / (1 - hold));
  const e = move < 0.5 ? 4 * move * move * move : 1 - Math.pow(-2 * move + 2, 3) / 2;
  return k + e;
}
