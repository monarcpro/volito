// The whole line in white with the word being said on a violet tile that slides along.
const LOOK = {"size": [72, 60, 66], "font": {"family": "Inter", "weight": 500}, "colors": {"said": "#FFFFFF", "upcoming": "#FFFFFF", "upOp": 1}, "box": {"fill": "#7B5CFF", "r": 0.1}, "shadow": "sm", "hero": "#7B5CFF"};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
