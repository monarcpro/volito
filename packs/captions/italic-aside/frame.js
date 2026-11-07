// A clean white sans with the key word set in a glowing peach italic serif.
const LOOK = {"size": [76, 62, 68], "font": {"family": "Instrument Sans", "weight": 500}, "accent": {"family": "Instrument Serif", "weight": 400, "italic": true, "auto": true, "scale": 1.14, "fill": "#FFC2A1", "glow": {"color": "#FFC2A1", "blur": 0.12, "op": 0.75}}, "colors": {"said": "#FFFFFF", "upcoming": null}, "enter": "rise", "shadow": "sm", "hero": "#FFC2A1"};
function frame(t, $) {
  return lineLook(t, $, LOOK);
}
