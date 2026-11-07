// Wide extra-bold capitals in two rows — white over mint — with a soft glow and a drop shadow.
const LOOK = {"size": [62, 50, 56], "rows": [{"family": "Unbounded", "weight": 800, "upper": true, "fill": "#FFFFFF"}, {"family": "Unbounded", "weight": 800, "upper": true, "fill": "#3BE8B0"}], "split": 0.4, "colors": {"upcoming": null}, "glow": {"color": "#FFFFFF", "blur": 0.2, "op": 0.25}, "shadow": "md", "enter": "fade", "hero": "#3BE8B0", "charW": 0.85};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
