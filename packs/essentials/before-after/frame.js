// Before and after: two pictures (or two tiles when none are given) split by a handle that sweeps across to
// reveal the after side, overshoots a little and settles; each side carries its label.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const A = safeArea($);
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  let s = M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: W, h: H } }));
  const cap = String(p.caption || "");
  const cf = fitFont($, cap, "display", (A.tall ? 64 : 56) * k, A.w, { ls: -0.02 });
  const capH = cap ? cf.size * 1.6 : 0;
  // The frame: as big as fits, 16:9 inside wide and square frames, 4:5 inside tall ones.
  const ar = A.tall ? 4 / 5 : 16 / 9;
  let fw = A.w, fh = fw / ar;
  if (fh > A.h - capH) { fh = A.h - capH; fw = fh * ar; }
  const fx = W / 2 - fw / 2, fy = A.y + (A.h - capH - fh) / 2 + capH;
  const r = $.style.radius * 0.8;
  const side = function (key, img, tone, word) {
    let m = "";
    if (img) m += $.image(img, fx, fy, fw, fh, { r: r });
    else {
      // No picture: a flat grey "before" and the brand's colours "after".
      m += $.rect(fx, fy, fw, fh, { r: r, fill: tone === "before" ? $.mix(c.bg, c.fg, 0.18) : $.gradient([c.accent, c.accent2], { angle: 135 }) });
      m += $.clip(fx, fy, fw, fh, r, $.pattern(t, tone === "before" ? "hatch" : "dots", { box: { x: fx, y: fy, w: fw, h: fh }, color: tone === "before" ? c.fg : $.on(c.accent), a: 0.1 }));
      const wf = fitFont($, word, "display", fh * 0.2, fw * 0.4, { ls: -0.03 });
      m += $.text(word, Object.assign({}, wf, { x: tone === "before" ? fx + fw * 0.25 : fx + fw * 0.75, y: fy + fh / 2 - wf.size * 0.55, anchor: "middle", fill: tone === "before" ? $.rgba(c.fg, 0.35) : $.on(c.accent), op: 0.9 }));
    }
    return m;
  };
  const before = side("before", p.beforeImage ? "beforeImage" : "", "before", String(p.before || "Before"));
  const after = side("after", p.afterImage ? "afterImage" : "", "after", String(p.after || "After"));
  // Before on the left, after on the right. The handle starts at the right edge (all before), sweeps left to
  // show the after side, then springs back to the middle.
  const go = $.E.inOut3($.seg(t, tin + 0.6, tin + 1.8));
  const back = $.spring(Math.max(0, t - tin - 1.8), 2.2, 6);
  const pos = t < tin + 1.8 ? 0.98 - 0.9 * go : 0.08 + 0.42 * back;
  const hx = fx + fw * pos;
  const clip = $.uid();
  $.def('<clipPath id="' + clip + '"><rect x="' + hx + '" y="' + fy + '" width="' + Math.max(0, fx + fw - hx) + '" height="' + fh + '"/></clipPath>');
  let m = before + '<g clip-path="url(#' + clip + ')">' + after + "</g>";
  m += $.rect(hx - 3 * k, fy, 6 * k, fh, { fill: "#FFFFFF" });
  m += $.circle(hx, fy + fh / 2, 34 * k, { fill: "#FFFFFF", shadow: "md" });
  m += $.icon("arrowLeft", hx - 30 * k, fy + fh / 2 - 13 * k, 26 * k, { color: c.ink, sw: 3 });
  m += $.icon("arrowRight", hx + 4 * k, fy + fh / 2 - 13 * k, 26 * k, { color: c.ink, sw: 3 });
  // The labels ride in the top corners.
  const chip = function (txt, x, anchor, fill) { return $.chip($.case(txt), x, fy + 24 * k, { size: 28 * k, fill: fill, color: $.on(fill), anchor: anchor }); };
  m += chip(String(p.before || "Before"), fx + 24 * k, "start", c.ink);
  m += chip(String(p.after || "After"), fx + fw - 24 * k, "end", c.accent);
  s += M.part("frame", { at: tin, in: "pop", out: "fade", box: { x: fx, y: fy, w: fw, h: fh } }, m);
  if (cap) s += M.text("caption", Object.assign({ at: tin + 0.3, in: "rise", distance: 20 }, cf, { x: W / 2, y: fy - capH, anchor: "middle", fill: c.fg }), $.case(cap));
  return s;
}
