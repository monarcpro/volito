/**
 * libs/world.js: the countries of the world for maps and globes, from Natural Earth 1:110m (public
 * domain, via the world-atlas package). Outlines are simplified, rounded to 0.1° and packed as
 * polylines; the library decodes them once and projects them (Equal Earth for flat maps, onto a
 * sphere for the 3D globe). Run when the data or the library code changes; the output is committed.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const topo = JSON.parse(readFileSync(join(root, "node_modules/world-atlas/countries-110m.json"), "utf8"));
const fc = feature(topo, topo.objects.countries);

/** Douglas–Peucker on [lon, lat] points (degrees). */
function simplify(pts, tol) {
  if (pts.length < 5) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, dmax = 0;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) {
      // A closed ring starts and ends on the same point: there the distance is to that point.
      const d = len < 1e-9 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len;
      if (d > dmax) (dmax = d), (best = i);
    }
    if (dmax > tol && best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Google polyline encoding of integer pairs (0.1° steps). */
function encode(points) {
  let out = "", px = 0, py = 0;
  const enc = (v) => {
    v = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (v >= 0x20) {
      s += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    return s + String.fromCharCode(v + 63);
  };
  for (const [x, y] of points) {
    out += enc(x - px) + enc(y - py);
    px = x;
    py = y;
  }
  return out;
}

const ringArea = (r) => {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const p = r[i], q = r[(i + 1) % r.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};

const countries = [];
let points = 0;
for (const f of fc.features) {
  if (!f.geometry) continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  const rings = [];
  let biggest = null, bigArea = 0;
  for (const poly of polys) {
    for (const ring of poly) {
      // Keep each ring continuous across the 180° meridian (the map clips what falls outside).
      const un = [];
      for (const [lon, lat] of ring) {
        let x = lon;
        if (un.length) {
          const prev = un[un.length - 1][0];
          while (x - prev > 180) x -= 360;
          while (prev - x > 180) x += 360;
        }
        un.push([x, lat]);
      }
      const s = simplify(un, 0.12).map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
      const dedup = s.filter((p, i) => i === 0 || p[0] !== s[i - 1][0] || p[1] !== s[i - 1][1]);
      if (dedup.length < 4) continue;
      rings.push(encode(dedup));
      points += dedup.length;
      const a = Math.abs(ringArea(un));
      if (a > bigArea) (bigArea = a), (biggest = un);
    }
  }
  if (!rings.length) continue;
  // A label point: the area-weighted centroid of the largest ring.
  let cx = 0, cy = 0, A = 0;
  for (let i = 0; i < biggest.length; i++) {
    const p = biggest[i], q = biggest[(i + 1) % biggest.length];
    const c = p[0] * q[1] - q[0] * p[1];
    A += c;
    cx += (p[0] + q[0]) * c;
    cy += (p[1] + q[1]) * c;
  }
  cx /= 3 * A;
  cy /= 3 * A;
  countries.push([f.properties.name, Number(f.id) || 0, Math.round(cx * 10) / 10, Math.round(cy * 10) / 10, rings.join(" ")]);
}
countries.sort((a, b) => a[0].localeCompare(b[0]));

// Short and common names people type, to the Natural Earth name.
const aliases = {
  us: "United States of America", usa: "United States of America", "united states": "United States of America", america: "United States of America",
  uk: "United Kingdom", "great britain": "United Kingdom", britain: "United Kingdom", england: "United Kingdom",
  uae: "United Arab Emirates", "south korea": "South Korea", korea: "South Korea", "north korea": "North Korea",
  drc: "Dem. Rep. Congo", "dr congo": "Dem. Rep. Congo", "democratic republic of the congo": "Dem. Rep. Congo", "republic of the congo": "Congo",
  "czech republic": "Czechia", "dominican republic": "Dominican Rep.", "ivory coast": "Côte d'Ivoire", "cote d'ivoire": "Côte d'Ivoire",
  eswatini: "eSwatini", swaziland: "eSwatini", "east timor": "Timor-Leste", "north macedonia": "Macedonia", bosnia: "Bosnia and Herz.",
  "bosnia and herzegovina": "Bosnia and Herz.", "western sahara": "W. Sahara", "central african republic": "Central African Rep.",
  "south sudan": "S. Sudan", "equatorial guinea": "Eq. Guinea", "solomon islands": "Solomon Is.", "falkland islands": "Falkland Is.",
  holland: "Netherlands", burma: "Myanmar", persia: "Iran", "viet nam": "Vietnam", "lao pdr": "Laos",
};

const lib = String.raw`// ———————— MONARC Motion world ————————
var MM_WORLD = ${JSON.stringify(countries)};
var MM_WORLD_ALIASES = ${JSON.stringify(aliases)};
var MM_WORLD_CACHE = null;
function mmWorldDecode(s) {
  var pts = [], i = 0, x = 0, y = 0;
  while (i < s.length) {
    var v = 0, sh = 0, b;
    do { b = s.charCodeAt(i++) - 63; v |= (b & 31) << sh; sh += 5; } while (b >= 32);
    x += v & 1 ? ~(v >> 1) : v >> 1;
    v = 0; sh = 0;
    do { b = s.charCodeAt(i++) - 63; v |= (b & 31) << sh; sh += 5; } while (b >= 32);
    y += v & 1 ? ~(v >> 1) : v >> 1;
    pts.push([x / 10, y / 10]);
  }
  return pts;
}
/** Every country: {name, id (ISO 3166 numeric), c: [lon, lat] label point, rings: [[[lon, lat], …], …]}. */
function worldShapes() {
  if (!MM_WORLD_CACHE) MM_WORLD_CACHE = MM_WORLD.map(function (r) { return { name: r[0], id: r[1], c: [r[2], r[3]], rings: r[4].split(" ").map(mmWorldDecode) }; });
  return MM_WORLD_CACHE;
}
/** A country by name ("India"), a common short name ("UK", "USA") or ISO numeric id (356). */
function worldFind(q) {
  var all = worldShapes(), s = String(q == null ? "" : q).trim().toLowerCase();
  if (!s) return null;
  var target = MM_WORLD_ALIASES[s] ? MM_WORLD_ALIASES[s].toLowerCase() : s;
  for (var i = 0; i < all.length; i++) if (all[i].name.toLowerCase() === target || String(all[i].id) === s) return all[i];
  for (var j = 0; j < all.length; j++) if (all[j].name.toLowerCase().indexOf(target) === 0) return all[j];
  return null;
}
/** Equal Earth: [lon, lat] degrees → unit coordinates (x ±2.71, y ±1.32, y up). */
function mmEqualEarth(lon, lat) {
  var A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, l = lon * Math.PI / 180, p = lat * Math.PI / 180;
  var th = Math.asin(Math.sqrt(3) / 2 * Math.sin(p)), t2 = th * th, t6 = t2 * t2 * t2;
  return [2 * Math.sqrt(3) * l * Math.cos(th) / (3 * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1)), A4 * t6 * t2 * th + A3 * t6 * th + A2 * t2 * th + A1 * th];
}
/**
 * A flat world map fitted into a box: o = {x, y, w, h, center: [lon, lat], zoom (1 = whole world),
 * antarctica (false)}. Returns project(lon, lat) → [x, y], path(country or name) → SVG path data,
 * outline (the map's edge as path data, to clip or fill the sea), clipId(), and the countries.
 */
function worldMap($, o) {
  o = o || {};
  var bx = o.x || 0, by = o.y || 0, bw = o.w || $.W, bh = o.h || $.H;
  var center = o.center || [0, 0], zoom = o.zoom || 1;
  var fit = Math.min(bw / (2 * 2.7066), bh / (2 * 1.3173)) * zoom;
  var cy0 = mmEqualEarth(0, center[1])[1];
  function rotLon(lon) { var l = lon - center[0]; while (l > 180) l -= 360; while (l < -180) l += 360; return l; }
  function P(lon, lat) { var u = mmEqualEarth(lon, lat); return [bx + bw / 2 + u[0] * fit, by + bh / 2 - (u[1] - cy0) * fit]; }
  var api = { countries: worldShapes().filter(function (c) { return o.antarctica || c.name !== "Antarctica"; }) };
  api.project = function (lon, lat) { return P(rotLon(lon), lat); };
  api.ring = function (ring) {
    var out = [], prev = null;
    for (var i = 0; i < ring.length; i++) {
      var l = rotLon(ring[i][0]);
      if (prev !== null) { while (l - prev > 180) l -= 360; while (prev - l > 180) l += 360; }
      prev = l;
      out.push(P(l, ring[i][1]));
    }
    return out;
  };
  api.path = function (c) {
    if (typeof c === "string" || typeof c === "number") c = worldFind(c);
    if (!c) return "";
    return c.rings.map(function (r) { return "M" + api.ring(r).map(function (p) { return $.fx(p[0]) + " " + $.fx(p[1]); }).join("L") + "Z"; }).join("");
  };
  var edge = [];
  for (var lat = -90; lat <= 90; lat += 3) edge.push(P(180, lat));
  for (var lat2 = 90; lat2 >= -90; lat2 -= 3) edge.push(P(-180, lat2));
  api.outline = "M" + edge.map(function (p) { return $.fx(p[0]) + " " + $.fx(p[1]); }).join("L") + "Z";
  var clip = null;
  api.clipId = function () { if (!clip) { clip = $.uid("mmw"); $.def('<clipPath id="' + clip + '"><path d="' + api.outline + '"/></clipPath>'); } return clip; };
  return api;
}
/** [lon, lat] on a sphere of radius r turned by spin (deg) and tilted by tilt: a 3D point for scene3d. */
function worldOnSphere(lon, lat, r, spin, tilt) {
  var l = (lon + (spin || 0)) * Math.PI / 180, p = lat * Math.PI / 180;
  var x = r * Math.cos(p) * Math.sin(l), y = -r * Math.sin(p), z = -r * Math.cos(p) * Math.cos(l);
  var t = (tilt || 0) * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
  return [x, y * c - z * s, y * s + z * c];
}
/**
 * Countries on a globe in a scene3d: o = {r, center [x, y, z], spin, tilt, color, colorOf(country) → colour,
 * lift (how far above the sea, 0.004)}. Faces beyond the horizon are clipped away.
 */
function worldGlobe(S, o) {
  o = o || {};
  var r = o.r || 300, C = o.center || [0, 0, 0], lift = 1 + (o.lift != null ? o.lift : 0.004);
  var view = [S.camPos[0] - C[0], S.camPos[1] - C[1], S.camPos[2] - C[2]];
  var vl = Math.sqrt(view[0] * view[0] + view[1] * view[1] + view[2] * view[2]) || 1;
  var vn = [view[0] / vl, view[1] / vl, view[2] / vl];
  // The visible cap ends where the line from the camera grazes the sphere, a little short of the centre plane.
  var cut = (r * r) / vl;
  var plane = [C[0] + vn[0] * cut, C[1] + vn[1] * cut, C[2] + vn[2] * cut];
  var faces = [];
  worldShapes().forEach(function (c) {
    if (c.name === "Antarctica" && !o.antarctica) return;
    var col = o.colorOf ? o.colorOf(c) : o.color || "#3a4150";
    if (!col) return;
    c.rings.forEach(function (ring) {
      var pts = ring.map(function (p) { var q = worldOnSphere(p[0], p[1], r * lift, o.spin, o.tilt); return [q[0] + C[0], q[1] + C[1], q[2] + C[2]]; });
      var vis = S.clip(pts, vn, plane);
      if (vis.length < 3) return;
      var m = [0, 0, 0];
      vis.forEach(function (q) { m[0] += q[0] - C[0]; m[1] += q[1] - C[1]; m[2] += q[2] - C[2]; });
      var ml = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]) || 1;
      faces.push({ loops: [vis], n: [m[0] / ml, m[1] / ml, m[2] / ml], color: col, role: "surface" });
    });
  });
  S.add({ faces: faces }, { twoSided: true, spec: 0.12 });
  return S;
}
`;
mkdirSync(join(root, "libs"), { recursive: true });
writeFileSync(join(root, "libs/world.js"), lib);
console.log(`libs/world.js: ${countries.length} countries, ${points} points, ${(lib.length / 1024).toFixed(1)} KB`);
