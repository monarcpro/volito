// Drag and drop: the cursor picks up a file card (it lifts, with a deeper shadow), carries it along a curve to a
// dashed drop zone that lights up as it arrives, lets go — the card settles in and the zone confirms.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const from = at$($, p.fromX, p.fromY), to = at$($, p.toX, p.toY);
  const cw = 440 * k, ch = 118 * k, ps = 50 * k;
  // The zone: a dashed panel round the target.
  const zw = cw * 1.35, zh = ch * 2.1, zx = to[0] - zw / 2, zy = to[1] - zh / 2;
  const grab = tin + 0.9, drop = grab + 1.3;
  const near = $.clamp((t - (drop - 0.5)) / 0.4), landed = t > drop;
  let zone = $.rect(zx, zy, zw, zh, { r: 24 * k, fill: landed ? $.rgba(c.green, 0.12) : $.rgba(c.accent, 0.06 + 0.12 * near), stroke: landed ? c.green : near > 0 ? c.accent : c.line, sw: 3 * k, dash: 14 * k + " " + 10 * k });
  const zf = { size: 30 * k, weight: 600 };
  const zText = landed ? String(p.done || "Uploaded") : String(p.zone || "Drop to upload");
  zone += $.icon(landed ? "check" : "upload", to[0] - 22 * k, zy + zh - 112 * k, 44 * k, { color: landed ? c.green : c.mute, sw: 2.4 });
  zone += $.text(zText, Object.assign({}, zf, { x: to[0], y: zy + zh - 58 * k, anchor: "middle", fill: landed ? c.green : c.mute }));
  let s = M.part("zone", { at: tin, in: "fade", dur: 0.4, out: "fade" }, zone);
  // The card: at rest at `from`, then carried; it settles into the top of the zone when dropped.
  const cardAtPos = t < grab ? from : t < drop ? glide($, t, grab + 0.1, drop - 0.05, from, [to[0], zy + ch * 0.62], -0.22) : [to[0], zy + ch * 0.62 + (1 - $.E.outBack($.seg(t, drop, drop + 0.3))) * -10 * k];
  const lifted = t >= grab && t < drop ? $.E.out3($.seg(t, grab, grab + 0.2)) : t >= drop ? 1 - $.E.out3($.seg(t, drop, drop + 0.25)) : 0;
  const sc = 1 + 0.05 * lifted, tilt = -3 * lifted;
  let card = $.rect(-cw / 2, -ch / 2, cw, ch, { r: 18 * k, fill: c.surface, stroke: c.line, sw: 1.5 * k, shadow: lifted > 0.3 ? "lg" : "md" });
  card += $.rect(-cw / 2 + 22 * k, -ch / 2 + 22 * k, ch - 44 * k, ch - 44 * k, { r: 12 * k, fill: c.accent });
  card += $.icon("video", -cw / 2 + 22 * k + (ch - 44 * k) * 0.22, -ch / 2 + 22 * k + (ch - 44 * k) * 0.22, (ch - 44 * k) * 0.56, { color: $.on(c.accent), sw: 2.4 });
  const nf = fitFont($, String(p.file || ""), "text", 30 * k, cw - ch - 30 * k, { weight: 700 });
  // The card is drawn round its own centre and moved into place, so its text is placed relative to it.
  const local = { within: { x: -1e5, y: -1e5, w: 2e5, h: 2e5 } };
  card += $.text(String(p.file || ""), Object.assign({}, nf, { x: -cw / 2 + ch, y: -ch / 2 + 26 * k, fill: c.fg }, local));
  card += $.text(String(p.size || ""), Object.assign({ size: 24 * k, weight: 500, x: -cw / 2 + ch, y: -ch / 2 + 26 * k + nf.size * 1.4, fill: c.mute }, local));
  s += M.part("card", { at: tin + 0.1, in: "pop", out: "fade", box: { x: from[0] - cw / 2, y: from[1] - ch / 2, w: cw, h: ch } }, $.g({ transform: "translate(" + $.fx(cardAtPos[0]) + " " + $.fx(cardAtPos[1]) + ") rotate(" + $.fx(tilt) + ") scale(" + $.fx(sc) + ")" }, card));
  // The cursor: in to the card, holds it while carrying, then away a little after the drop.
  const grip = [cw * 0.18, ch * 0.05];
  const start = at$($, 50, 96);
  let cur;
  if (t < grab) cur = glide($, t, tin + 0.2, grab - 0.05, start, [from[0] + grip[0], from[1] + grip[1]], 0.15);
  else if (t < drop + 0.1) cur = [cardAtPos[0] + grip[0], cardAtPos[1] + grip[1]];
  else cur = glide($, t, drop + 0.25, drop + 0.9, [cardAtPos[0] + grip[0], cardAtPos[1] + grip[1]], [cardAtPos[0] + cw * 0.5, cardAtPos[1] + ch * 1.4], 0.1);
  const holding = t >= grab && t < drop ? 1 : 0;
  s += M.part("cursor", { at: tin + 0.2, in: "fade", dur: 0.2, out: "fade" }, clickRings($, t, grab, cur[0], cur[1], c.accent, 34 * k) + pointer($, cur[0], cur[1], ps, { press: holding * 0.8 + $.bump(t, grab, 0.05, 0.12) }));
  return s;
}
