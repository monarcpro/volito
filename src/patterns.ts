/**
 * Patterns Volito adds to the runtime: sixteen animated grounds (dots, halftone, dither,
 * Bauhaus tiles, mesh gradients, confetti…). Each is a pure function of t like everything else, so it
 * renders the same in Node and the browser and never needs a GPU.
 *
 * They reach programs two ways. A style whose texture names one gets it on every ground the runtime
 * draws ($.panel, $.texture), so all items pick it up; and any program can draw one itself with
 * `$.pattern(t, kind, o)`. The code is spliced into the engine runtime's scope (src/engine.ts) because
 * it draws with the runtime's own helpers; src/engine/ itself stays a verbatim copy of MONARC core.
 */

/** Pattern names, with the words a style brief uses for them. */
export const PATTERN_WORDS = {
  dots: "an even dot grid drifting slowly",
  plus: "a Swiss grid of small plus marks",
  graph: "graph paper: fine lines with a bolder grid every fifth",
  hatch: "fine diagonal hatching that slides",
  stripes: "bold diagonal stripes in the accent, sliding like a speed flag",
  checker: "a soft checkerboard drifting",
  halftone: "a halftone screen of accent dots swelling from one corner",
  dither: "an ordered pixel dither rising from the bottom in the accent",
  waves: "flowing parallel wave lines",
  rings: "concentric compass rings rippling out from a corner",
  mesh: "a mesh gradient: big soft blobs of the accents drifting",
  confetti: "Memphis confetti — squiggles, triangles, rings and dots floating at the edges",
  bauhaus: "big Bauhaus shapes — quarter circles, half discs, a diamond — parked at the corners",
  tiles: "a field of Bauhaus tiles that turn in a wave",
  pills: "floating outlined pills in the palette's colours",
  sunburst: "a slowly turning sunburst of rays",
} as const;

export type PatternName = keyof typeof PATTERN_WORDS;
export const PATTERN_NAMES = Object.keys(PATTERN_WORDS) as PatternName[];

/** Runtime code (ES5, the runtime's own idiom): defines `pattern` and `PATTERNS` in the runtime scope. */
export const PATTERN_CODE = String.raw`
    // ———— Volito patterns ————
    var PATTERNS = { dots: 1, plus: 1, graph: 1, hatch: 1, stripes: 1, checker: 1, halftone: 1, dither: 1, waves: 1, rings: 1, mesh: 1, confetti: 1, bauhaus: 1, tiles: 1, pills: 1, sunburst: 1 };
    var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    /**
     * An animated pattern over a box. kind: one of PATTERNS. o: box, color, color2, a (strength ×, 1),
     * scale (×, 1), speed (×, 1), angle (stripes/hatch), at ([x, y] for rings/halftone/sunburst), seed,
     * count (confetti/pills/sunburst), r (corner), texture (true when drawn as a style's ground: quieter).
     */
    var pattern = function (t2, kind, o) {
      o = o || {};
      if (!PATTERNS[kind]) return "";
      var b = o.box || region;
      var s = fill(o.scale, 1) * K, sp = fill(o.speed, 1), A = fill(o.a, 1), seed = fill(o.seed, 1);
      var tm = (t2 || 0) * sp;
      var fg = fill(o.color, c.fg), ac = fill(o.color, c.accent), ac2 = fill(o.color2, c.accent2);
      var pa = function (col, a) { return rgba(col, clamp(a * A)); };
      var tile = function (w, h, inner, dx, dy, rot) {
        var id = uid("mp");
        def('<pattern id="' + id + '" width="' + fx(w) + '" height="' + fx(h) + '" patternUnits="userSpaceOnUse" patternTransform="translate(' + fx(b.x + (dx || 0)) + " " + fx(b.y + (dy || 0)) + ")" + (rot ? " rotate(" + fx(rot) + ")" : "") + '">' + inner + "</pattern>");
        return rect(b.x, b.y, b.w, b.h, { fill: "url(#" + id + ")" });
      };
      var D = Math.max(b.w, b.h), m = Math.min(b.w, b.h), out = "";
      var pal = [ac, ac2, fg];
      if (kind === "dots") {
        var ds = 38 * s;
        out = tile(ds, ds, '<circle cx="' + fx(ds / 2) + '" cy="' + fx(ds / 2) + '" r="' + fx(4.2 * s) + '" fill="' + pa(fg, light ? 0.26 : 0.2) + '"/>', tm * 14 * s, tm * 8 * s);
      } else if (kind === "plus") {
        var sp2 = 72 * s, a2 = 8 * s, h2 = sp2 / 2;
        out = tile(sp2, sp2, '<path d="M' + fx(h2 - a2) + " " + fx(h2) + "H" + fx(h2 + a2) + "M" + fx(h2) + " " + fx(h2 - a2) + "V" + fx(h2 + a2) + '" stroke="' + pa(fg, 0.32) + '" stroke-width="' + fx(3 * s) + '" stroke-linecap="round" fill="none"/>', tm * 6 * s, 0);
      } else if (kind === "graph") {
        var g1 = 36 * s, g5 = g1 * 5;
        out = tile(g1, g1, '<path d="M0 0H' + fx(g1) + "M0 0V" + fx(g1) + '" stroke="' + pa(fg, light ? 0.09 : 0.07) + '" stroke-width="' + fx(1.4 * s) + '" fill="none"/>', 0, tm * 4 * s) +
          tile(g5, g5, '<path d="M0 0H' + fx(g5) + "M0 0V" + fx(g5) + '" stroke="' + pa(fg, light ? 0.2 : 0.16) + '" stroke-width="' + fx(2.2 * s) + '" fill="none"/>', 0, tm * 4 * s);
      } else if (kind === "hatch") {
        var hs = 22 * s;
        out = tile(hs, hs, '<path d="M' + fx(hs / 2) + " 0V" + fx(hs) + '" stroke="' + pa(fg, light ? 0.13 : 0.11) + '" stroke-width="' + fx(2.4 * s) + '"/>', tm * 18 * s, 0, fill(o.angle, 45));
      } else if (kind === "stripes") {
        var sw = 70 * s;
        out = tile(sw * 2, sw * 2, '<rect width="' + fx(sw) + '" height="' + fx(sw * 2) + '" fill="' + pa(ac, o.texture ? 0.14 : light ? 0.2 : 0.18) + '"/>', tm * 60 * s, 0, fill(o.angle, -30));
      } else if (kind === "checker") {
        var cs = 64 * s;
        out = tile(cs * 2, cs * 2, '<rect width="' + fx(cs) + '" height="' + fx(cs) + '" fill="' + pa(fg, light ? 0.07 : 0.06) + '"/><rect x="' + fx(cs) + '" y="' + fx(cs) + '" width="' + fx(cs) + '" height="' + fx(cs) + '" fill="' + pa(fg, light ? 0.07 : 0.06) + '"/>', tm * 10 * s, tm * 10 * s);
      } else if (kind === "halftone") {
        // Dots that swell toward a corner, a slow wave running through them.
        var hp = o.at || [b.x + b.w * 0.96, b.y + b.h * 1.02], step = 30 * s, reach = Math.hypot(b.w, b.h) * 0.62;
        for (var hy = b.y + step / 2; hy < b.y + b.h; hy += step) {
          for (var hx = b.x + step / 2; hx < b.x + b.w; hx += step) {
            var dd = Math.hypot(hx - hp[0], hy - hp[1]) / reach;
            if (dd >= 1) continue;
            var f = Math.pow(1 - dd, 1.25) + 0.12 * Math.sin(dd * 14 - tm * 2.4) * (1 - dd);
            var hr = step * 0.5 * clamp(f);
            if (hr > 0.6 * s) out += '<circle cx="' + fx(hx) + '" cy="' + fx(hy) + '" r="' + fx(hr) + '"/>';
          }
        }
        out = '<g fill="' + pa(ac, light ? 0.55 : 0.5) + '">' + out + "</g>";
      } else if (kind === "dither") {
        // An ordered (Bayer) dither of a ramp rising from the bottom edge; the ramp breathes.
        var px = 8 * s, cell = px * 4, bands = 15, zone = b.h * (o.texture ? 0.3 : 0.5), da = o.texture ? 0.38 : light ? 0.6 : 0.55, top = b.y + b.h - zone + Math.sin(tm * 0.9) * zone * 0.08, bh = zone / bands;
        for (var L = 1; L <= bands; L++) {
          var cells = "";
          for (var q = 0; q < 16; q++) if (BAYER[q] < L) cells += '<rect x="' + fx((q % 4) * px) + '" y="' + fx(Math.floor(q / 4) * px) + '" width="' + fx(px) + '" height="' + fx(px) + '"/>';
          var pid = uid("md");
          def('<pattern id="' + pid + '" width="' + fx(cell) + '" height="' + fx(cell) + '" patternUnits="userSpaceOnUse" patternTransform="translate(' + fx(b.x) + " " + fx(b.y + b.h) + ')"><g fill="' + pa(ac, da) + '">' + cells + "</g></pattern>");
          out += rect(b.x, top + (L - 1) * bh, b.w, bh + 0.5, { fill: "url(#" + pid + ")" });
        }
        out += rect(b.x, top + zone, b.w, Math.max(0, b.y + b.h - top - zone), { fill: pa(ac, da) });
      } else if (kind === "waves") {
        var n = 12, gap = b.h / n, amp = 22 * s, wl = 560 * s;
        for (var i = -1; i <= n; i++) {
          var d = "", y0 = b.y + (i + 0.5) * gap;
          for (var k = 0; k <= 48; k++) {
            var wx = b.x - 20 * s + ((b.w + 40 * s) * k) / 48;
            var wy = y0 + amp * Math.sin((wx / wl) * 6.283 + tm * 0.9 + i * 0.42);
            d += (k ? "L" : "M") + fx(wx) + " " + fx(wy);
          }
          out += '<path d="' + d + '" fill="none" stroke="' + pa(i % 3 === 0 ? ac : fg, i % 3 === 0 ? 0.38 : light ? 0.16 : 0.13) + '" stroke-width="' + fx((i % 3 === 0 ? 4 : 2.4) * s) + '"/>';
        }
      } else if (kind === "rings") {
        var rp = o.at || [b.x + b.w * 0.9, b.y + b.h * 0.86], rg = 48 * s, far = Math.hypot(b.w, b.h), ph = (tm * 0.35) % 1;
        for (var ri = 0; ri * rg < far; ri++) {
          var rr = (ri + ph) * rg, fade = 1 - rr / far;
          if (rr > 1) out += circle(rp[0], rp[1], rr, { stroke: pa(ri % 4 === 0 ? ac : fg, (ri % 4 === 0 ? 0.42 : light ? 0.16 : 0.13) * fade), sw: (ri % 4 === 0 ? 3.4 : 2) * s });
        }
      } else if (kind === "mesh") {
        var blobs = [[ac, 0.2, 0.25, 0.62], [ac2, 0.85, 0.3, 0.55], [fill(o.color3, c.accent), 0.7, 0.95, 0.6], [fg, 0.1, 0.95, 0.4]];
        for (var mi = 0; mi < blobs.length; mi++) {
          var bl = blobs[mi], R = D * bl[3];
          var mx = b.x + b.w * (bl[1] + 0.1 * Math.sin(tm * 0.31 + mi * 1.7 + seed));
          var my = b.y + b.h * (bl[2] + 0.1 * Math.cos(tm * 0.27 + mi * 2.3 + seed));
          var ma = (mi === 3 ? 0.12 : light ? 0.42 : 0.5) * A;
          out += circle(mx, my, R, { fill: gradient([[0, bl[0], clamp(ma)], [0.55, bl[0], clamp(ma * 0.35)], [1, bl[0], 0]], { radial: true }) });
        }
      } else if (kind === "confetti") {
        // Memphis bits kept to the edges so the middle stays clear for type.
        var nC = fill(o.count, 26);
        for (var ci = 0; ci < nC; ci++) {
          var h1 = hash(seed * 7.1 + ci * 3.3), h2 = hash(seed * 3.7 + ci * 5.9), h3 = hash(ci * 9.1 + seed);
          var edge = ci % 4, u = 0.04 + 0.92 * h1, v = 0.03 + 0.17 * h2;
          var cx2 = edge === 0 ? u : edge === 1 ? u : edge === 2 ? v : 1 - v, cy2 = edge === 0 ? v : edge === 1 ? 1 - v : u;
          var X = b.x + b.w * cx2, Y = b.y + b.h * cy2 + Math.sin(tm * 1.1 + ci) * 10 * s, sz = (30 + 30 * h3) * s, rot = (h3 - 0.5) * 80 + tm * (h2 - 0.5) * 50;
          var col = pal[ci % 3], a3 = (ci % 3 === 2 ? 0.45 : 0.9) * A, shape = ci % 6, mk;
          if (shape === 0) mk = '<circle r="' + fx(sz * 0.42) + '" fill="none" stroke="' + col + '" stroke-width="' + fx(5 * s) + '"/>';
          else if (shape === 1) mk = '<path d="M0 ' + fx(-sz * 0.5) + "L" + fx(sz * 0.48) + " " + fx(sz * 0.38) + "L" + fx(-sz * 0.48) + " " + fx(sz * 0.38) + 'Z" fill="' + col + '"/>';
          else if (shape === 2) mk = '<path d="M' + fx(-sz) + ' 0l' + fx(sz / 3) + " " + fx(-sz / 3) + "l" + fx(sz / 3) + " " + fx(sz / 1.5) + "l" + fx(sz / 3) + " " + fx(-sz / 1.5) + "l" + fx(sz / 3) + " " + fx(sz / 1.5) + "l" + fx(sz / 3) + " " + fx(-sz / 3) + '" fill="none" stroke="' + col + '" stroke-width="' + fx(5 * s) + '" stroke-linecap="round" stroke-linejoin="round"/>';
          else if (shape === 3) mk = '<path d="M' + fx(-sz * 0.4) + " 0H" + fx(sz * 0.4) + "M0 " + fx(-sz * 0.4) + "V" + fx(sz * 0.4) + '" stroke="' + col + '" stroke-width="' + fx(6 * s) + '" stroke-linecap="round"/>';
          else if (shape === 4) mk = '<circle r="' + fx(sz * 0.22) + '" fill="' + col + '"/>';
          else mk = '<path d="M' + fx(-sz * 0.5) + " 0A" + fx(sz * 0.5) + " " + fx(sz * 0.5) + " 0 0 1 " + fx(sz * 0.5) + ' 0Z" fill="' + col + '"/>';
          out += '<g transform="translate(' + fx(X) + " " + fx(Y) + ") rotate(" + fx(rot) + ')" opacity="' + fx3(clamp(a3)) + '">' + mk + "</g>";
        }
      } else if (kind === "bauhaus") {
        // Four big shapes parked on the corners, each turning or breathing a little.
        var R0 = m * 0.24 * fill(o.scale, 1), br = Math.sin(tm * 0.8) * 0.04, a4 = clamp(0.92 * A);
        var qc = function (x, y, r, rot, col) { return '<g transform="translate(' + fx(x) + " " + fx(y) + ") rotate(" + fx(rot) + ')"><path d="M0 0H' + fx(r) + "A" + fx(r) + " " + fx(r) + " 0 0 1 0 " + fx(r) + 'Z" fill="' + col + '" opacity="' + fx3(a4) + '"/></g>'; };
        out += qc(b.x, b.y, R0 * (1 + br), 0, ac);
        out += '<g transform="translate(' + fx(b.x + b.w) + " " + fx(b.y + b.h * 0.62) + ") rotate(" + fx(90 + tm * 12) + ')"><path d="M' + fx(-R0 * 0.62) + " 0A" + fx(R0 * 0.62) + " " + fx(R0 * 0.62) + " 0 0 1 " + fx(R0 * 0.62) + ' 0Z" fill="' + ac2 + '" opacity="' + fx3(a4) + '"/></g>';
        out += circle(b.x + b.w - R0 * 0.55, b.y + R0 * 0.5, R0 * 0.26 * (1 - br), { fill: "none", stroke: fg, sw: 5 * s, op: clamp(0.5 * A) });
        var dx2 = b.x + R0 * 0.62, dy2 = b.y + b.h - R0 * 0.55, dr = R0 * 0.3;
        out += '<path d="M' + fx(dx2) + " " + fx(dy2 - dr) + "L" + fx(dx2 + dr) + " " + fx(dy2) + "L" + fx(dx2) + " " + fx(dy2 + dr) + "L" + fx(dx2 - dr) + " " + fx(dy2) + 'Z" fill="' + fg + '" opacity="' + fx3(clamp(0.55 * A)) + '" transform="rotate(' + fx(tm * 20) + " " + fx(dx2) + " " + fx(dy2) + ')"/>';
        out += qc(b.x + b.w, b.y + b.h, R0 * 0.8 * (1 - br), 180, ac);
      } else if (kind === "tiles") {
        // Every tile a quarter circle, half disc, disc or diamond in two colours, turning in a diagonal wave.
        var ts = 132 * s, cols = Math.ceil(b.w / ts), rows = Math.ceil(b.h / ts), ta = clamp(fill(o.a, o.texture ? 0.06 : 1));
        for (var ty = 0; ty < rows; ty++) {
          for (var tx = 0; tx < cols; tx++) {
            var hh = hash(tx * 13.1 + ty * 7.7 + seed), kind2 = Math.floor(hh * 4), colA = pal[(tx + ty) % 2], colB = pal[(tx + ty + 1) % 2];
            var turn = Math.floor(hh * 4) * 90 + 90 * E.inOut3(clamp(((tm * 0.5 + (tx + ty) * 0.08) % 2) - 1));
            var X0 = b.x + tx * ts + ts / 2, Y0 = b.y + ty * ts + ts / 2, hr2 = ts / 2, sh;
            if (kind2 === 0) sh = '<path d="M' + fx(-hr2) + " " + fx(-hr2) + "H" + fx(hr2) + "A" + fx(ts) + " " + fx(ts) + " 0 0 1 " + fx(-hr2) + " " + fx(hr2) + 'Z" fill="' + colA + '"/>';
            else if (kind2 === 1) sh = '<path d="M' + fx(-hr2) + " 0A" + fx(hr2) + " " + fx(hr2) + " 0 0 1 " + fx(hr2) + ' 0Z" fill="' + colA + '"/><path d="M' + fx(-hr2) + " 0A" + fx(hr2) + " " + fx(hr2) + " 0 0 0 " + fx(hr2) + ' 0Z" fill="' + colB + '"/>';
            else if (kind2 === 2) sh = '<circle r="' + fx(hr2 * 0.86) + '" fill="' + colA + '"/>';
            else sh = '<path d="M0 ' + fx(-hr2) + "L" + fx(hr2) + " 0L0 " + fx(hr2) + "L" + fx(-hr2) + ' 0Z" fill="' + colB + '"/>';
            out += '<g transform="translate(' + fx(X0) + " " + fx(Y0) + ") rotate(" + fx(turn) + ')">' + sh + "</g>";
          }
        }
        out = '<g opacity="' + fx3(ta) + '">' + out + "</g>";
      } else if (kind === "pills") {
        // Pills hung on the frame's edge, half off it, so the middle stays clear for type.
        var nP = fill(o.count, 10);
        for (var pi = 0; pi < nP; pi++) {
          var p1 = hash(seed * 5.3 + pi * 2.9), p2 = hash(seed * 1.9 + pi * 6.1), side = pi % 4, u2 = (Math.floor(pi / 4) + 0.3 + 0.4 * p1) / Math.ceil(nP / 4);
          var PX = side === 0 ? b.x + b.w * u2 : side === 1 ? b.x + b.w * (1 - u2) : side === 2 ? b.x + 30 * s : b.x + b.w - 30 * s;
          var PY = side === 0 ? b.y + 22 * s : side === 1 ? b.y + b.h - 22 * s : side === 2 ? b.y + b.h * (1 - u2) : b.y + b.h * u2;
          PY += Math.sin(tm * 0.9 + pi * 1.3) * 10 * s;
          var pw = (130 + 110 * p2) * s, ph2 = 52 * s, prot = (side < 2 ? 0 : 90) + (p1 - 0.5) * 40 + Math.sin(tm * 0.5 + pi) * 4;
          out += '<g transform="translate(' + fx(PX) + " " + fx(PY) + ") rotate(" + fx(prot) + ')" opacity="' + fx3(clamp(0.95 * A)) + '"><rect x="' + fx(-pw / 2 + 5 * s) + '" y="' + fx(-ph2 / 2 + 6 * s) + '" width="' + fx(pw) + '" height="' + fx(ph2) + '" rx="' + fx(ph2 / 2) + '" fill="' + rgba(c.ink, 0.9) + '"/><rect x="' + fx(-pw / 2) + '" y="' + fx(-ph2 / 2) + '" width="' + fx(pw) + '" height="' + fx(ph2) + '" rx="' + fx(ph2 / 2) + '" fill="' + pal[pi % 3] + '" stroke="' + c.ink + '" stroke-width="' + fx(3.5 * s) + '"/></g>';
        }
      } else if (kind === "sunburst") {
        var sx = (o.at || [b.x + b.w / 2, b.y + b.h / 2])[0], sy = (o.at || [b.x + b.w / 2, b.y + b.h / 2])[1], nR = fill(o.count, 24), RR = D * 1.2, rot0 = tm * 5;
        for (var si = 0; si < nR; si += 2) {
          var a0 = ((si * 360) / nR + rot0) * Math.PI / 180, a1 = (((si + 1) * 360) / nR + rot0) * Math.PI / 180;
          out += '<path d="M' + fx(sx) + " " + fx(sy) + "L" + fx(sx + RR * Math.cos(a0)) + " " + fx(sy + RR * Math.sin(a0)) + "L" + fx(sx + RR * Math.cos(a1)) + " " + fx(sy + RR * Math.sin(a1)) + 'Z"/>';
        }
        out = '<g fill="' + pa(fg, light ? 0.07 : 0.06) + '">' + out + "</g>";
      }
      return clip(b.x, b.y, b.w, b.h, fill(o.r, 0), out);
    };
`;

/**
 * Splice the patterns into the runtime: the code goes before the art textures, the style's texture
 * draws a pattern when it names one, and `$.pattern` joins the API.
 */
export function withPatterns(runtime: string): string {
  const steps: [RegExp, (m: string) => string][] = [
    [/\n    \/\/ ———— the art textures ————/, (m) => PATTERN_CODE.replace(/\n$/, "") + m],
    [/var artTexture = function \(t2, tex, b\) \{/, (m) => `${m} if (PATTERNS[tex]) return pattern(t2, tex, { box: b, texture: true });`],
    [/texture: texture,/, (m) => `${m} pattern: pattern,`],
  ];
  let out = runtime;
  for (const [re, put] of steps) {
    if (!re.test(out)) throw new Error(`Volito: the engine runtime changed shape (${re.source}) — update src/patterns.ts`);
    out = out.replace(re, put);
  }
  return out;
}
