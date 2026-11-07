// A glowing ice-cyan line of condensed capitals over a big white brush script.
const LOOK = {"size": [84, 68, 76], "rows": [{"family": "Bebas Neue", "weight": 400, "upper": true, "fill": "#9AF4FF", "scale": 0.85, "glow": {"color": "#9AF4FF", "blur": 0.18, "op": 0.8}}, {"family": "Kaushan Script", "weight": 400, "fill": "#FFFFFF", "scale": 1.1}], "split": 0.3, "colors": {"upcoming": null}, "enter": "rise", "shadow": "sm", "hero": "#9AF4FF"};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
