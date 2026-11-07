// Every other word swaps face: tall condensed white capitals and a flowing rose script, rising in word by word.
const LOOK = {"size": [88, 70, 80], "font": {"family": "Bebas Neue", "weight": 400, "upper": true}, "alt": {"family": "Allura", "weight": 400, "upper": false, "scale": 1.3, "pad": 0.12, "fill": "#FFB3C7"}, "colors": {"said": "#FFFFFF", "upcoming": null}, "enter": "rise", "shadow": "sm", "hero": "#FFB3C7", "charW": 0.5, "maxWords": 5, "lh": 1.12};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
