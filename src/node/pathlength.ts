/**
 * resvg ignores the `pathLength` attribute, so a dash pattern written against it (the runtime's ring
 * progress and `draw` lines, any program's draw-on stroke) comes out as a ring of 1 px dashes. Before
 * a frame is rasterised, each element that sets pathLength gets its dash array and offset scaled by
 * its real length over pathLength, and the attribute dropped — what a browser does.
 */

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

/** Length of SVG path data: lines exact, curves and arcs by flattening. */
export function pathDataLength(d: string): number {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0, len = 0;
  let cx = 0, cy = 0, qx = 0, qy = 0, prev = "";
  const num = () => Number(tokens[i++]);
  const seg = (nx: number, ny: number) => {
    len += Math.hypot(nx - x, ny - y);
    x = nx;
    y = ny;
  };
  const cubic = (x1: number, y1: number, x2: number, y2: number, ex: number, ey: number) => {
    let px = x, py = y;
    for (let k = 1; k <= 16; k++) {
      const t = k / 16, u = 1 - t;
      const nx = u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex;
      const ny = u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey;
      len += Math.hypot(nx - px, ny - py);
      px = nx;
      py = ny;
    }
    x = ex;
    y = ey;
  };
  const quad = (x1: number, y1: number, ex: number, ey: number) => cubic(x + (2 / 3) * (x1 - x), y + (2 / 3) * (y1 - y), ex + (2 / 3) * (x1 - ex), ey + (2 / 3) * (y1 - ey), ex, ey);
  const arc = (rx: number, ry: number, phi: number, large: number, sweep: number, ex: number, ey: number) => {
    // Endpoint to centre parameterisation (SVG implementation notes F.6.5), then a polyline.
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    if (!rx || !ry) return seg(ex, ey);
    const p = (phi * Math.PI) / 180, cp = Math.cos(p), sp = Math.sin(p);
    const dx = (x - ex) / 2, dy = (y - ey) / 2;
    const x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy;
    const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
    if (lam > 1) {
      rx *= Math.sqrt(lam);
      ry *= Math.sqrt(lam);
    }
    const sign = large === sweep ? -1 : 1;
    const co = sign * Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
    const cxp = (co * rx * y1) / ry, cyp = (-co * ry * x1) / rx;
    const ccx = cp * cxp - sp * cyp + (x + ex) / 2, ccy = sp * cxp + cp * cyp + (y + ey) / 2;
    const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
    let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
    if (!sweep && dt > 0) dt -= 2 * Math.PI;
    if (sweep && dt < 0) dt += 2 * Math.PI;
    let px = x, py = y;
    const n = Math.max(8, Math.ceil(Math.abs(dt) / (Math.PI / 32)));
    for (let k = 1; k <= n; k++) {
      const a = t1 + (dt * k) / n;
      const nx = ccx + rx * Math.cos(a) * cp - ry * Math.sin(a) * sp;
      const ny = ccy + rx * Math.cos(a) * sp + ry * Math.sin(a) * cp;
      len += Math.hypot(nx - px, ny - py);
      px = nx;
      py = ny;
    }
    x = ex;
    y = ey;
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i]!)) cmd = tokens[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M":
        x = num() + ox;
        y = num() + oy;
        sx = x;
        sy = y;
        cmd = rel ? "l" : "L";
        break;
      case "L":
        seg(num() + ox, num() + oy);
        break;
      case "H":
        seg(num() + ox, y);
        break;
      case "V":
        seg(x, num() + oy);
        break;
      case "C": {
        const a = num() + ox, b = num() + oy, c = num() + ox, e = num() + oy, f = num() + ox, g = num() + oy;
        cx = c;
        cy = e;
        cubic(a, b, c, e, f, g);
        break;
      }
      case "S": {
        const r1x = /[CS]/i.test(prev) ? 2 * x - cx : x, r1y = /[CS]/i.test(prev) ? 2 * y - cy : y;
        const c = num() + ox, e = num() + oy, f = num() + ox, g = num() + oy;
        cx = c;
        cy = e;
        cubic(r1x, r1y, c, e, f, g);
        break;
      }
      case "Q": {
        const a = num() + ox, b = num() + oy, f = num() + ox, g = num() + oy;
        qx = a;
        qy = b;
        quad(a, b, f, g);
        break;
      }
      case "T": {
        const a = /[QT]/i.test(prev) ? 2 * x - qx : x, b = /[QT]/i.test(prev) ? 2 * y - qy : y;
        qx = a;
        qy = b;
        quad(a, b, num() + ox, num() + oy);
        break;
      }
      case "A": {
        const rx = num(), ry = num(), phi = num(), large = num(), sweep = num();
        arc(rx, ry, phi, large ? 1 : 0, sweep ? 1 : 0, num() + ox, num() + oy);
        break;
      }
      case "Z":
        seg(sx, sy);
        break;
      default:
        i++;
    }
    prev = cmd;
  }
  return len;
}

const attr = (a: string, name: string): string | undefined => new RegExp(`\\s${name}="([^"]*)"`).exec(a)?.[1];

/** The real length of an element's outline, or null when its shape is not one that is measured here. */
function shapeLength(tag: string, a: string): number | null {
  const n = (k: string) => Number(attr(a, k) ?? 0);
  switch (tag) {
    case "circle":
      return 2 * Math.PI * n("r");
    case "ellipse": {
      const rx = n("rx"), ry = n("ry");
      return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    }
    case "line":
      return Math.hypot(n("x2") - n("x1"), n("y2") - n("y1"));
    case "rect": {
      const w = n("width"), h = n("height"), r = Math.min(Math.max(n("rx"), n("ry")), w / 2, h / 2);
      return 2 * (w + h) - 8 * r + 2 * Math.PI * r;
    }
    case "polyline":
    case "polygon": {
      const p = (attr(a, "points")?.match(NUM) ?? []).map(Number);
      let L = 0;
      for (let i = 2; i + 1 < p.length; i += 2) L += Math.hypot(p[i]! - p[i - 2]!, p[i + 1]! - p[i - 1]!);
      if (tag === "polygon" && p.length >= 4) L += Math.hypot(p[0]! - p[p.length - 2]!, p[1]! - p[p.length - 1]!);
      return L;
    }
    case "path":
      return pathDataLength(attr(a, "d") ?? "");
    default:
      return null;
  }
}

/** Every pathLength in a frame turned into real dash lengths. */
export function resolvePathLength(svg: string): string {
  if (!svg.includes("pathLength")) return svg;
  return svg.replace(/<(circle|ellipse|line|rect|polyline|polygon|path)\b([^>]*?)\s+pathLength="([^"]+)"([^>]*?)(\/?)>/g, (whole, tag: string, before: string, pl: string, after: string, close: string) => {
    const a = `${before} ${after}`;
    const declared = Number(pl);
    const real = shapeLength(tag, a);
    if (!(declared > 0) || real === null) return whole;
    const k = real / declared;
    let rest = `${before}${after}`;
    rest = rest.replace(/\sstroke-dasharray="([^"]*)"/, (_m, v: string) => ` stroke-dasharray="${v.replace(NUM, (x) => String(Number(x) * k))}"`);
    rest = rest.replace(/\sstroke-dashoffset="([^"]*)"/, (_m, v: string) => ` stroke-dashoffset="${Number(v) * k}"`);
    return `<${tag}${rest}${close}>`;
  });
}
