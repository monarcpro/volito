// Captions with pictures: when a word with an icon is said, the icon pops up above it on an accent badge.
const AUTO = {
  time: "clock", second: "clock", seconds: "clock", minute: "clock", minutes: "clock", hour: "clock", hours: "clock", late: "clock",
  video: "video", videos: "video", film: "reel", movie: "reel", camera: "camera", photo: "image", photos: "image", picture: "image",
  watch: "eye", watching: "eye", see: "eye", look: "eye", view: "eye", views: "eye",
  money: "dollar", price: "dollar", cost: "dollar", dollars: "dollar", pay: "dollar", sale: "tag", buy: "cart", shop: "cart",
  love: "heart", like: "thumbsUp", likes: "thumbsUp", fire: "fire", hot: "fire", idea: "bulb", ideas: "bulb", think: "brain",
  fast: "bolt", quick: "bolt", power: "bolt", win: "trophy", winner: "trophy", best: "trophy", star: "star", top: "star",
  grow: "trend", growth: "trend", up: "arrowUp", down: "arrowDown", launch: "rocket", rocket: "rocket", start: "rocket",
  world: "globe", global: "globe", home: "home", call: "phone", phone: "phone", mail: "mail", email: "mail", message: "msg",
  captions: "msg", words: "msg", word: "chat", talk: "chat", say: "mic", voice: "mic", music: "play", play: "play",
  people: "users", team: "users", you: "user", me: "user", goal: "target", target: "target", done: "check", yes: "check",
  no: "x", search: "search", find: "search", map: "map", where: "pin", place: "pin", lock: "lock", secure: "lock", safe: "lock",
  data: "database", code: "code", cloud: "cloud", news: "newspaper", new: "sparkle", magic: "sparkle", gift: "sparkle",
  happy: "smile", fun: "smile", day: "calendar", date: "calendar", week: "calendar", share: "share", link: "link",
};

function frame(t, $) {
  const p = $.data, c = $.c, k = $.k;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const C = captionLines($, A, ws, t, { size: (A.tall ? 70 : A.wide ? 58 : 64) * k * sizeOf(p.size), position: p.position, lines: 2, maxWords: 7, lh: 2.05 });
  if (!C) return "";
  const f = C.font;
  const own = {};
  String(p.icons || "").split(",").forEach(function (pair) {
    const m = /^\s*([^:]+?)\s*:\s*([A-Za-z]+)\s*$/.exec(pair);
    if (m) own[plainWord(m[1])] = m[2];
  });
  let badges = "", words = "";
  C.lay.words.forEach(function (u, j) {
    const since = t - (u.s - 0.03);
    const said = since >= 0;
    words += $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: said && u.accent ? c.accent : "#FFFFFF", op: said ? 1 : 0.4 }));
    const key = plainWord(u.w);
    const name = own[key] || (p.auto === false ? null : AUTO[key]);
    if (!name || !said) return;
    const r = f.size * 0.42, cx = u.x + u.ww / 2, cy = u.y - r * 1.25;
    const pop = settle(since / 0.3), wob = (1 - $.clamp(since / 0.4)) * Math.sin(since * 30) * 10;
    const badge = $.circle(cx, cy, r, { fill: u.accent ? c.accent2 : c.accent }) + $.icon(name, cx - r * 0.62, cy - r * 0.62, r * 1.24, { color: $.on(u.accent ? c.accent2 : c.accent), sw: 2.2 });
    badges += $.g({ transform: $.tf({ s: Math.max(0.01, pop), r: wob, ox: cx, oy: cy + r }) }, badge);
  });
  const s = $.g({ extra: 'filter="url(#mg-sm)"' }, groupIn($, C.g, t, badges + words));
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  return captionWords($, $.data, $.beat("in", 0.05)).filter(function (w) { return AUTO[plainWord(w.w)]; }).map(function (w) { return { at: w.s, kind: "pop", level: 0.5 }; });
}
