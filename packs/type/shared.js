// Kinetic type on the brand's ground (and its pattern). Text sits inside the title-safe area.
function ground(M, $, t) {
  return M.part("ground", { in: "none", out: "fade", vary: false }, $.panel(t, { box: { x: 0, y: 0, w: $.W, h: $.H } }));
}
/** Words with *marks* → [{ word, marked }]. */
function markedWords(str) {
  const out = [];
  String(str || "").split(/\s+/).filter(Boolean).forEach(function (w) {
    const m = /^\*(.*)\*([.,!?;:]*)$/.exec(w);
    out.push(m ? { word: m[1] + m[2], marked: true } : { word: w.replace(/\*/g, ""), marked: false });
  });
  return out;
}
