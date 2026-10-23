// MONARC Essentials — helpers every item in this pack shares (prepended to each item's code).

/**
 * The title-safe box for this canvas: text inside it clears the frame's edges and, on 9:16, the
 * platforms' own buttons and captions (Reels, Shorts, TikTok keep ~12% at the top, ~22% at the bottom).
 * 4:5 and 1:1 are feed posts: "square", with even margins.
 */
function safeArea($) {
  const W = $.W, H = $.H;
  const tall = H >= W * 1.5, square = !tall && H > W * 0.85;
  const sx = tall ? 0.075 : square ? 0.07 : 0.055;
  const top = tall ? 0.12 : 0.07;
  const bottom = tall ? 0.22 : 0.08;
  return { x: W * sx, y: H * top, w: W * (1 - 2 * sx), h: H * (1 - top - bottom), tall: tall, square: square, wide: !tall && !square };
}

/** Words as the runtime compares them: lowercase letters and digits (Devanagari kept). */
function normWord(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9%ऀ-ॿ]/g, "");
}

/**
 * The time to land a prop's text on: 0.08 s before the first of its words that is spoken over the
 * graphic (when a transcript was given), else the fallback. Silent when none is spoken.
 */
function landOn($, str, fallback, after) {
  if (!$.words.length) return fallback;
  const from = after || 0;
  const wanted = String(str || "").split(/\s+/).map(normWord).filter(Boolean);
  for (let i = 0; i < $.words.length; i++) {
    const w = $.words[i];
    if (w.s < from - 0.05) continue;
    if (wanted.indexOf(normWord(w.w)) >= 0) return Math.max(0, w.s - 0.08);
  }
  return fallback;
}

/** The brand's face for a role at `size`, cut down until `str` fits `maxW` (never below 40%). */
function fitFont($, str, role, size, maxW, extra) {
  const f = Object.assign({}, $.font(role), { size: size }, extra || {});
  const w = $.measure(str, f);
  if (w > maxW && w > 0) f.size = Math.max(size * 0.4, (size * maxW) / w);
  return f;
}

/** The widest of several lines in a font. */
function widest($, lines, font) {
  let w = 0;
  for (let i = 0; i < lines.length; i++) w = Math.max(w, $.measure(lines[i], font));
  return w;
}

/**
 * The biggest size (≤ maxSize) at which `str` sets in at most `maxLines` lines no wider than maxW —
 * one line when it holds at 60% of maxSize or more. { size, lines, font }.
 */
function fitLines($, str, font, maxW, maxSize, minSize, maxLines) {
  const at = function (size) { return Object.assign({}, font, { size: size }); };
  const w1 = $.measure(str, at(100)) / 100;
  if (w1 > 0) {
    // A hair under the exact fit, so wrapping the same text at this size keeps it on one line.
    const s1 = Math.min(maxSize, (maxW / w1) * 0.995);
    if (s1 >= maxSize * 0.6 || maxLines <= 1) return { size: Math.max(minSize, s1), lines: [str], font: at(Math.max(minSize, s1)) };
  }
  for (let size = maxSize; size >= minSize; size *= 0.94) {
    const lines = $.wrap(str, maxW, at(size));
    if (lines.length <= maxLines && widest($, lines, at(size)) <= maxW) return { size: size, lines: lines, font: at(size) };
  }
  const lines = $.wrap(str, maxW, at(minSize));
  return { size: minSize, lines: lines, font: at(minSize) };
}

/** Words of `text` (with *marks*) laid into `lines` (the same words without marks), for $.sync / $.headline. */
function markedRows(text, lines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const rows = [];
  let i = 0;
  for (let l = 0; l < lines.length; l++) {
    const n = String(lines[l]).split(/\s+/).filter(Boolean).length;
    rows.push(words.slice(i, i + n).join(" "));
    i += n;
  }
  if (i < words.length && rows.length) rows[rows.length - 1] += " " + words.slice(i).join(" ");
  return rows;
}
