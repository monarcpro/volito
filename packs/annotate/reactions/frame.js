function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1), col = inkOf($, p.color);
  let s = "";
  const KINDS = { hearts: ["heart", "#FF3B5C"], likes: ["thumbsUp", "#2F7BFF"], fire: ["fire", "#FF7A1A"], laughs: ["smile", "#FFC21A"], stars: ["star", "#B55CFF"] };
  const names = p.kind === "mixed" ? ["hearts", "likes", "fire", "laughs", "hearts", "stars"] : [p.kind];
  const x0 = W * p.x / 100, life = 2.6, rise = H * 0.62, n = Math.ceil(($.dur - tin) * p.rate);
  const end = M.outAt;
  let out = "";
  for (let i = 0; i < n; i++) {
    const born = tin + i / p.rate + ($.hash(i * 1.7) - 0.5) * 0.15, age = t - born;
    if (age < 0 || age > life || born > end) continue;
    const kd = KINDS[names[Math.floor($.hash(i * 4.1) * names.length) % names.length]];
    const q = age / life, r = p.size * k * 0.5 * (0.8 + 0.4 * $.hash(i * 2.9));
    const x = x0 + Math.sin(age * 2.4 + i) * 34 * k + ($.hash(i * 6.3) - 0.5) * 60 * k;
    const y = H * 0.9 - rise * $.E.out2(q);
    const sc = Math.min(1, $.E.outBack($.clamp(age / 0.3))), op = q > 0.7 ? 1 - (q - 0.7) / 0.3 : 1;
    out += '<g opacity="' + op.toFixed(3) + '" transform="translate(' + x + " " + y + ") scale(" + sc + ')">' + $.circle(0, 0, r, { fill: kd[1] }) + $.icon(kd[0], -r * 0.55, -r * 0.55, r * 1.1, { color: "#FFFFFF", fill: "#FFFFFF", sw: 2 }) + "</g>";
  }
  return s + M.part("stream", { in: "none", out: "none", vary: false }, out);
}
