// Heavy white capitals with a thick black outline; the word being said turns hot coral and pops.
const LOOK = {"size": [84, 68, 76], "font": {"family": "Montserrat", "weight": 900, "upper": true}, "colors": {"said": "#FFFFFF", "current": "#FF4F79", "upcoming": null}, "stroke": {"color": "#000000", "w": 0.06, "cur": 0.08}, "enter": "pop", "hero": "#FF4F79", "charW": 0.7, "maxWords": 4};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
