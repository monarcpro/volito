/** The slice of fontkit MONARC Motion uses (fontkit ships no types). */
declare module "fontkit" {
  export interface PathCommand {
    command: "moveTo" | "lineTo" | "quadraticCurveTo" | "bezierCurveTo" | "closePath";
    args: number[];
  }
  export interface GlyphRun {
    advanceWidth: number;
    glyphs: Array<{ path: { commands: PathCommand[] } }>;
    positions: Array<{ xAdvance: number; yAdvance: number; xOffset: number; yOffset: number }>;
  }
  export interface Font {
    unitsPerEm: number;
    familyName: string;
    hasGlyphForCodePoint(codePoint: number): boolean;
    layout(text: string, features?: string[] | Record<string, boolean>, script?: string, language?: string, direction?: "ltr" | "rtl"): GlyphRun;
  }
  export function create(buffer: Uint8Array): Font;
}
