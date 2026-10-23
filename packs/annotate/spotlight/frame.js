function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  let s = "";
  const b = boxOf($, p.x, p.y, p.w, p.h);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const e = $.E.inOut3($.seg(t, tin, tin + 0.9));
  const circ = p.shape !== "box";
  const rx1 = circ ? b.w * 0.62 + 18 * k : b.w / 2 + 18 * k, ry1 = circ ? b.h * 0.62 + 18 * k : b.h / 2 + 18 * k;
  const rx = $.lerp(Math.hypot(W, H), rx1, e), ry = $.lerp(Math.hypot(W, H), ry1, e);
  const rr = circ ? 0 : Math.min(rx, ry, 28 * k);
  const hole = circ
    ? "M" + (cx + rx) + " " + cy + "A" + rx + " " + ry + " 0 1 0 " + (cx - rx) + " " + cy + "A" + rx + " " + ry + " 0 1 0 " + (cx + rx) + " " + cy + "Z"
    : "M" + (cx - rx + rr) + " " + (cy - ry) + "H" + (cx + rx - rr) + "Q" + (cx + rx) + " " + (cy - ry) + " " + (cx + rx) + " " + (cy - ry + rr) + "V" + (cy + ry - rr) + "Q" + (cx + rx) + " " + (cy + ry) + " " + (cx + rx - rr) + " " + (cy + ry) + "H" + (cx - rx + rr) + "Q" + (cx - rx) + " " + (cy + ry) + " " + (cx - rx) + " " + (cy + ry - rr) + "V" + (cy - ry + rr) + "Q" + (cx - rx) + " " + (cy - ry) + " " + (cx - rx + rr) + " " + (cy - ry) + "Z";
  const fid = $.uid("fb"), m = 80 * k;
  $.def('<filter id="' + fid + '" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="' + 16 * k + '"/></filter>');
  s += M.part("dim", { at: tin, in: "fade", dur: 0.4, vary: false }, $.path("M" + -m + " " + -m + "H" + (W + m) + "V" + (H + m) + "H" + -m + "Z" + hole, { fill: "rgba(0,0,0," + p.dim / 100 + ")", extra: 'fill-rule="evenodd" filter="url(#' + fid + ')"' }));
  const ringP = $.E.inOut2($.seg(t, tin + 0.8, tin + 1.3));
  if (ringP > 0) s += M.part("ring", { at: tin + 0.8, in: "none" }, $.path(hole, { stroke: col, sw: 5 * k, draw: ringP }));
  if (p.label) {
    const below = cy + ry1 + 150 * k < H;
    const ly = below ? cy + ry1 + 30 * k : cy - ry1 - 30 * k - 56 * k;
    const tg = tagAt($, p.label, cx, ly + 28 * k, col, 40);
    let lab = tg.markup;
    if (p.note) {
      const nf = Object.assign({}, $.font("text"), { size: 32 * k });
      const nw = Math.min(W * 0.8, $.measure(p.note, nf));
      const nx = Math.min(W - 30 * k - nw / 2, Math.max(30 * k + nw / 2, cx));
      lab += $.text(p.note, Object.assign({}, nf, { x: nx, y: below ? tg.box.y + tg.box.h + 16 * k : tg.box.y - 16 * k - 40 * k, anchor: "middle", fill: "#FFFFFF", maxW: W * 0.8 }));
    }
    s += M.part("label", { at: tin + 1.0, in: "rise", distance: 16, box: tg.box }, lab);
  }
  return s;
}
