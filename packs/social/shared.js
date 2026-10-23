// MONARC Social — helpers this pack's items share.

/** A platform's icon and how it names its numbers (the platforms' own marks are theirs; these are plain icons). */
var PLATFORM = {
  instagram: { icon: "camera", line: "Instagram", count: "followers" },
  tiktok: { icon: "reel", line: "TikTok", count: "followers" },
  youtube: { icon: "play", line: "YouTube", count: "subscribers" },
  x: { icon: "x", line: "X", count: "followers" },
  linkedin: { icon: "users", line: "LinkedIn", count: "followers" },
  threads: { icon: "chat", line: "Threads", count: "followers" },
  website: { icon: "globe", line: "Website", count: "readers" },
};

/** A small round check in the accent: verified. */
function verified($, cx, cy, r) {
  return $.circle(cx, cy, r, { fill: $.c.accent }) + $.path("M" + $.fx(cx - r * 0.45) + " " + $.fx(cy + r * 0.02) + "L" + $.fx(cx - r * 0.1) + " " + $.fx(cy + r * 0.36) + "L" + $.fx(cx + r * 0.48) + " " + $.fx(cy - r * 0.32), { stroke: $.on($.c.accent), sw: r * 0.28 });
}

/** A colour for a name, from the brand's two accents and fixed hues — the same name, the same colour. */
function nameColor($, name) {
  var list = [$.c.accent, $.c.accent2, "#3DD6FF", "#7C5CFF", "#22C55E", "#F59E0B"];
  var h = 0, s = String(name || "");
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return list[h % list.length];
}
