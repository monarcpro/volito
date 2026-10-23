// MONARC Essentials — helpers this pack's items share (prepended to each item's code). The layout
// helpers (safeArea, fitFont, fitLines, landOn, widest) live in the motion kit.

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
