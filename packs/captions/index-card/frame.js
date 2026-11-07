// Navy ink on a warm paper card — said, being said and still to come in three shades.
const LOOK = {"size": [64, 52, 58], "font": {"family": "Poppins", "weight": 600}, "colors": {"said": "#14213D", "current": "rgba(20, 33, 61, 0.74)", "upcoming": "rgba(20, 33, 61, 0.26)", "upOp": 1}, "card": {"fill": "#FFF6E5", "r": 0.27, "px": 0.38, "py": 0.25}, "lh": 1.15, "maxWords": 7, "hero": "#FFF6E5"};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
