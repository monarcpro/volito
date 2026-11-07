// A small tracked-out white line over glowing periwinkle serif capitals.
const LOOK = {"size": [80, 64, 72], "rows": [{"family": "Inter", "weight": 500, "upper": true, "ls": 0.12, "scale": 0.5, "fill": "#FFFFFF"}, {"family": "DM Serif Display", "weight": 400, "upper": true, "fill": "#8FB4FF", "glow": {"color": "#8FB4FF", "blur": 0.15, "op": 0.7}}], "split": 0.3, "colors": {"upcoming": null}, "enter": "fade", "hero": "#8FB4FF", "charW": 0.7};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
