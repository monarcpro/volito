// White words on a cobalt tape behind each line, the tapes sweeping in.
const LOOK = {"size": [70, 58, 64], "font": {"family": "Inter", "weight": 600}, "colors": {"said": "#FFFFFF", "upcoming": "#FFFFFF", "upOp": 1}, "bars": {"fill": "#2F5BFF"}, "hero": "#2F5BFF", "lh": 1.25};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
