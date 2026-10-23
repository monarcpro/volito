/**
 * The 3D kit: real depth, light and a camera for programs, drawn as SVG paths — no browser, no GPU.
 * Meshes (boxes, rounded cards, discs, extruded shapes, spheres, extruded text from MM_GLYPHS) are
 * transformed, lit (directional light, ambient, a specular sweep), culled when they face away,
 * sorted far to near and projected through a perspective camera that can orbit a target. Like the
 * motion kit it is plain JavaScript prepended to a program, so it runs wherever programs run.
 *
 * Coordinates: x right, y down, z away from the viewer, in canvas px at the target's depth (so with
 * the default camera an object at z = 0 draws at 1 px per unit). Rotations are in degrees.
 *
 * It is a string, not a module: no template literals and no dollar-brace inside.
 */
export const MOTION_3D = String.raw`
// ———————— MONARC Motion 3D ————————
var M3_D2R = Math.PI / 180;
function m3hex(c) {
  var s = String(c || "#888888").trim();
  var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (m) { var h = m[1]; if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(s);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return [136, 136, 136];
}
function m3rgb(c) { var f = function (v) { var n = Math.max(0, Math.min(255, Math.round(v))).toString(16); return n.length < 2 ? "0" + n : n; }; return "#" + f(c[0]) + f(c[1]) + f(c[2]); }
function m3sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function m3dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function m3cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function m3norm(a) { var l = Math.sqrt(m3dot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function m3rx(v, a) { var c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; }
function m3ry(v, a) { var c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; }
function m3rz(v, a) { var c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; }
/** Rotation order: z (roll), then x (tilt), then y (turn). */
function m3rot(v, r) { var o = v; if (r[2]) o = m3rz(o, r[2] * M3_D2R); if (r[0]) o = m3rx(o, r[0] * M3_D2R); if (r[1]) o = m3ry(o, r[1] * M3_D2R); return o; }

/** A closed 2D outline (screen-style y down) as points, from path data with M, L, Q, C, Z (absolute). */
function m3pathLoops(d, scale, steps) {
  var loops = [], cur = null, x = 0, y = 0, sx = 0, sy = 0;
  var tok = String(d).match(/[MLQCZmlqcz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  var i = 0, cmd = "", num = function () { return Number(tok[i++]); };
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    if (cmd === "M") { x = num(); y = num(); sx = x; sy = y; cur = [[x * scale, y * scale]]; loops.push(cur); cmd = "L"; }
    else if (cmd === "L") { x = num(); y = num(); if (cur) cur.push([x * scale, y * scale]); }
    else if (cmd === "Q") { var qx = num(), qy = num(), ex = num(), ey = num(); for (var k = 1; k <= steps; k++) { var t = k / steps, u = 1 - t; cur.push([(u * u * x + 2 * u * t * qx + t * t * ex) * scale, (u * u * y + 2 * u * t * qy + t * t * ey) * scale]); } x = ex; y = ey; }
    else if (cmd === "C") { var c1x = num(), c1y = num(), c2x = num(), c2y = num(), cx = num(), cy = num(); for (var k2 = 1; k2 <= steps; k2++) { var t2 = k2 / steps, u2 = 1 - t2; cur.push([(u2 * u2 * u2 * x + 3 * u2 * u2 * t2 * c1x + 3 * u2 * t2 * t2 * c2x + t2 * t2 * t2 * cx) * scale, (u2 * u2 * u2 * y + 3 * u2 * u2 * t2 * c1y + 3 * u2 * t2 * t2 * c2y + t2 * t2 * t2 * cy) * scale]); } x = cx; y = cy; }
    else if (cmd === "Z" || cmd === "z") { x = sx; y = sy; cmd = ""; }
    else i++;
  }
  return loops.map(function (l) { var n = l.length; if (n > 1 && Math.abs(l[0][0] - l[n - 1][0]) < 1e-6 && Math.abs(l[0][1] - l[n - 1][1]) < 1e-6) l.pop(); return l; }).filter(function (l) { return l.length > 2; });
}
function m3area(l) { var a = 0; for (var i = 0; i < l.length; i++) { var p = l[i], q = l[(i + 1) % l.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }

/** Extrude 2D loops (y down) into faces: front at z = -depth/2, back at +depth/2, sides between. */
function m3extrude(loops, depth, o) {
  var faces = [], h = depth / 2, total = 0;
  for (var i = 0; i < loops.length; i++) total += m3area(loops[i]);
  var orient = total >= 0 ? 1 : -1;
  var front = loops.map(function (l) { return l.map(function (p) { return [p[0], p[1], -h]; }); });
  faces.push({ loops: front, n: [0, 0, -1], color: o.color, role: "front" });
  if (depth > 0.001) {
    faces.push({ loops: loops.map(function (l) { return l.map(function (p) { return [p[0], p[1], h]; }); }), n: [0, 0, 1], color: o.back || o.side || o.color, role: "back" });
    for (var j = 0; j < loops.length; j++) {
      var l = loops[j];
      for (var k = 0; k < l.length; k++) {
        var a = l[k], b = l[(k + 1) % l.length], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-6) continue;
        faces.push({ loops: [[[a[0], a[1], -h], [b[0], b[1], -h], [b[0], b[1], h], [a[0], a[1], h]]], n: [orient * dy / len, -orient * dx / len, 0], color: o.side || o.color, role: "side" });
      }
    }
  }
  return faces;
}

/** A rounded rectangle centred on 0,0 as one loop. */
function m3roundRect(w, h, r, seg) {
  r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  var pts = [], x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
  if (r < 0.5) return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  var corners = [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]];
  for (var c = 0; c < 4; c++) for (var s = 0; s <= seg; s++) { var a = (corners[c][2] + 90 * s / seg) * M3_D2R; pts.push([corners[c][0] + r * Math.cos(a), corners[c][1] + r * Math.sin(a)]); }
  return pts;
}

/**
 * A scene for one frame. opts.camera: { fov (deg, 35), distance (px; default puts z = 0 at 1 px per
 * unit), yaw, pitch, roll (deg, an orbit round target), target [x, y, z], x, y (where the target lands
 * on screen) }. opts.light: { dir [x, y, z] (from the light into the scene), ambient (0–1), spec (0–1),
 * shine (sharpness) }.
 */
function scene3d($, opts) {
  opts = opts || {};
  var W = $.W, H = $.H, K = $.k;
  var cam = opts.camera || {};
  var fov = (cam.fov || 35) * M3_D2R;
  var focal = (H / 2) / Math.tan(fov / 2);
  var dist = cam.distance != null ? cam.distance : focal;
  var target = cam.target || [0, 0, 0];
  var yaw = (cam.yaw || 0) * M3_D2R, pitch = (cam.pitch || 0) * M3_D2R, rollC = (cam.roll || 0) * M3_D2R;
  var ox = cam.x != null ? cam.x : W / 2, oy = cam.y != null ? cam.y : H / 2;
  var lt = opts.light || {};
  // A key light from the front top-left: faces turned to the camera keep about their own colour.
  var L = m3norm(lt.dir || [0.3, 0.5, 0.81]);
  var toLight = [-L[0], -L[1], -L[2]];
  var ambient = lt.ambient != null ? lt.ambient : 0.55, spec = lt.spec != null ? lt.spec : 0.3, shine = lt.shine || 28;
  var items = [];
  var nearZ = 20;

  function toCam(p) { var q = m3sub(p, target); if (yaw) q = m3ry(q, -yaw); if (pitch) q = m3rx(q, -pitch); if (rollC) q = m3rz(q, -rollC); return [q[0], q[1], q[2] + dist]; }
  function dirToCam(n) { var q = n; if (yaw) q = m3ry(q, -yaw); if (pitch) q = m3rx(q, -pitch); if (rollC) q = m3rz(q, -rollC); return q; }
  function proj(q) { return [ox + focal * q[0] / q[2], oy + focal * q[1] / q[2]]; }
  var camPos = (function () { var c = [0, 0, -dist]; if (rollC) c = m3rz(c, rollC); if (pitch) c = m3rx(c, pitch); if (yaw) c = m3ry(c, yaw); return [c[0] + target[0], c[1] + target[1], c[2] + target[2]]; })();

  function shadeColor(base, nWorld, pWorld, o) {
    var c = m3hex(base);
    if (o && o.flat) return m3rgb(c);
    var amb = o && o.ambient != null ? o.ambient : ambient;
    var diff = Math.max(0, m3dot(nWorld, toLight));
    var k = amb + (1 - amb) * diff;
    var out = [c[0] * k, c[1] * k, c[2] * k];
    var sp = o && o.spec != null ? o.spec : spec;
    if (sp > 0) {
      var v = m3norm(m3sub(camPos, pWorld));
      var hv = m3norm([toLight[0] + v[0], toLight[1] + v[1], toLight[2] + v[2]]);
      var s = Math.pow(Math.max(0, m3dot(nWorld, hv)), o && o.shine ? o.shine : shine) * sp * 255;
      out = [out[0] + s, out[1] + s, out[2] + s];
    }
    return m3rgb(out);
  }

  var api = {};
  api.focal = focal;
  /** Where a world point lands: {x, y, z (camera depth), s (px per unit there)}. */
  api.project = function (p) { var q = toCam(p); if (q[2] < nearZ) return null; var s = proj(q); return { x: s[0], y: s[1], z: q[2], s: focal / q[2] }; };

  /** Meshes — each returns {faces, w, h} in object space, centred on its origin. */
  api.box = function (w, h, d, o) {
    o = o || {};
    var f = m3extrude([m3roundRect(w, h, o.radius || 0, 4)], d, { color: o.color, side: o.side, back: o.back });
    return { faces: f, w: w, h: h, d: d };
  };
  api.card = function (w, h, o) { o = o || {}; return api.box(w, h, o.depth != null ? o.depth : 12 * K, { color: o.color, side: o.side, back: o.back, radius: o.radius != null ? o.radius : 24 * K }); };
  api.disc = function (r, d, o) { o = o || {}; var seg = o.segments || 48, l = []; for (var i = 0; i < seg; i++) { var a = (i / seg) * Math.PI * 2; l.push([r * Math.cos(a), r * Math.sin(a)]); } return { faces: m3extrude([l], d, { color: o.color, side: o.side, back: o.back }), w: 2 * r, h: 2 * r, d: d }; };
  /** Any outline: loops of [x, y] points, or SVG path data (absolute M L Q C Z) with o.scale. */
  api.shape = function (loops, d, o) {
    o = o || {};
    if (typeof loops === "string") loops = m3pathLoops(loops, o.scale || 1, o.steps || 6);
    var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    loops.forEach(function (l) { l.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }); });
    var cx = o.center === false ? 0 : (minx + maxx) / 2, cy = o.center === false ? 0 : (miny + maxy) / 2;
    var shifted = loops.map(function (l) { return l.map(function (p) { return [p[0] - cx, p[1] - cy]; }); });
    return { faces: m3extrude(shifted, d, { color: o.color, side: o.side, back: o.back }), w: maxx - minx, h: maxy - miny, d: d };
  };
  api.sphere = function (r, o) {
    o = o || {};
    // One colour: drawn as a smooth lit ball (its outline is a circle from any side).
    if (!o.colorAt && o.smooth !== false) return { faces: [], ball: { r: r, color: o.color }, w: 2 * r, h: 2 * r, d: 2 * r };
    var lat = o.rings || 24, lon = o.segments || 48, faces = [];
    for (var i = 0; i < lat; i++) for (var j = 0; j < lon; j++) {
      var p = function (a, b) { var th = (a / lat) * Math.PI - Math.PI / 2, ph = (b / lon) * Math.PI * 2; return [r * Math.cos(th) * Math.sin(ph), r * Math.sin(th), -r * Math.cos(th) * Math.cos(ph)]; };
      var q = [p(i, j), p(i, j + 1), p(i + 1, j + 1), p(i + 1, j)];
      var c = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2];
      var col = o.colorAt ? o.colorAt(90 - ((i + 0.5) / lat) * 180, ((j + 0.5) / lon) * 360 - 180) : o.color;
      faces.push({ loops: [q], n: m3norm(c), color: col, role: "surface" });
    }
    return { faces: faces, w: 2 * r, h: 2 * r, d: 2 * r };
  };

  /** Font tables (MM_GLYPHS) by face: "Inter:900", or {family, weight}. */
  function table(face) {
    var g = typeof MM_GLYPHS === "object" ? MM_GLYPHS : {};
    var key = typeof face === "string" ? face : face && face.family ? face.family + ":" + (face.weight || 700) : "";
    if (g[key]) return g[key];
    var fam = key.split(":")[0];
    for (var k in g) if (k.split(":")[0] === fam) return g[k];
    for (var k2 in g) return g[k2];
    return null;
  }
  /** Width of a string in a face at a size (px), from the same tables the text is built from. */
  api.measure = function (str, o) {
    o = o || {};
    var T = table(o.face || o), size = o.size || 100, ls = (o.ls || 0) * size, w = 0, chars = Array.from(String(str));
    if (!T) return $.measure(str, { size: size, family: o.family, weight: o.weight, ls: o.ls });
    chars.forEach(function (ch, i) { var gl = T.g[String(ch.codePointAt(0))]; w += (gl ? gl[0] : 500) * size / 1000 + (i < chars.length - 1 ? ls : 0); });
    return w;
  };
  /**
   * Extruded text: o = {face | family + weight, size (px), depth, color (front), side, back, anchor
   * ("middle" | "start" | "end"), ls (em), each: function (i, n, ch) → {rotate, offset [x, y, z], scale, hide}
   * to move letters one by one round their own centres}. Returns a mesh plus .w (width) and .h (cap height).
   */
  api.text = function (str, o) {
    o = o || {};
    var T = table(o.face || o), size = o.size || 120, depth = o.depth != null ? o.depth : size * 0.25;
    if (!T) return { faces: [], w: 0, h: size, d: depth, missing: true };
    var sc = size / 1000, ls = (o.ls || 0) * size, chars = Array.from(String(str));
    var steps = Math.max(2, Math.min(8, Math.round(size / 45)));
    var x = 0, glyphs = [];
    chars.forEach(function (ch) {
      var gl = T.g[String(ch.codePointAt(0))];
      if (!gl) { x += 500 * sc + ls; return; }
      if (gl[1]) glyphs.push({ ch: ch, x: x, adv: gl[0] * sc, loops: m3pathLoops(gl[1], 1, steps).map(function (l) { return l.map(function (p) { return [p[0] * sc, -p[1] * sc]; }); }) });
      x += gl[0] * sc + ls;
    });
    var w = Math.max(0, x - ls), capH = T.asc * sc * 0.72;
    var ax = o.anchor === "start" ? 0 : o.anchor === "end" ? -w : -w / 2;
    var faces = [];
    glyphs.forEach(function (g, i) {
      var pose = o.each ? o.each(i, glyphs.length, g.ch) || {} : {};
      if (pose.hide) return;
      // Each letter is built round its own centre (half its advance, half the cap height) so it can turn in place.
      var gx = ax + g.x + g.adv / 2;
      var local = g.loops.map(function (l) { return l.map(function (p) { return [p[0] - g.adv / 2, p[1] + capH / 2]; }); });
      var gf = m3extrude(local, depth, { color: o.color, side: o.side, back: o.back });
      var rot = pose.rotate || [0, 0, 0], off = pose.offset || [0, 0, 0], s = pose.scale != null ? pose.scale : 1;
      gf.forEach(function (f) {
        f.loops = f.loops.map(function (l) { return l.map(function (p) { var q = m3rot([p[0] * s, p[1] * s, p[2] * s], rot); return [q[0] + gx + off[0], q[1] + off[1], q[2] + off[2]]; }); });
        f.n = m3rot(f.n, rot);
        f.group = i;
        faces.push(f);
      });
    });
    return { faces: faces, w: w, h: capH, d: depth };
  };

  /** A point and a direction through a transform {position, rotate, scale, parent}: own first, then each parent's. */
  function placeP(p, o) {
    var s = o.scale != null ? o.scale : 1, sv = typeof s === "number" ? [s, s, s] : s, pos = o.position || [0, 0, 0];
    var q = m3rot([p[0] * sv[0], p[1] * sv[1], p[2] * sv[2]], o.rotate || [0, 0, 0]);
    q = [q[0] + pos[0], q[1] + pos[1], q[2] + pos[2]];
    return o.parent ? placeP(q, o.parent) : q;
  }
  function placeN(n, o) {
    var s = o.scale != null ? o.scale : 1, sv = typeof s === "number" ? [s, s, s] : s;
    var q = m3norm(m3rot([n[0] / sv[0], n[1] / sv[1], n[2] / sv[2]], o.rotate || [0, 0, 0]));
    return o.parent ? placeN(q, o.parent) : q;
  }
  api.place = placeP;

  /**
   * Put a mesh in the scene: o = {position [x, y, z], rotate [x, y, z] deg, scale, parent (another
   * {position, rotate, scale, parent} the mesh moves with — a card its text sits on), opacity, flat (no
   * light), ambient, spec, shine, stroke (outline colour), twoSided, decal (printed on a convex object's
   * face: always drawn over it)}.
   */
  api.add = function (mesh, o) {
    o = o || {};
    if (!mesh || !mesh.faces) return api;
    var pos = o.position || [0, 0, 0], s = o.scale != null ? o.scale : 1;
    var sv = typeof s === "number" ? [s, s, s] : s;
    var op = o.opacity != null ? o.opacity : 1;
    if (op <= 0.002) return api;
    if (mesh.ball) {
      var ball = mesh.ball, rr = ball.r * (typeof s === "number" ? s : sv[0]);
      items.push({ p: o.parent ? placeP(pos, o.parent) : pos, kind: "sprite", o: {}, fn: function (x, y, k) {
        // Seen in perspective a sphere's outline is a little wider than its radius at the centre's depth.
        var zc = focal / k, R = focal * rr / Math.sqrt(Math.max(1, zc * zc - rr * rr)), id = $.uid("m3b"), c = m3hex(ball.color), hx = -toLight[0], hy = -toLight[1];
        var lit = m3rgb([c[0] * 1.0 + 40, c[1] * 1.0 + 40, c[2] * 1.0 + 40]), mid = m3rgb(c), dark = m3rgb([c[0] * ambient, c[1] * ambient, c[2] * ambient]);
        $.def('<radialGradient id="' + id + '" cx="0.5" cy="0.5" r="0.5" fx="' + $.fx(0.5 - hx * 0.32) + '" fy="' + $.fx(0.5 - hy * 0.32) + '"><stop offset="0" stop-color="' + lit + '"/><stop offset="0.45" stop-color="' + mid + '"/><stop offset="1" stop-color="' + dark + '"/></radialGradient>');
        return '<circle cx="' + $.fx(x) + '" cy="' + $.fx(y) + '" r="' + $.fx(R) + '" fill="url(#' + id + ')"' + (op < 0.999 ? ' opacity="' + $.fx(op) + '"' : "") + "/>";
      } });
      return api;
    }
    mesh.faces.forEach(function (f) {
      var loopsW = f.loops.map(function (l) { return l.map(function (p) { return placeP(p, o); }); });
      var nW = placeN(f.n, o);
      items.push({ loops: loopsW, n: nW, color: f.color, role: f.role, o: o, op: op, kind: "face" });
    });
    return api;
  };
  /** A line through 3D points: o = {stroke, width (px at the target depth), opacity, dash}. */
  api.line = function (points, o) { o = o || {}; items.push({ pts: points, o: o, op: o.opacity != null ? o.opacity : 1, kind: "line" }); return api; };
  /** Flat markup placed at a 3D point and scaled with depth (a label, an icon): fn(x, y, s) → markup. */
  api.at = function (p, fn, o) { items.push({ p: p, fn: fn, o: o || {}, kind: "sprite" }); return api; };

  /** Everything added, lit, sorted far to near and projected: SVG markup. */
  api.render = function () {
    var draw = [];
    items.forEach(function (it) {
      if (it.kind === "face") {
        var cl = it.loops.map(function (l) { return l.map(toCam); });
        var all = [].concat.apply([], cl);
        if (all.some(function (q) { return q[2] < nearZ; })) return;
        var first = cl[0], c = [0, 0, 0];
        first.forEach(function (q) { c[0] += q[0]; c[1] += q[1]; c[2] += q[2]; });
        c = [c[0] / first.length, c[1] / first.length, c[2] / first.length];
        var nC = dirToCam(it.n);
        if (!it.o.twoSided && m3dot(nC, c) >= 0) return;
        var z = 0; all.forEach(function (q) { z += q[2]; }); z /= all.length;
        if (it.role === "front") z -= 0.5; else if (it.role === "back") z += 0.5;
        // A decal (words printed on a card or a cube) draws after its host; culling still hides it when turned away.
        if (it.o.decal) z -= 1e5;
        var wc = [0, 0, 0]; it.loops[0].forEach(function (p) { wc[0] += p[0]; wc[1] += p[1]; wc[2] += p[2]; });
        wc = [wc[0] / it.loops[0].length, wc[1] / it.loops[0].length, wc[2] / it.loops[0].length];
        var fill = shadeColor(it.color, it.n, wc, it.o);
        var d = cl.map(function (l) { return "M" + l.map(function (q) { var s = proj(q); return $.fx(s[0]) + " " + $.fx(s[1]); }).join("L") + "Z"; }).join("");
        var seam = it.o.stroke ? ' stroke="' + it.o.stroke + '" stroke-width="' + $.fx(it.o.strokeWidth || 1.2) + '"' : ' stroke="' + fill + '" stroke-width="0.6" stroke-linejoin="round"';
        draw.push({ z: z, m: '<path d="' + d + '" fill="' + fill + '"' + seam + (it.op < 0.999 ? ' opacity="' + $.fx(it.op) + '"' : "") + "/>" });
      } else if (it.kind === "line") {
        var pts = it.pts.map(toCam);
        for (var i = 0; i < pts.length - 1; i++) {
          var a = pts[i], b = pts[i + 1];
          if (a[2] < nearZ || b[2] < nearZ) continue;
          var pa = proj(a), pb = proj(b), zz = (a[2] + b[2]) / 2;
          var wpx = (it.o.width || 3) * focal / zz;
          draw.push({ z: zz - 0.2, m: '<line x1="' + $.fx(pa[0]) + '" y1="' + $.fx(pa[1]) + '" x2="' + $.fx(pb[0]) + '" y2="' + $.fx(pb[1]) + '" stroke="' + (it.o.stroke || "#ffffff") + '" stroke-width="' + $.fx(wpx) + '" stroke-linecap="round"' + (it.op < 0.999 ? ' opacity="' + $.fx(it.op) + '"' : "") + "/>" });
        }
      } else if (it.kind === "sprite") {
        var q = toCam(it.p);
        if (q[2] < nearZ) return;
        var s2 = proj(q);
        draw.push({ z: it.o.onTop ? -1e9 : q[2] - 1, m: it.fn(s2[0], s2[1], focal / q[2]) || "" });
      }
    });
    draw.sort(function (a, b) { return b.z - a.z; });
    return draw.map(function (d) { return d.m; }).join("");
  };
  /** Clip a 3D polygon to the side of a plane (normal n through point p) the normal points to. */
  api.clip = function (poly, n, p) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var a = poly[i], b = poly[(i + 1) % poly.length], da = m3dot(m3sub(a, p), n), db = m3dot(m3sub(b, p), n);
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { var t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
    }
    return out;
  };
  api.camPos = camPos;
  return api;
}
`;

/** The 3D kit as prepended to a program: comments and indentation stripped. */
export const MOTION_3D_CODE = MOTION_3D.replace(/\/\*\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("//"))
  .join("\n");
