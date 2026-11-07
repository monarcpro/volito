// Bold words opened by a gold brush-script word, the word being said underlined in gold.
const LOOK = {"size": [70, 58, 64], "font": {"family": "Outfit", "weight": 700}, "first": {"family": "Kaushan Script", "weight": 400, "fill": "#FFC23D", "scale": 1.1}, "colors": {"said": "#FFFFFF", "upcoming": null}, "underline": {"color": "#FFC23D"}, "enter": "rise", "shadow": "sm", "hero": "#FFC23D"};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
