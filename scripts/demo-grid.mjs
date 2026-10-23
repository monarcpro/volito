/**
 * A demo video: one item played nine ways at once — its own motion, then eight seeds — in a 3×3 grid.
 *   node scripts/demo-grid.mjs <item> [style=ember] → out/demo/<item>-grid.mp4
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { findItem, renderVideo } from "../dist/index.js";

const [id = "title-card", style = "ember"] = process.argv.slice(2);
const item = findItem(id);
const dir = join(import.meta.dirname, "../out/demo");
const takes = [undefined, 3, 4, 7, 11, 17, 21, 29, 42];
const files = [];
for (const seed of takes) {
  const r = await renderVideo(item, { style, width: 480, fps: 30, format: "mp4", background: "#1d232b", ...(seed !== undefined ? { seed } : {}), out: join(dir, `${item.id}-${seed ?? "default"}.mp4`) });
  files.push(r.file);
}
const out = join(dir, `${item.id}-grid.mp4`);
const inputs = files.flatMap((f) => ["-i", f]);
const layout = "0_0|w0_0|w0+w1_0|0_h0|w0_h0|w0+w1_h0|0_h0+h3|w0_h0+h3|w0+w1_h0+h3";
execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", `xstack=inputs=9:layout=${layout}:fill=black`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", out]);
console.log(out);
