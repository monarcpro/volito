// A headline split into tiles that flip one after another in a diagonal sweep, each turning over to show its slice
// of the second headline — lifting a little as the sweep passes, shaded as it turns edge-on.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.15);
  let s = ground(M, $, t);
  const front = $.case(String(p.front || "")), rear = $.case(String(p.rear || ""));
  const longest = front.length > rear.length ? front : rear;
  const f = fitFont($, longest, "display", (A.tall ? 230 : 260) * k, A.w * 0.9, { ls: -0.03 });
  const bw = Math.max($.measure(front, f), $.measure(rear, f)) + f.size * 0.5, bh = f.size * 1.3;
  const bx = W / 2 - bw / 2, by = A.y + (A.h - bh) / 2;
  const cols = Math.max(4, Math.min(24, Math.round(Number(p.tiles) || 12))), rows = Math.max(2, Math.round(cols * (bh / bw) * 1.6));
  const tw = bw / cols, th = bh / rows;
  const rearBg = p.rearColor === "same" ? c.bg : c.accent, rearInk = p.rearColor === "same" ? c.fg : $.on(c.accent);
  // The sweep: a diagonal front that travels across the block; each tile turns over 0.45 s as it passes.
  const t0 = tin + 0.8, run = Math.max(0.6, Number(p.sweep) || 1.4), turn = 0.45;
  // The front is just the letters (blank tiles turn away unseen); the rear is a solid block with its letters.
  const face = function (str, bg, ink) { return (bg ? $.rect(bx, by, bw, bh, { fill: bg }) : "") + $.text(str, Object.assign({}, f, { x: W / 2, y: by + (bh - f.size) / 2 - f.size * 0.02, anchor: "middle", fill: ink })); };
  const frontFace = face(front, "", c.fg), rearFace = face(rear, p.rearColor === "same" ? "" : rearBg, rearInk);
  let tiles = "";
  // Every tile turned: the rear in one piece, with no seams between tiles.
  if (t >= t0 + run + turn) return s + M.part("tiles", { at: tin, in: "fade", dur: 0.4, out: "fade", box: { x: bx, y: by, w: bw, h: bh } }, rearFace);
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const d = (q / cols) * 0.75 + (r / rows) * 0.25;
      const u = $.clamp((t - t0 - d * run) / turn);
      const ang = u * Math.PI, sy = Math.abs(Math.cos(ang)), back = u > 0.5;
      const x = bx + q * tw, y = by + r * th, cx = x + tw / 2, cy = y + th / 2;
      const lift = 1 + 0.06 * Math.sin(ang);
      const id = $.uid();
      $.def('<clipPath id="' + id + '"><rect x="' + $.fx(x) + '" y="' + $.fx(y) + '" width="' + $.fx(tw + 0.6) + '" height="' + $.fx(th + 0.6) + '"/></clipPath>');
      let tile = '<g clip-path="url(#' + id + ')">' + (back ? rearFace : frontFace) + "</g>";
      // The rear block darkens as it turns edge-on (the front is only letters, so it simply narrows away).
      if (u > 0.5 && u < 1 && p.rearColor !== "same") tile += $.rect(x, y, tw, th, { fill: "#000000", op: 0.3 * (1 - sy) });
      tiles += u > 0 && u < 1 ? '<g transform="translate(' + $.fx(cx) + " " + $.fx(cy) + ") scale(" + $.fx(lift) + " " + $.fx(Math.max(0.02, sy) * lift) + ") translate(" + $.fx(-cx) + " " + $.fx(-cy) + ')">' + tile + "</g>" : tile;
    }
  }
  s += M.part("tiles", { at: tin, in: "fade", dur: 0.4, out: "fade", box: { x: bx, y: by, w: bw, h: bh } }, tiles);
  return s;
}
