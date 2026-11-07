// White capitals with a soft aura, the key word lit up in aqua.
const LOOK = {"size": [72, 58, 66], "font": {"family": "Montserrat", "weight": 700, "upper": true, "ls": 0.02}, "colors": {"said": "#FFFFFF", "key": "#7DF2FF", "upcoming": null}, "glow": {"color": "self", "blur": 0.16, "op": 0.6}, "enter": "fade", "hero": "#7DF2FF", "charW": 0.68};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
