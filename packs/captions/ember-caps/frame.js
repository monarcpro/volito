// Heavy amber capitals with a warm ember glow, popping in word by word.
const LOOK = {"size": [80, 64, 72], "font": {"family": "Montserrat", "weight": 900, "upper": true}, "colors": {"said": "#FFA53D", "upcoming": null}, "glow": {"color": "self", "blur": 0.14, "op": 0.7}, "enter": "pop", "hero": "#FFA53D", "charW": 0.68, "maxWords": 5};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
