// Two rows: the first in a heavy white sans, the second in a light ice-blue one, each word rising in as it is said.
const LOOK = {"size": [80, 64, 72], "rows": [{"family": "Montserrat", "weight": 800, "fill": "#FFFFFF"}, {"family": "Inter", "weight": 300, "scale": 0.92, "fill": "#A8DCFF"}], "split": 0.5, "colors": {"said": "#FFFFFF", "upcoming": null}, "enter": "rise", "shadow": "sm", "hero": "#A8DCFF"};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
