// Backdrops are grounds that move: put titles, products or footage over them. They loop smoothly.
/** The brand's plain ground (no texture of its own: the backdrop is the texture). */
function plain($, t) { return $.panel(t, { box: { x: 0, y: 0, w: $.W, h: $.H }, grid: false, glow: false, grain: false, texture: false }); }
/** A soft dark edge round the frame (strength 0–1). */
function vignetteOf($, a) {
  return $.rect(0, 0, $.W, $.H, { fill: $.gradient([[0, "#000000", 0], [0.6, "#000000", 0], [1, "#000000", a]], { radial: true, r: 0.75 }) });
}
