// MONARC 3D — helpers this pack's items share. The scenes are built with scene3d (the 3D kit).

/** The focal length a scene3d camera with this field of view has on this canvas. */
function focalFor($, fov) {
  return ($.H / 2) / Math.tan(((fov || 35) * Math.PI) / 360);
}

/** Lines of 3D text no wider than maxW (px at the target depth), by words. */
function wrap3d(S, str, o, maxW, maxLines) {
  var words = String(str || "").split(/\s+/).filter(Boolean), lines = [], cur = "";
  words.forEach(function (w) {
    var next = cur ? cur + " " + w : w;
    if (cur && S.measure(next, o) > maxW) { lines.push(cur); cur = w; } else cur = next;
  });
  if (cur) lines.push(cur);
  if (maxLines && lines.length > maxLines) { var rest = lines.slice(maxLines - 1).join(" "); lines = lines.slice(0, maxLines - 1).concat([rest]); }
  return lines;
}

/** The biggest size (≤ max) at which str fits maxW on one line, in 3D text. */
function fit3d(S, str, o, maxW, max) {
  var w = S.measure(str, Object.assign({}, o, { size: 100 }));
  return w > 0 ? Math.min(max, (maxW / w) * 100) : max;
}

/** A soft contact shadow on the floor under a point (2D, drawn before the scene). */
function floorShadow($, S, p, rx, op) {
  var q = S.project(p);
  if (!q) return "";
  var id = $.uid("fs");
  $.def('<radialGradient id="' + id + '"><stop offset="0" stop-color="#000" stop-opacity="' + (op || 0.45) + '"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>');
  return '<ellipse cx="' + $.fx(q.x) + '" cy="' + $.fx(q.y) + '" rx="' + $.fx(rx * q.s) + '" ry="' + $.fx(rx * q.s * 0.18) + '" fill="url(#' + id + ')"/>';
}
