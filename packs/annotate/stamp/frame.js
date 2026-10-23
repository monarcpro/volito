function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  let s = "";
  const cx = W * p.x / 100, cy = H * p.y / 100, txt = String(p.text || "").toUpperCase();
  const f = fitFont($, txt, "display", p.size * k, W * 0.7, { ls: 0.04 });
  const tw = $.measure(txt, f), pad = f.size * 0.42, w = tw + pad * 2, h = f.size * 1.5;
  // Ink that did not take: a fixed noise mask so the stamp looks pressed, not printed.
  const nid = $.uid("sn"), mid = $.uid("sm");
  $.def('<filter id="' + nid + '" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="' + (0.9 / k).toFixed(3) + '" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.4 1.75"/></filter>');
  $.def('<mask id="' + mid + '" maskUnits="userSpaceOnUse" x="' + (cx - w) + '" y="' + (cy - h) + '" width="' + 2 * w + '" height="' + 2 * h + '"><rect x="' + (cx - w) + '" y="' + (cy - h) + '" width="' + 2 * w + '" height="' + 2 * h + '" fill="#fff" filter="url(#' + nid + ')"/></mask>');
  const body = $.rect(cx - w / 2, cy - h / 2, w, h, { r: 14 * k, stroke: col, sw: 9 * k }) + $.rect(cx - w / 2 + 16 * k, cy - h / 2 + 16 * k, w - 32 * k, h - 32 * k, { r: 8 * k, stroke: col, sw: 4 * k }) +
    $.text(txt, Object.assign({}, f, { x: cx, y: cy - f.size * 0.56, anchor: "middle", fill: col }));
  const inked = '<g mask="url(#' + mid + ')" transform="rotate(' + p.angle + " " + cx + " " + cy + ')">' + body + "</g>";
  s += M.part("stamp", { at: tin, in: "slam", box: { x: cx - w / 2, y: cy - h / 2, w: w, h: h } }, inked);
  return s;
}
