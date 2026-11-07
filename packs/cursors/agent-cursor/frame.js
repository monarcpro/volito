// An AI agent working a UI: its cursor glides to each target while its name tag types out the step, clicks with a
// ring, moves on to the next, and ends with a check and the done line.
function frame(t, $) {
  const p = $.data, c = $.c, k = $.k, W = $.W, H = $.H;
  const M = motion($, t);
  const tin = $.beat("in", 0.1);
  const col = p.color || c.accent;
  const steps = (p.steps || []).slice(0, 8).map(function (s) { return { text: String(s.step || ""), pt: at$($, s.x, s.y) }; });
  if (!steps.length) return "";
  const end = $.beat("out", $.dur - 0.45) - 0.7;
  const slot = (end - tin) / steps.length;
  const size = 30 * k, ps = 50 * k;
  // Where it is: gliding into step i during the first 45% of its slot, then still while it clicks.
  let pos = at$($, 92, 92), cur = -1, clickAt = 0;
  steps.forEach(function (st, i) {
    const t0 = tin + i * slot, t1 = t0 + slot * 0.45;
    if (t >= t0) { cur = i; pos = glide($, t, t0, t1, i ? steps[i - 1].pt : at$($, 92, 92), st.pt, 0.18); clickAt = t1 + 0.05; }
  });
  let s = "";
  // Clicks left behind: a soft dot at every target clicked so far.
  steps.forEach(function (st, i) { if (i < cur || (i === cur && t > clickAt)) s += $.circle(st.pt[0], st.pt[1], 9 * k, { fill: col, op: 0.35 }); });
  if (cur >= 0) s += clickRings($, t, clickAt, steps[cur].pt[0], steps[cur].pt[1], col, 46 * k);
  const press = cur >= 0 ? $.bump(t, clickAt, 0.06, 0.16) : 0;
  s += pointer($, pos[0], pos[1], ps, { fill: col, press: press });
  // The tag: the agent's name and the step typing out; at the end, a check and the done line.
  const done = t > end;
  // (The tick is drawn: not every face has a check mark glyph.)
  const rest = done ? String(p.done || "Done") : cur >= 0 ? $.typed(t, tin + cur * slot, steps[cur].text, 28) : "";
  const tag = nameTag($, 0, 0, String(p.name || "Agent"), done ? c.green : col, size, rest, done);
  const tx = Math.min(W - tag.w - 16 * k, pos[0] + ps * 0.55), ty = Math.min(H - tag.h - 16 * k, pos[1] + ps * 1.05);
  s += '<g transform="translate(' + $.fx(tx) + " " + $.fx(ty) + ')">' + tag.m + "</g>";
  return M.part("cursor", { at: tin, in: "fade", dur: 0.25, out: "fade" }, s);
}
