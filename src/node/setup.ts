/**
 * Node's side of the libraries: glyph tables come from the bundled font files, and libraries that
 * ship as files (libs/world.js) are read when a program first asks for them.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TrueTypeFace, glyphTable, setGlyphSource } from "../glyphs.js";
import { LIBRARY_NAMES, registerLibrary } from "../pack.js";
import { fontsDir, libsDir } from "./paths.js";

setGlyphSource((key, file) => {
  const path = join(fontsDir(), file);
  return existsSync(path) ? glyphTable(new TrueTypeFace(new Uint8Array(readFileSync(path))), key) : undefined;
});

for (const name of LIBRARY_NAMES) {
  const file = join(libsDir(), `${name}.js`);
  if (existsSync(file)) registerLibrary(name, () => readFileSync(file, "utf8"));
}
