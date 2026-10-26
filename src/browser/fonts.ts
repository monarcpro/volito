/**
 * Choosing font files for a frame, without fetching anything: which faces an SVG asks for, the
 * weight CSS matching would pick, and the script subsets its text needs. The browser player embeds
 * only these in each frame. Pure functions, tested in Node.
 */

export interface Face {
  family: string;
  weight: number;
  italic: boolean;
  subset: string;
  range: string;
  file: string;
}

export interface FontPayload {
  family: string;
  weight: number;
  italic: boolean;
  url: string;
  range: string;
}

/** A face a frame asks for: family, weight and slant, before matching to a file. */
export interface FontWant {
  family: string;
  weight: number;
  italic: boolean;
}

export function covers(range: string, cp: number): boolean {
  if (!range) return true;
  return range.split(",").some((part) => {
    const m = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(part.trim());
    if (!m) return false;
    const lo = Number.parseInt(m[1]!.replace(/\?/g, "0"), 16);
    const hi = m[2] ? Number.parseInt(m[2], 16) : Number.parseInt(m[1]!.replace(/\?/g, "F"), 16);
    return cp >= lo && cp <= hi;
  });
}

/** Code points past Latin-1 in a string, numeric character references included. */
export function wideCodepoints(s: string, into = new Set<number>()): Set<number> {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0x100) {
      const cp = s.codePointAt(i)!;
      into.add(cp);
      if (cp > 0xffff) i++;
    } else if (c === 38 && s.charCodeAt(i + 1) === 35) {
      const m = /^&#(x[0-9a-f]+|\d+);/i.exec(s.slice(i, i + 12));
      if (m) {
        const cp = m[1]![0] === "x" || m[1]![0] === "X" ? Number.parseInt(m[1]!.slice(1), 16) : Number.parseInt(m[1]!, 10);
        if (cp >= 0x100) into.add(cp);
      }
    }
  }
  return into;
}

/** The weight CSS font matching picks from what a family has (CSS Fonts 4, §5.2). */
export function matchWeight(available: number[], want: number): number {
  const ws = [...new Set(available)].sort((a, b) => a - b);
  if (!ws.length || ws.includes(want)) return want;
  const below = ws.filter((w) => w < want).reverse();
  const above = ws.filter((w) => w > want);
  if (want >= 400 && want <= 500) {
    const upTo500 = above.filter((w) => w <= 500);
    return upTo500[0] ?? below[0] ?? above[0]!;
  }
  return want < 400 ? (below[0] ?? above[0]!) : (above[0] ?? below[0]!);
}

const WEIGHT_WORDS: Record<string, number> = { normal: 400, bold: 700, bolder: 700, lighter: 300 };
const weightOf = (v: string): number | undefined => (/^\d{3}$/.test(v) ? Number(v) : WEIGHT_WORDS[v.toLowerCase()]);
const familiesOf = (v: string): string[] =>
  v
    .split(",")
    .map((f) => f.trim().replace(/^['"]|['"]$/g, "").trim())
    .filter(Boolean);

/**
 * The faces a frame's SVG asks for. Each tag's own font-family, font-weight and font-style (as
 * attributes, in style="", or in a font: shorthand) make one request; a tag that names only some of
 * them, or a <style> rule, may combine with any of the others (inheritance), so those widen the set.
 */
export function fontWants(svg: string): FontWant[] {
  if (!/font/i.test(svg)) return [];
  const exact: FontWant[] = [];
  const famLoose = new Set<string>();
  const weightLoose = new Set<number>();
  let italicLoose = false;
  let loose = false;
  const read = (decl: string) => {
    const fams: string[] = [];
    let weight: number | undefined;
    let italic: boolean | undefined;
    for (const m of decl.matchAll(/font-family\s*(?:=\s*"([^"]*)"|=\s*'([^']*)'|:\s*([^;"}]+))/gi)) fams.push(...familiesOf(m[1] ?? m[2] ?? m[3] ?? ""));
    for (const m of decl.matchAll(/font-weight\s*(?:=\s*["']?|:\s*)([a-z]+|\d{3})/gi)) weight = weightOf(m[1]!) ?? weight;
    for (const m of decl.matchAll(/font-style\s*(?:=\s*["']?|:\s*)([a-z]+)/gi)) italic = /^(italic|oblique)$/i.test(m[1]!);
    for (const m of decl.matchAll(/(?:^|[;"\s{])font\s*:\s*([^;"}]+)/gi)) {
      // font: [style] [weight] size[/line-height] family, family
      const tokens = m[1]!.trim();
      const size = /(?:^|\s)[\d.]+(?:px|em|rem|pt|%)(?:\/\S+)?\s+(.+)$/i.exec(tokens);
      if (size) fams.push(...familiesOf(size[1]!));
      const pre = size ? tokens.slice(0, tokens.length - size[0].length) : tokens;
      for (const t of pre.split(/\s+/)) {
        if (/^(italic|oblique)$/i.test(t)) italic = true;
        const w = weightOf(t);
        if (w) weight = w;
      }
    }
    return { fams, weight, italic };
  };
  // Tags that carry font settings.
  for (const m of svg.matchAll(/<(?!style\b)[a-z][^>]*font[^>]*>/gi)) {
    const { fams, weight, italic } = read(m[0]);
    if (!fams.length && weight === undefined && italic === undefined) continue;
    if (fams.length && weight !== undefined) for (const family of fams) exact.push({ family, weight, italic: !!italic });
    else {
      loose = true;
      fams.forEach((f) => famLoose.add(f));
      if (weight !== undefined) weightLoose.add(weight);
      if (italic) italicLoose = true;
    }
  }
  // <style> blocks: any rule may reach any element.
  for (const m of svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = m[1]!.replace(/@font-face\s*{[^}]*}/gi, "");
    for (const rule of css.matchAll(/{([^}]*)}/g)) {
      const { fams, weight, italic } = read(rule[1]!);
      if (!fams.length && weight === undefined && italic === undefined) continue;
      loose = true;
      fams.forEach((f) => famLoose.add(f));
      if (weight !== undefined) weightLoose.add(weight);
      if (italic) italicLoose = true;
    }
  }
  if (!loose) return exact;
  // Partial settings combine with everything else seen (a family on a <g>, a weight on its <text>).
  const fams = new Set([...famLoose, ...exact.map((w) => w.family)]);
  const weights = new Set([...weightLoose, ...exact.map((w) => w.weight)]);
  if (!weights.size) weights.add(400);
  const out = [...exact];
  for (const family of fams) for (const weight of weights) for (const italic of italicLoose ? [false, true] : [false]) out.push({ family, weight, italic });
  return out;
}

/**
 * The font files for some requests: each matched to a face the way CSS matching would (the
 * family, then the slant, then the nearest weight), in latin plus every subset covering `cps`.
 */
export function facesFor(all: Face[], wants: FontWant[], cps: Set<number>): Face[] {
  const out = new Map<string, Face>();
  for (const want of wants) {
    const fam = all.filter((f) => f.family.toLowerCase() === want.family.toLowerCase());
    if (!fam.length) continue;
    const slant = fam.filter((f) => f.italic === want.italic);
    const pool = slant.length ? slant : fam;
    const weight = matchWeight(
      pool.map((f) => f.weight),
      want.weight,
    );
    for (const f of pool) {
      if (f.weight !== weight) continue;
      if (f.subset === "latin" || [...cps].some((cp) => covers(f.range, cp))) out.set(f.file, f);
    }
  }
  return [...out.values()];
}
