// Lines stack up the frame: the newest at the bottom, full size, written as it is said; the ones before rise, shrink and fade.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W;
  const A = safeArea($), M = motion($, t);
  const ws = captionWords($, p, $.beat("in", 0.05));
  if (!ws.length) return "";
  const groups = phrases(ws, A.tall ? 16 : 24, 4);
  const g = groupAt(groups, t, 1.2);
  if (!g) return "";
  const base = (A.tall ? 92 : A.wide ? 72 : 80) * k * sizeOf(p.size);
  const maxW = A.w * (A.tall ? 0.9 : 0.74);
  const keep = p.lines === "two" ? 2 : 3;
  // By age (0 = newest): how big a line is and how much of it shows; the last step is a line leaving.
  const shrink = [1, 0.62, 0.42, 0.32], fade = keep === 2 ? [1, 0.45, 0, 0] : [1, 0.5, 0.24, 0];
  const at = function (arr, x) { const i = Math.min(arr.length - 1, Math.floor(x)), j = Math.min(arr.length - 1, i + 1); return $.lerp(arr[i], arr[j], x - i); };
  // When a line arrives the whole stack slides up by its height.
  const e = $.E.out3($.clamp((t - g.start) / 0.3));
  const gap = base * 0.14;
  let cur = captionY($, A, p.position) + base * 0.5 + (1 - e) * (base + gap);
  let s = "";
  for (let a = 0; a <= keep && g.k - a >= 0; a++) {
    const words = groups[g.k - a];
    const age = a === 0 ? 0 : a - 1 + e;
    const op = at(fade, age) * (a === 0 ? e : 1);
    const f = Object.assign({}, $.font("display"), { size: base * at(shrink, age), ls: -0.02 });
    const text = words.map(function (w) { return w.w; }).join(" ");
    f.size *= Math.min(1, maxW / Math.max(1, $.measure(text, f)));
    const top = cur - f.size;
    cur = top - gap * at(shrink, age);
    if (op <= 0.01) continue;
    const lay = lineUp($, words, f, maxW * 1.5, W / 2, top, 1);
    lay.words.forEach(function (u) {
      const since = t - (u.s - 0.03);
      if (a === 0 && since < 0) return;
      const word = $.text(u.w, Object.assign({}, f, { x: u.x, y: u.y, fill: u.accent ? c.accent : "#FFFFFF", op: op }));
      const pop = a === 0 ? 1 + 0.18 * (1 - settle(since / 0.2)) : 1;
      s += pop === 1 ? word : $.g({ transform: $.tf({ s: pop, ox: u.x + u.ww / 2, oy: u.y + f.size / 2 }) }, word);
    });
  }
  s = $.g({ extra: 'filter="url(#mg-sm)"' }, s);
  return M.part("words", { in: "none", out: "fade", outAt: $.dur - 0.22, outDur: 0.2, vary: false }, s);
}

function sound($) {
  return $.data.ticks ? wordCues(captionWords($, $.data, $.beat("in", 0.05))) : [];
}
