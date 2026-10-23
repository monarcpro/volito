function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const rows = (p.steps || []).slice(0, 6);
  const n = Math.max(1, rows.length);
  const kick = p.kicker ? $.case(p.kicker) : "";
  const title = $.case(p.title);
  const tf = fitLines($, title, Object.assign({}, $.font("display"), { ls: -0.03 }), A.w, Math.min((A.tall ? 140 : 110) * k, A.h * 0.11), 48 * k, 2);
  const chip = kick ? $.chip.size(kick, { size: 28 * k }) : { w: 0, h: 0 };
  const chipH = kick ? chip.h + 28 * k : 0;
  const headH = chipH + tf.lines.length * tf.size * 1.05 + 56 * k;
  // Rows share the room under the heading, with a gap.
  const room = A.h - headH;
  const gapY = 22 * k;
  const rh = Math.min((A.tall ? 200 : A.wide ? 150 : 180) * k, (room - gapY * (n - 1)) / n);
  const total = headH + n * rh + (n - 1) * gapY;
  let y = A.y + (A.h - total) / 2;
  const w = A.tall ? A.w : Math.min(A.w, 1500 * k);
  const ox = A.wide ? (W - w) / 2 : A.x;

  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H }, glow: [W * 0.8, H * 0.2] }));
  if (kick) {
    s += M.part("kicker", { at: tin, in: "rise", distance: 16, box: { x: ox, y: y, w: chip.w, h: chip.h } }, $.chip(kick, ox, y, { size: 28 * k, dot: true }));
    y += chipH;
  }
  tf.lines.forEach(function (line, i) {
    s += M.text("title", Object.assign({ at: tin + 0.12 + i * 0.1, in: "rise", distance: 28 }, tf.font, { x: ox, y: y + i * tf.size * 1.05 }), line);
  });
  y += tf.lines.length * tf.size * 1.05 + 56 * k;
  const first = landOn($, rows[0], tin + 0.55);
  rows.forEach(function (row, i) {
    const at = landOn($, row, first + i * p.gap, first + (i - 1) * p.gap);
    const ry = y + i * (rh + gapY);
    const badge = rh * 0.62;
    const label = $.case(row);
    const lf = fitFont($, label, "display", Math.min(60 * k, rh * 0.42), w - badge - rh * 0.9);
    let card = $.card(ox, ry, w, rh, { r: Math.min($.style.radius, rh * 0.3), shadow: "md" });
    const bx = ox + (rh - badge) / 2, by = ry + (rh - badge) / 2;
    if (p.marker === "checks") {
      const done = $.E.out3($.seg(t, at + 0.25, at + 0.55));
      card += $.rect(bx, by, badge, badge, { r: badge * 0.28, fill: done > 0.5 ? c.accent : "none", stroke: c.accent, sw: 4 * k });
      card += $.path("M" + (bx + badge * 0.24) + " " + (by + badge * 0.52) + "L" + (bx + badge * 0.43) + " " + (by + badge * 0.7) + "L" + (bx + badge * 0.78) + " " + (by + badge * 0.32), { stroke: $.on(c.accent), sw: badge * 0.11, draw: done });
    } else {
      card += $.rect(bx, by, badge, badge, { r: badge * 0.28, fill: c.accent });
      card += $.text(String(i + 1).padStart(2, "0"), Object.assign({}, $.font("mono"), { size: badge * 0.42, x: bx + badge / 2, y: by + badge * 0.27, anchor: "middle", fill: $.on(c.accent) }));
    }
    card += $.text(label, Object.assign({}, lf, { x: ox + rh * 0.95, y: ry + (rh - lf.size) / 2 - lf.size * 0.04 }));
    s += M.part("steps", { at: at, in: "slide", from: "left", distance: 33, box: { x: ox, y: ry, w: w, h: rh } }, card);
  });
  return s;
}
